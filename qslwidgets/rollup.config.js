import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import css from 'rollup-plugin-css-only';
import cjs from "@rollup/plugin-commonjs"
import replace from "@rollup/plugin-replace"
import rust from '@wasm-tool/rollup-plugin-rust';
import { sveltePreprocess } from "svelte-preprocess"
import typescript from '@rollup/plugin-typescript';

export default ({ input }) => {
    return {
        input: input[0], // Your Svelte component
        output: {
            file: `${input[0].replace("src", "dist").replace(".ts", "")}/index.js`,
            format: 'es',
            sourcemap: false
        },
        plugins: [
            typescript(),
            svelte({
                preprocess: sveltePreprocess(),
                compilerOptions: {
                    generate: 'dom'
                },
                onwarn: (warning, handler) => {
                    if (warning.code.includes("a11y")) return;
                    handler(warning);
                },
            }),
            rust({
                inlineWasm: true,
                optimize: {
                    wasmOpt: true
                },
                experimental: { typescriptDeclarationDir: "src/library/wasm-types" },
                extraArgs: { wasmOpt: ["-O", "--enable-bulk-memory", "--enable-nontrapping-float-to-int"], cargo: [] }
            }),
            cjs(),
            replace({
                'process.env.NODE_ENV': JSON.stringify('production'),
                preventAssignment: true
            }),
            css({ output: 'index.css' }),
            resolve({
                browser: true,
                dedupe: ['svelte'],
            }),
        ],
    }
};