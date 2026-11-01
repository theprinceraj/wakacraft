# Changelog

## 0.1.1

- The log is now `~/.wakacraft/wakacraft.log` instead of `wakatime.log`. The extension also sets `log_file` in the
  shared config, so the Zed extension's wakatime-cli writes to the same file.

## 0.1.0

- First release: automatic heartbeats through wakatime-cli in its own `~/.wakacraft` home, today's time in the
  status bar, and commands to set the API key and server URL.
