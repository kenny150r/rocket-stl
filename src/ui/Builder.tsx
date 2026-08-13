import { useEffect, useMemo, useState } from 'react';
import { assembleRocket } from '../geometry/assemble';
import { checkWatertight } from '../geometry/quality';
import { writeStlAscii, writeStlBinary } from '../geometry/stl';
import { hasErrors, validateSpec } from '../geometry/validate';
import type { MeshData, RocketSpec, WatertightReport } from '../geometry/types';
import { supabase } from '../auth/supabase';
import { clonePreset, PRESETS } from '../presets/examples';
import { BodyEditor } from './BodyEditor';
import { FinEditor } from './FinEditor';
import { QualityPanel } from './QualityPanel';
import { TessellationPanel } from './TessellationPanel';
import { Viewport } from './Viewport';
import { loadSpec, saveSpec } from './storage';
import { useDebounced } from './useDebounced';

export function Builder() {
  const [spec, setSpec] = useState<RocketSpec>(loadSpec);
  const [mesh, setMesh] = useState<MeshData | null>(null);
  const [report, setReport] = useState<WatertightReport | null>(null);
  const [volume, setVolume] = useState<number | undefined>();
  const [area, setArea] = useState<number | undefined>();
  const [assembling, setAssembling] = useState(false);
  const [assembleError, setAssembleError] = useState<string | null>(null);
  const [wireframe, setWireframe] = useState(false);
  const [ascii, setAscii] = useState(false);
  const debounced = useDebounced(spec, 160);

  useEffect(() => saveSpec(spec), [spec]);

  const issues = useMemo(() => validateSpec(debounced), [debounced]);
  const blocked = hasErrors(issues);

  useEffect(() => {
    if (blocked) {
      setMesh(null);
      setReport(null);
      setVolume(undefined);
      setArea(undefined);
      setAssembleError(null);
      setAssembling(false);
      return;
    }
    let cancelled = false;
    setAssembling(true);
    setAssembleError(null);
    assembleRocket(debounced)
      .then((result) => {
        if (cancelled) return;
        const wt = checkWatertight(result.mesh, debounced.tessellation.mergeTol);
        wt.volume = result.volume;
        wt.area = result.area;
        setMesh(result.mesh);
        setReport(wt);
        setVolume(result.volume);
        setArea(result.area);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMesh(null);
        setReport(null);
        setAssembleError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setAssembling(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, blocked]);

  function download() {
    if (!mesh || !report?.ok) return;
    const name = spec.name.replace(/[^\w.-]+/g, '_') || 'rocket';
    const blob = ascii
      ? new Blob([writeStlAscii(mesh, name)], { type: 'model/stl' })
      : new Blob([writeStlBinary(mesh, name)], { type: 'model/stl' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.stl`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const canExport = Boolean(mesh && report?.ok && !blocked && !assembleError);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Sounding rocket geometry</p>
          <input
            className="title-input"
            value={spec.name}
            onChange={(e) => setSpec({ ...spec, name: e.target.value })}
            aria-label="Model name"
          />
        </div>
        <div className="topbar-actions">
          <label className="check">
            <input type="checkbox" checked={wireframe} onChange={(e) => setWireframe(e.target.checked)} />
            Wireframe
          </label>
          {supabase && (
            <button type="button" className="btn" onClick={() => void supabase?.auth.signOut()}>
              Sign out
            </button>
          )}
        </div>
      </header>
      <aside className="sidebar">
        <SectionPresets spec={spec} setSpec={setSpec} />
        <BodyEditor spec={spec} setSpec={setSpec} />
        <FinEditor spec={spec} setSpec={setSpec} />
        <TessellationPanel spec={spec} setSpec={setSpec} />
      </aside>
      <main className="viewport">
        <Viewport mesh={mesh} wireframe={wireframe} />
      </main>
      <footer className="bottom">
        <QualityPanel
          report={report}
          issues={issues}
          volume={volume}
          area={area}
          units={spec.units}
          assembling={assembling}
          assembleError={assembleError}
        />
        <div className="export">
          <label className="check">
            <input type="checkbox" checked={ascii} onChange={(e) => setAscii(e.target.checked)} />
            ASCII STL
          </label>
          <button type="button" className="btn primary" disabled={!canExport} onClick={download}>
            Export STL
          </button>
        </div>
      </footer>
    </div>
  );
}

function SectionPresets({ spec, setSpec }: { spec: RocketSpec; setSpec: (s: RocketSpec) => void }) {
  return (
    <section className="panel-section">
      <header>
        <h2>Presets</h2>
      </header>
      <div className="btn-row wrap">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className="btn" onClick={() => setSpec(clonePreset(p.id))}>
            {p.label}
          </button>
        ))}
      </div>
      <p className="muted tiny">
        Axis +x from the nose. Export uses {spec.units} with no conversion.
      </p>
    </section>
  );
}
