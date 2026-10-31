//! wakacraft for Zed.
//!
//! Zed extensions can't watch editor events directly, so tracking runs through a language server that Zed attaches
//! to every buffer: WakaTime's `wakatime-ls`, which turns open/change/save notifications into `wakatime-cli`
//! heartbeats. This extension downloads both binaries and starts the server with wakacraft's own cli home
//! (`WAKATIME_HOME=~/.wakacraft`, shared with the VS Code extension) and the wakacraft API URL, so the official
//! WakaTime setup in `~/.wakatime` is never read or written.
//!
//! The download and launch code is adapted from the MIT-licensed wakatime/zed-wakatime extension
//! (Copyright (c) 2024 Marshall Bowers); see `THIRD_PARTY_NOTICES.md`.

use std::{
    fs,
    path::{Path, PathBuf},
};

use zed_extension_api::{
    self as zed, serde_json, settings::LspSettings, Command, LanguageServerId, Result, Worktree,
};

const SERVER_ID: &str = "wakacraft";
const DEFAULT_API_URL: &str = "https://wakacraft.tech/api/v1";
/// Pinned: the extension depends on this release's command line (see `language_server_command`).
const WAKATIME_LS_TAG: &str = "v0.1.10";

struct WakacraftExtension {
    cached_ls_binary_path: Option<PathBuf>,
    cached_cli_binary_path: Option<PathBuf>,
}

fn is_windows() -> bool {
    matches!(zed::current_platform().0, zed::Os::Windows)
}

// The extension runs in WASM, so std's path rules are the sandbox's, not the host's.
fn is_absolute_host_path(path: &str) -> bool {
    if is_windows() {
        let bytes = path.as_bytes();
        (bytes.len() >= 3
            && bytes[0].is_ascii_alphabetic()
            && bytes[1] == b':'
            && (bytes[2] == b'\\' || bytes[2] == b'/'))
            || path.starts_with(r"\\")
    } else {
        path.starts_with('/')
    }
}

/// WASI paths on Windows come back as `/C:/…`.
fn host_path(path: &str) -> String {
    if is_windows() {
        path.trim_start_matches('/').to_string()
    } else {
        path.to_string()
    }
}

fn executable_name(binary: &str) -> String {
    if is_windows() {
        format!("{binary}.exe")
    } else {
        binary.to_string()
    }
}

/// `~/.wakacraft`, from the user's shell environment (the sandbox has no home directory of its own).
/// `WAKACRAFT_HOME` overrides it, as in the VS Code extension.
fn wakacraft_home(env: &[(String, String)]) -> Option<String> {
    let get = |key: &str| {
        env.iter()
            .find(|(name, value)| name.eq_ignore_ascii_case(key) && !value.is_empty())
            .map(|(_, value)| value.clone())
    };

    if let Some(home) = get("WAKACRAFT_HOME") {
        return Some(home);
    }

    let home = if is_windows() {
        get("USERPROFILE").or_else(|| get("HOME"))
    } else {
        get("HOME")
    }?;
    let separator = if is_windows() { '\\' } else { '/' };
    Some(format!(
        "{}{separator}.wakacraft",
        home.trim_end_matches(['/', '\\'])
    ))
}

impl WakacraftExtension {
    fn asset_name(binary: &str) -> Result<String> {
        let (os, arch) = zed::current_platform();
        let cli = binary == "wakatime-cli";
        let arch = match arch {
            zed::Architecture::Aarch64 => {
                if cli {
                    "arm64"
                } else {
                    "aarch64"
                }
            }
            zed::Architecture::X8664 => {
                if cli {
                    "amd64"
                } else {
                    "x86_64"
                }
            }
            other => return Err(format!("unsupported architecture: {other:?}")),
        };
        let os = match (os, cli) {
            (zed::Os::Mac, true) => "darwin",
            (zed::Os::Mac, false) => "apple-darwin",
            (zed::Os::Linux, true) => "linux",
            (zed::Os::Linux, false) => "unknown-linux-gnu",
            (zed::Os::Windows, true) => "windows",
            (zed::Os::Windows, false) => "pc-windows-msvc",
        };
        Ok(if cli {
            format!("{binary}-{os}-{arch}")
        } else {
            format!("{binary}-{arch}-{os}")
        })
    }

