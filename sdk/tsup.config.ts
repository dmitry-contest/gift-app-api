import * as Tsup from 'tsup';
import * as Path from 'node:path';
import * as PkgDir from 'pkg-dir';

export const filename = (metaUrl: string): string => new URL(metaUrl).pathname;
export const dirname = (metaUrl: string): string =>
    Path.dirname(filename(metaUrl));
export const relPath = (metaUrl: string, ...fragments: string[]): string =>
    Path.join(dirname(metaUrl), ...fragments);
export const makeRelPath = (metaUrl: string) => relPath.bind(this, metaUrl);

export const pkgRoot = PkgDir.packageDirectorySync() ?? Path.resolve('.');
export const pkgRel = (...fragments: string[]) =>
    Path.join(pkgRoot, ...fragments);
export const pkgRelFn =
    (...fragments: string[]) =>
        (...fragments2: string[]) =>
            pkgRel(...fragments, ...fragments2);

const entry = [pkgRel('sdk/main.ts')] as string[];

const outDir = pkgRel('sdk/package/dist');
const format = ['esm' as const, 'cjs' as const];

const config = Tsup.defineConfig((opts) => ({
    entry,
    format,
    outDir,
    clean: true,
    minify: !opts.watch,
    sourcemap: true,
    keepNames: true,
    shims: true,
    dts: true,
    tsconfig: pkgRel('tsconfig.build.json'),
    outExtension(ctx) {
        return ctx.format === 'esm'
            ? {
                js: '.js',
            }
            : {
                js: '.cjs',
            };
    },
}));

export default config;
