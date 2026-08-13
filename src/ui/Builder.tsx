import { useEffect, useMemo, useRef, useState } from 'react';
import { assembleRocket } from '../geometry/assemble';
import { bodyLength } from '../geometry/body';
import { checkWatertight } from '../geometry/quality';
import { writeStlAscii, writeStlBinary } from '../geometry/stl';
import { hasErrors, validateSpec } from '../geometry/validate';
import type { MeshData, RocketSpec, Units, WatertightReport } from '../geometry/types';
import { supabase } from '../auth/supabase';
import { clonePreset, PRESETS } from '../presets/examples';
import { BodyEditor } from './BodyEditor';
import { FinEditor } from './FinEditor';
import { LibraryMenu } from './LibraryMenu';
import { QualityPanel } from './QualityPanel';
import { Section, SelectField } from './fields';
import { copyShareUrl, writeSpecToUrl } from './shareUrl';
import { TessellationPanel } from './TessellationPanel';
import { Viewport } from './Viewport';
import { useDebounced } from './useDebounced';
import { specFingerprint, useUndoableSpec } from './useUndoableSpec';

export function Builder() {
  const { spec, setSpec, undo, redo, canUndo, canRedo } = useUndoableSpec();
  const [mesh, setMesh] = useState<MeshData | null>(null);
  const [report, setReport] = useState<WatertightReport | null>(null);
  const [volume, setVolume] = useState<number | undefined>();
  const [area, setArea] = useState<number | undefined>();
  const [assembling, setAssembling] = useState(false);
  const [assembleError, setAssembleError] = useState<string | null>(null);
  const [wireframe, setWireframe] = useState(false);
  const [ascii, setAscii] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fitToken, setFitToken] = useState(0);
  const [presetId, setPresetId] = useState('');
  const baseline = useRef(specFingerprint(spec));
  const debounced = useDebounced(spec, 160);
  const urlDebounced = useDebounced(spec, 400);

  useEffect(() => {
    writeSpecToUrl(urlDebounced);
  }, [urlDebounced]);

  const issues = useMemo(() => validateSpec(debounced), [debounced]);
  const blocked = hasErrors(issues);
  const errors = issues.filter((i) => i.level === 'error');

  useEffect(() => {
    if (blocked) {
      setAssembling(false);
      setAssembleError(null);
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

  async function onCopyLink() {
    const ok = await copyShareUrl(spec);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function replaceSpec(next: RocketSpec) {
    setSpec(next, { checkpoint: true });
    baseline.current = specFingerprint(next);
    setFitToken((n) => n + 1);
  }

  function applyPreset(id: string) {
    if (!id) return;
    if (specFingerprint(spec) !== baseline.current) {
      const ok = window.confirm('Replace the current model with this preset? You can Undo afterward.');
      if (!ok) return;
    }
    replaceSpec(clonePreset(id));
    setPresetId(id);
  }

  const canExport = Boolean(mesh && report?.ok && !blocked && !assembleError);
  const exportTitle = canExport
    ? 'Download STL'
    : blocked
      ? errors.map((e) => e.message).join(' ')
      : assembleError
        ? assembleError
        : report && !report.ok
          ? report.message
          : 'Waiting for a watertight mesh';

  const overlayErrors = blocked ? errors.map((e) => e.message) : assembleError ? [assembleError] : [];

  return (
    <div className="app">
      <header className="topbar">
        <div className="title-block">
          <input
            className="title-input"
            value={spec.name}
            placeholder="Model name"
            onChange={(e) => setSpec({ ...spec, name: e.target.value })}
            aria-label="Model name"
          />
          <label className="units-select" title="STL is written in these units with no conversion">
            <span>Units</span>
            <select
              value={spec.units}
              onChange={(e) => setSpec({ ...spec, units: e.target.value as Units })}
              aria-label="Export units"
            >
              <option value="m">m</option>
              <option value="mm">mm</option>
              <option value="in">in</option>
            </select>
          </label>
        </div>
        <div className="topbar-actions">
          <LibraryMenu spec={spec} onLoad={replaceSpec} />
          <button type="button" className="btn" onClick={() => void onCopyLink()}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button type="button" className="btn" disabled={!canUndo} onClick={undo} title="Undo (⌘Z)">
            Undo
          </button>
          <button type="button" className="btn" disabled={!canRedo} onClick={redo} title="Redo (⇧⌘Z)">
            Redo
          </button>
          {supabase && (
            <button type="button" className="btn" onClick={() => void supabase?.auth.signOut()}>
              Sign out
            </button>
          )}
        </div>
      </header>
      <aside className="sidebar">
        <Section title="Presets" collapsible defaultOpen={false}>
          <SelectField label="Load" value={presetId} onChange={(id) => applyPreset(id)}>
            <option value="">Choose a starting point…</option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </SelectField>
          <p className="muted tiny">Replaces the current model. Undo brings it back. Axis +x from the nose; values export as {spec.units}.</p>
        </Section>
        <BodyEditor spec={spec} setSpec={setSpec} issues={issues} />
        <FinEditor spec={spec} setSpec={setSpec} issues={issues} />
        <TessellationPanel spec={spec} setSpec={setSpec} issues={issues} />
      </aside>
      <main className="viewport">
        <Viewport mesh={mesh} wireframe={wireframe} fitToken={fitToken} bodyLength={bodyLength(spec.segments)} />
        <div className="viewport-chrome">
          {assembling && <span className="pill busy">Building</span>}
          <label className="check">
            <input type="checkbox" checked={wireframe} onChange={(e) => setWireframe(e.target.checked)} />
            Wireframe
          </label>
          <button type="button" className="btn" onClick={() => setFitToken((n) => n + 1)}>
            Fit
          </button>
        </div>
        {overlayErrors.length > 0 && (
          <div className="viewport-banner" role="alert">
            {overlayErrors.map((msg) => (
              <p key={msg}>{msg}</p>
            ))}
          </div>
        )}
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
          <button
            type="button"
            className="btn primary"
            disabled={!canExport}
            title={exportTitle}
            onClick={download}
          >
            Export STL
          </button>
        </div>
      </footer>
    </div>
  );
}
