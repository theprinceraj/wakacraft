import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Symmetric encryption for third-party secrets wakacraft must store briefly (a WakaTime API key during an import).
 * The key is derived from BETTER_AUTH_SECRET per `purpose`, so rotating that secret also invalidates these.
 */
function keyFor(purpose: string): Buffer {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret) throw new Error('BETTER_AUTH_SECRET is not set');
	return createHash('sha256').update(`${purpose}:${secret}`).digest();
}

/** AES-256-GCM; returns `iv.tag.ciphertext`, base64url. */
export function encryptSecret(plaintext: string, purpose: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', keyFor(purpose), iv);
	const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptSecret(sealed: string, purpose: string): string {
	const [iv, tag, ciphertext] = sealed.split('.').map((part) => Buffer.from(part, 'base64url'));
	const decipher = createDecipheriv('aes-256-gcm', keyFor(purpose), iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
