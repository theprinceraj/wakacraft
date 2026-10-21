import { execSync } from 'node:child_process';
import { opendir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import util from 'node:util';

import { jsonSchemaToZod, type JsonSchema } from 'json-schema-to-zod';
import mongoose from 'mongoose';
// @ts-expect-error -- mongoose-schema-jsonschema does not have types
import mongooseFn from 'mongoose-schema-jsonschema';
// @ts-expect-error -- mongoose-schema-jsonschema/config does not have types
import mongooseJsonSchemaConfig from 'mongoose-schema-jsonschema/config';

mongooseFn(mongoose);

/**
 * Scalar `min` / `max` / `minLength` / `maxLength` already flow through to the
 * generated zod schema natively. Array bounds do not, so map the mongoose field
 * options `minItems` / `maxItems` onto the JSON-schema keywords of the same name
 * (`json-schema-to-zod` then emits `.min()` / `.max()` on the `z.array(...)`).
 */
mongooseJsonSchemaConfig({
	fieldOptionsMapping: {
		minItems: 'minItems',
		maxItems: 'maxItems',
	},
	forceRebuild: true,
});

const flags = process.argv.slice(2);
let runEsLint = false;
if (flags.includes('--eslint')) runEsLint = true;

async function* findFilesRecursively(path: string): AsyncGenerator<string> {
	try {
		const dir = await opendir(path);
		for await (const item of dir) {
			if (item.isFile()) yield join(dir.path, item.name);
			else if (item.isDirectory()) yield* findFilesRecursively(join(dir.path, item.name));
		}
	} catch (error: any) {
		if (error.code !== 'ENOENT') console.error(error);
	}
}

/**
 * Walk a mongoose schema alongside its generated JSON schema and remove any
 * non-required array path from the matching `required` array, recursing into
 * embedded documents and document arrays.
 */
function relaxOptionalArrays(mongooseSchema: mongoose.Schema, jsonNode: JsonSchema): void {
	if (!jsonNode || typeof jsonNode !== 'object') return;

	for (const [pathName, schemaType] of Object.entries<any>((mongooseSchema as any).paths)) {
		const isArray = schemaType.instance === 'Array' || schemaType.$isMongooseArray;

		if (isArray && !schemaType.isRequired && Array.isArray((jsonNode as any).required)) {
			(jsonNode as any).required = (jsonNode as any).required.filter((key: string) => key !== pathName);
		}

		const childSchema: mongoose.Schema | undefined = schemaType.schema;
		if (!childSchema) continue;

		const childJson = (jsonNode as any).properties?.[pathName];
		if (!childJson) continue;

		// Document arrays nest their object schema under `items`.
		relaxOptionalArrays(childSchema, childJson.type === 'array' ? childJson.items : childJson);
	}
}

let exportMap = '';
const startTime = performance.now();
let processedFiles = 0;
let totalSchemas = 0;

console.info('🚀 Starting Schema Conversion Process\n');
console.info('📁 Scanning directories for schema files...\n');

for await (const file of findFilesRecursively('./src/lib/mongo/schemas')) {
	const fileName = file.split('/').pop()!;

	// Skip barrel/index files – only process individual *.schema.ts files
	if (!fileName.endsWith('.schema.ts')) {
		continue;
	}

	processedFiles++;
	console.info(`\n📄 Processing: ${fileName}`);
	console.info('├── 🔍 Loading schema...');

	const schemaImport = (await import(resolve(file))) as {
		[key: string]: { jsonSchema: () => JsonSchema };
	};

	const schemaKeys = Object.keys(schemaImport).filter((key) => key.endsWith('Schema'));
	if (!schemaKeys.length) {
		console.info('    └── No schemas found in this file, skipping...');
		continue;
	}

	console.info(`├── ✨ Found schemas: ${schemaKeys.join(', ')}`);
	const sanitizedPath = file.replaceAll('\\', '/');
	const pathToWrite = sanitizedPath.replace('schemas', 'zod').replace('.schema.', '.dto.');
	console.info(`├── 💾 Writing files:`);
	console.info(`│   ├── 📝 ${pathToWrite}`);

	let dtoFileContent = `
    /* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
    /* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
    /* TO REGENERATE RUN: \`bun run sync\` */

    import { z, type infer as TypeOf } from 'zod';
    `;

	await Promise.all(
		schemaKeys.map(async (schemaName) => {
			const zodSchemaName = schemaName.replace('Schema', 'ZodSchema');
			const Schema = schemaImport[schemaName];

			const customZodTypes = schemaImport[`custom${schemaName}ZodTypes`] as unknown as
				Record<string, string> | undefined;

			console.info(`│       - Converting ${schemaName} to JSON schema...`);
			const jsonSchemaObject = Schema.jsonSchema();

			/**
			 * `mongoose-schema-jsonschema` always lists array paths as `required`
			 * because mongoose gives arrays an implicit `[]` default. When the field
			 * is declared `required: false` (or `default: undefined`) we want it to
			 * stay optional in the generated zod schema, so strip those array paths
			 * out of every `required` list (top-level and nested sub-schemas).
			 */
			relaxOptionalArrays(Schema as unknown as mongoose.Schema, jsonSchemaObject);

			console.info(`│       - Generating zod schema ${zodSchemaName}...`);

			const code = jsonSchemaToZod(jsonSchemaObject, {
				module: 'none',
				name: zodSchemaName,
				depth: 15,
				parserOverride: (schema, refs) => {
					if (schema._zodType) {
						if (!schema._zodType.startsWith('z.')) {
							const path = refs.path.join('.').replaceAll('properties.', '');
							console.error(
								`Schema ${util.styleText('blue', schemaName)} has an invalid \`${util.styleText('italic', '_zodType')}\` at path ${util.styleText('blue', path)}. Please ensure it starts with ${util.styleText('green', 'z.')}`,
							);
							process.exit(1);
						}
						return `${schema._zodType}${schema.nullable ? '.nullable()' : ''}`;
					}
					// TODO: remove and use `_zodType` in schemas
					if (customZodTypes) {
						const fieldName = refs.path[refs.path.length - 1];
						const custom = customZodTypes[fieldName];
						if (custom) return custom;
					}
				},
			})
				.replaceAll(
					'z.string().datetime({ offset: true })',
					'z.union([z.date(), z.iso.datetime({ offset: true })]).pipe(z.coerce.date()).meta({ type: "string", format: "date-time" })',
				)
				.replaceAll('.nullable().optional()', '.nullish()')
				.replaceAll(
					'"coordinates": z.array(z.number())',
					'"coordinates": z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])',
				)
				.replaceAll(
					'z.tuple([z.number(), z.number()])',
					'z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])',
				);

			const partialCode = `export const Partial${zodSchemaName} = ${zodSchemaName}.partial()`;

			dtoFileContent += `
            export ${code}
            ${partialCode}

            export type I${zodSchemaName} = TypeOf<typeof ${zodSchemaName}>;
			export type I${zodSchemaName}Input = Omit<z.input<typeof ${zodSchemaName}>, 'createdAt' | 'updatedAt'> &
				Partial<Pick<z.input<typeof ${zodSchemaName}>, 'createdAt' | 'updatedAt'>>;
            export type IPartial${zodSchemaName} = TypeOf<typeof Partial${zodSchemaName}>;
            `;

			totalSchemas++;
			exportMap += `export { ${zodSchemaName}, type I${zodSchemaName}, type I${zodSchemaName}Input, Partial${zodSchemaName}, type IPartial${zodSchemaName} } from './${pathToWrite
				.split('/')
				.pop()!
				.replace('.ts', '')}';\n`;
		}),
	);

	await writeFile(pathToWrite, dtoFileContent);
}

console.info('\n📦 Finalizing...');
console.info('├── 📝 Writing index file...');
const sortedExportMap = exportMap
	.split('\n')
	.filter(Boolean)
	.sort((a, b) => a.localeCompare(b))
	.join('\n');
await writeFile('./src/lib/mongo/zod/index.ts', sortedExportMap + '\n');

console.info('├── 🧪 Running Eslint...');
if (runEsLint) execSync(`bunx eslint --fix ./src/lib/mongo/zod`);
else console.info('│   └── Skipping Eslint...');
console.info('└── 🎨 Running prettier...');
execSync(`bunx prettier --write ./src/lib/mongo/zod`);

const duration = ((performance.now() - startTime) / 1_000).toFixed(2);
console.info(`\n✨ Conversion Complete! (${duration}s)`);
console.info(`📊 Summary:`);
console.info(`   • Files processed: ${processedFiles}`);
console.info(`   • Schemas converted: ${totalSchemas}`);
