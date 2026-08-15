/**
 * `harfbuzzjs` ships CommonJS wasm glue with no bundled typings. We only need
 * the two factory functions, so declare them structurally.
 */
declare module 'harfbuzzjs/hb.js' {
  const createHarfBuzz: (options: {
    wasmBinary: Uint8Array;
  }) => Promise<unknown>;
  export default createHarfBuzz;
}

declare module 'harfbuzzjs/hbjs.js' {
  const bindHarfBuzz: (module: unknown) => any;
  export default bindHarfBuzz;
}