    /// Downloads `binary` from `repo` (the release tagged `tag`, or the latest) into the extension's work
    /// directory, removing older versions. When GitHub can't be reached (offline, rate limited), an
    /// already-downloaded version is used instead, so tracking still starts and heartbeats reach the offline queue.
    fn download(
        server_id: &LanguageServerId,
        binary: &str,
        repo: &str,
        tag: Option<&str>,
    ) -> Result<PathBuf> {
        let asset_name = Self::asset_name(binary)?;
        // wakatime-cli's zip holds `wakatime-cli-<os>-<arch>`; wakatime-ls's holds `wakatime-ls`.
        let file_name = if binary == "wakatime-cli" {
            executable_name(&asset_name)
        } else {
            executable_name(binary)
        };

        let release = match tag {
            Some(tag) => zed::github_release_by_tag_name(repo, tag),
            None => zed::latest_github_release(
                repo,
                zed::GithubReleaseOptions {
                    require_assets: true,
                    pre_release: false,
                },
            ),
        };
        let release = match release {
            Ok(release) => release,
            Err(err) => {
                return Self::installed(binary, &file_name)
                    .ok_or_else(|| format!("failed to look up {repo} releases: {err}"))
            }
        };

        let asset = release
            .assets
            .iter()
            .find(|asset| asset.name == format!("{asset_name}.zip"))
            .ok_or_else(|| format!("no {asset_name}.zip in {repo} {}", release.version))?;

        let version_dir = format!("{binary}-{}", release.version);
        let binary_path = Path::new(&version_dir).join(&file_name);

        if !fs::metadata(&binary_path).is_ok_and(|stat| stat.is_file()) {
            zed::set_language_server_installation_status(
                server_id,
                &zed::LanguageServerInstallationStatus::Downloading,
            );
            if let Err(err) = zed::download_file(
                &asset.download_url,
                &version_dir,
                zed::DownloadedFileType::Zip,
            ) {
                return Self::installed(binary, &file_name)
                    .ok_or_else(|| format!("failed to download {asset_name}: {err}"));
            }

            for entry in fs::read_dir(".").map_err(|err| err.to_string())?.flatten() {
                let name = entry.file_name();
                let name = name.to_string_lossy();
                if name.starts_with(&format!("{binary}-")) && name != version_dir {
                    fs::remove_dir_all(entry.path()).ok();
                }
            }
        }

        zed::make_file_executable(&binary_path.to_string_lossy())?;
        Ok(binary_path)
    }

    /// A previously downloaded `<binary>-<version>/<file_name>` in the work directory, if any.
    fn installed(binary: &str, file_name: &str) -> Option<PathBuf> {
        fs::read_dir(".")
            .ok()?
            .flatten()
            .filter(|entry| {
                entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with(&format!("{binary}-"))
            })
            .map(|entry| entry.path().join(file_name))
            .find(|path| fs::metadata(path).is_ok_and(|stat| stat.is_file()))
    }

    fn cached_or_download(
        cache: &mut Option<PathBuf>,
        download: impl FnOnce() -> Result<PathBuf>,
    ) -> Result<PathBuf> {
        if let Some(path) = cache {
            if fs::metadata(&path).is_ok_and(|stat| stat.is_file()) {
                return Ok(path.clone());
            }
        }
        let path = download()?;
        *cache = Some(path.clone());
        Ok(path)
    }

    /// Absolute host path for a binary in the work directory, which the language server process needs.
    fn absolute(path: &Path) -> String {
        let path = path.to_string_lossy().to_string();
        if is_absolute_host_path(&path) {
            return host_path(&path);
        }
        let current = std::env::current_dir().unwrap_or_default();
        host_path(&current.join(path).to_string_lossy())
    }
}

