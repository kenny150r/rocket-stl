import { useState } from 'react';
import type { BlockingIssue, WatertightReport } from '../geometry/types';

type Props = {
  report: WatertightReport | null;
  issues: BlockingIssue[];
  volume?: number;
  area?: number;
  units: string;
  assembling: boolean;
  assembleError: string | null;
};

export function QualityPanel({ report, issues, volume, area, units, assembling, assembleError }: Props) {
  const [details, setDetails] = useState(false);
  const errors = issues.filter((i) => i.level === 'error');
  const ok = Boolean(report?.ok) && errors.length === 0 && !assembleError;
  const hints = report?.hints ?? [];

  let status = 'Blocked';
  let tone: 'busy' | 'ok' | 'bad' = 'bad';
  if (assembling) {
    status = 'Building';
    tone = 'busy';
  } else if (ok) {
    status = 'Watertight';
    tone = 'ok';
  }

  const summary = assembling
    ? 'Updating mesh…'
    : ok && report
      ? `${report.nTris.toLocaleString()} triangles`
      : errors[0]?.message ?? assembleError ?? 'Cannot export';

  return (
    <div className="quality">
      <div className="quality-status">
        <span className={`pill ${tone}`}>{status}</span>
        <span className="quality-summary">{summary}</span>
        {report && (
          <button type="button" className="btn" onClick={() => setDetails((d) => !d)}>
            {details ? 'Hide details' : 'Details'}
          </button>
        )}
      </div>
      {ok && hints.length > 0 && !details && (
        <p className="muted tiny">High-aspect slivers present — Details has CFD notes.</p>
      )}
      {details && hints.map((h) => (
        <p key={h} className="hint">
          {h}
        </p>
      ))}
      {report?.warnings.map((w) => (
        <p key={w} className="warn">
          {w}
        </p>
      ))}
      {details && report && (
        <dl className="metrics">
          <div>
            <dt>Triangles</dt>
            <dd>{report.nTris}</dd>
          </div>
          <div>
            <dt>Edge range</dt>
            <dd>
              {fmt(report.minEdge)} – {fmt(report.maxEdge)} {units}
            </dd>
          </div>
          <div>
            <dt>Worst aspect</dt>
            <dd>{fmt(report.worstAspect)}</dd>
          </div>
          {report.bbox && (
            <div>
              <dt>BBox x</dt>
              <dd>
                {fmt(report.bbox.lo[0])} → {fmt(report.bbox.hi[0])} {units}
              </dd>
            </div>
          )}
          {volume !== undefined && (
            <div>
              <dt>Volume</dt>
              <dd>
                {fmt(volume)} {units}³
              </dd>
            </div>
          )}
          {area !== undefined && (
            <div>
              <dt>Area</dt>
              <dd>
                {fmt(area)} {units}²
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a === 0) return '0';
  if (a >= 100) return n.toFixed(2);
  if (a >= 0.01) return n.toFixed(4);
  return n.toExponential(2);
}
