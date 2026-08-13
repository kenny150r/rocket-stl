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
  const errors = issues.filter((i) => i.level === 'error');
  const ok = Boolean(report?.ok) && errors.length === 0 && !assembleError;
  return (
    <div className="quality">
      <div className="quality-status">
        <span className={`pill ${assembling ? 'busy' : ok ? 'ok' : 'bad'}`}>
          {assembling ? 'Building' : ok ? 'Watertight' : 'Blocked'}
        </span>
        {report && <code>{report.message}</code>}
      </div>
      {assembleError && <p className="error">{assembleError}</p>}
      {errors.map((e) => (
        <p key={e.message} className="error">
          {e.message}
        </p>
      ))}
      {report?.warnings.map((w) => (
        <p key={w} className="warn">
          {w}
        </p>
      ))}
      {report && (
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
