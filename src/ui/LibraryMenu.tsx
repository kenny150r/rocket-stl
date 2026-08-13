import { useEffect, useRef, useState } from 'react';
import type { RocketSpec } from '../geometry/types';
import { deleteDesign, designsAreCloud, listDesigns, saveDesign, type SavedDesign } from './designs';

type Props = {
  spec: RocketSpec;
  onLoad: (spec: RocketSpec) => void;
};

export function LibraryMenu({ spec, onLoad }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<SavedDesign[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const cloud = designsAreCloud();

  async function refresh() {
    const list = await listDesigns();
    setRows(list);
  }

  useEffect(() => {
    if (!open) return;
    void refresh().catch((err: unknown) => setStatus(err instanceof Error ? err.message : String(err)));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function onSave() {
    setBusy(true);
    setStatus(null);
    try {
      const row = await saveDesign(spec);
      setOpen(true);
      setStatus(`Saved “${row.name}”`);
      await refresh();
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    setBusy(true);
    setStatus(null);
    try {
      await deleteDesign(id);
      await refresh();
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="menu" ref={root}>
      <button type="button" className="btn" onClick={onSave} disabled={busy}>
        Save
      </button>
      <button type="button" className="btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Library
      </button>
      {open && (
        <div className="menu-pop">
          <p className="muted tiny">
            {cloud ? 'Saved to your account.' : 'Saved in this browser (no login).'} Same name overwrites.
          </p>
          {rows.length === 0 && <p className="muted tiny">No saved designs yet.</p>}
          <ul className="library-list">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="library-load"
                  onClick={() => {
                    onLoad(row.spec);
                    setOpen(false);
                  }}
                >
                  <strong>{row.name}</strong>
                  <span>{new Date(row.updatedAt).toLocaleString()}</span>
                </button>
                <button type="button" className="btn icon danger" onClick={() => void onDelete(row.id)} disabled={busy}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          {status && <p className="tiny">{status}</p>}
        </div>
      )}
    </div>
  );
}
