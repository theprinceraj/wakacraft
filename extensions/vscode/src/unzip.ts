import { inflateRawSync } from 'node:zlib';

/**
 * Extracts one entry from a zip archive held in memory. wakatime-cli ships each release as a zip holding a single
 * binary, so this reads the central directory and inflates that entry; no unzip dependency or system tool needed.
 */
export function extractZipEntry(zip: Buffer, name: string): Buffer {
	const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
	if (eocd === -1) throw new Error('Not a zip archive');

	const entries = zip.readUInt16LE(eocd + 10);
	let offset = zip.readUInt32LE(eocd + 16);

	for (let i = 0; i < entries; i++) {
		if (zip.readUInt32LE(offset) !== 0x02014b50) throw new Error('Corrupt zip central directory');
		const method = zip.readUInt16LE(offset + 10);
		const compressedSize = zip.readUInt32LE(offset + 20);
		const nameLength = zip.readUInt16LE(offset + 28);
		const extraLength = zip.readUInt16LE(offset + 30);
		const commentLength = zip.readUInt16LE(offset + 32);
		const localHeader = zip.readUInt32LE(offset + 42);
		const entryName = zip.toString('utf8', offset + 46, offset + 46 + nameLength);
		offset += 46 + nameLength + extraLength + commentLength;

		if (entryName !== name) continue;

		// Sizes in the local header can be zero when a data descriptor is used; the central directory's are reliable.
		const dataStart = localHeader + 30 + zip.readUInt16LE(localHeader + 26) + zip.readUInt16LE(localHeader + 28);
		const data = zip.subarray(dataStart, dataStart + compressedSize);
		if (method === 0) return Buffer.from(data);
		if (method === 8) return inflateRawSync(data);
		throw new Error(`Unsupported zip compression method ${method}`);
	}

	throw new Error(`${name} not found in zip archive`);
}
