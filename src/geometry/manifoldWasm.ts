import Module from 'manifold-3d';

type ManifoldWasm = Awaited<ReturnType<typeof Module>> & { setup: () => void };

let pending: Promise<ManifoldWasm> | null = null;

export function loadManifold(): Promise<ManifoldWasm> {
  if (!pending) pending = init();
  return pending;
}

async function init(): Promise<ManifoldWasm> {
  const isBrowser = typeof window !== 'undefined';
  let wasm: ManifoldWasm;
  if (isBrowser) {
    const wasmUrl = (await import('manifold-3d/manifold.wasm?url')).default;
    wasm = (await (Module as unknown as (opts: { locateFile: () => string }) => Promise<ManifoldWasm>)({
      locateFile: () => wasmUrl,
    })) as ManifoldWasm;
  } else {
    wasm = (await Module()) as ManifoldWasm;
  }
  wasm.setup();
  return wasm;
}