impl zed::Extension for WakacraftExtension {
    fn new() -> Self {
        Self {
            cached_ls_binary_path: None,
            cached_cli_binary_path: None,
        }
    }

    fn language_server_command(
        &mut self,
        server_id: &LanguageServerId,
        worktree: &Worktree,
    ) -> Result<Command> {
        zed::set_language_server_installation_status(
            server_id,
            &zed::LanguageServerInstallationStatus::CheckingForUpdate,
        );

        let cli = match worktree.which(&executable_name("wakatime-cli")) {
            Some(path) => path,
            None => {
                let path = Self::cached_or_download(&mut self.cached_cli_binary_path, || {
                    Self::download(server_id, "wakatime-cli", "wakatime/wakatime-cli", None)
                })?;
                Self::absolute(&path)
            }
        };
        let ls = Self::cached_or_download(&mut self.cached_ls_binary_path, || {
            Self::download(
                server_id,
                "wakatime-ls",
                "wakatime/zed-wakatime",
                Some(WAKATIME_LS_TAG),
            )
        })?;

        // wakatime-ls v0.1.10 accepts only `--wakatime-cli`; passing the `--project-folder` that zed-wakatime's main
        // branch sends makes it exit. wakatime-cli detects the project from the repository.
        let args = vec!["--wakatime-cli".to_string(), cli];

        let mut env = worktree.shell_env();
        let home = wakacraft_home(&env).ok_or(
            "wakacraft: could not find your home directory (HOME / USERPROFILE) in the shell environment",
        )?;
        // A WAKATIME_API_KEY from the user's shell is their WakaTime key; it must never reach wakacraft.
        env.retain(|(name, _)| {
            !name.eq_ignore_ascii_case("WAKATIME_HOME")
                && !name.eq_ignore_ascii_case("WAKATIME_API_KEY")
        });
        env.push(("WAKATIME_HOME".to_string(), home));
        // The key goes to wakatime-cli through the environment. As an `api-key` initialization option, wakatime-ls
        // would put it on the cli's command line and write that command line to Zed's log. wakatime-cli prefers an
        // `api_key` in ~/.wakacraft/.wakatime.cfg when there is one.
        if let Some(key) = setting(worktree, "api-key").filter(|key| is_api_key(key)) {
            env.push(("WAKATIME_API_KEY".to_string(), key));
        }

        Ok(Command {
            command: Self::absolute(&ls),
            args,
            env,
        })
    }

    /// Only `api-url` is handed to wakatime-ls. It is always set (default wakacraft.tech), so heartbeats never fall
    /// through to wakatime-cli's default server.
    fn language_server_initialization_options(
        &mut self,
        _server_id: &LanguageServerId,
        worktree: &Worktree,
    ) -> Result<Option<serde_json::Value>> {
        let api_url = setting(worktree, "api-url").unwrap_or_else(|| DEFAULT_API_URL.to_string());
        Ok(Some(serde_json::json!({ "api-url": api_url })))
    }
}

/// `lsp.wakacraft.settings.<key>` from Zed's settings. `initialization_options.<key>` is read as well, but Zed also
/// hands initialization options to wakatime-ls unchanged, so the key belongs under `settings`.
fn setting(worktree: &Worktree, key: &str) -> Option<String> {
    let settings = LspSettings::for_worktree(SERVER_ID, worktree).ok()?;
    [settings.settings, settings.initialization_options]
        .into_iter()
        .flatten()
        .find_map(|value| {
            value
                .get(key)
                .and_then(serde_json::Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
        })
}

/// `waka_<uuid>`, the format wakacraft issues and wakatime-cli accepts.
fn is_api_key(value: &str) -> bool {
    let Some(uuid) = value.strip_prefix("waka_") else {
        return false;
    };
    let groups: Vec<&str> = uuid.split('-').collect();
    groups.iter().map(|group| group.len()).eq([8, 4, 4, 4, 12])
        && groups
            .iter()
            .all(|group| group.chars().all(|c| c.is_ascii_hexdigit()))
}

zed::register_extension!(WakacraftExtension);
