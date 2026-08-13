import { addLabelGroup, atomicComponents, DEFAULT_GROUP_IDS, ensureLabelGroups } from '../geometry/components';
import type { RocketSpec } from '../geometry/types';
import { Section } from './fields';

type Props = {
  spec: RocketSpec;
  setSpec: (s: RocketSpec) => void;
};

export function LabelsPanel({ spec, setSpec }: Props) {
  const synced = ensureLabelGroups(spec);
  const atoms = atomicComponents(synced);
  const groups = synced.labelGroups ?? [];

  function commit(next: RocketSpec) {
    setSpec(ensureLabelGroups(next));
  }

  return (
    <Section title="Labels" collapsible defaultOpen={false}>
      <p className="muted tiny">
        Binary STL writes a component ID on each triangle. Groups sum those parts in the solver.
      </p>
      <ul className="atom-list">
        {atoms.map((a) => (
          <li key={a.key}>
            <code>{a.id}</code> {a.name}
          </li>
        ))}
      </ul>
      {groups.map((g) => (
        <div key={g.id} className="card">
          <div className="card-head">
            <input
              className="inline-name"
              value={g.name}
              aria-label="Group name"
              onChange={(e) =>
                commit({
                  ...synced,
                  labelGroups: groups.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x)),
                })
              }
            />
            <button
              type="button"
              className="btn icon danger"
              disabled={DEFAULT_GROUP_IDS.has(g.id)}
              onClick={() =>
                commit({
                  ...synced,
                  labelGroups: groups.filter((x) => x.id !== g.id),
                })
              }
            >
              ×
            </button>
          </div>
          <div className="member-grid">
            {atoms.map((a) => {
              const on = g.members.includes(a.key);
              return (
                <label key={a.key} className="check">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={DEFAULT_GROUP_IDS.has(g.id)}
                    onChange={() => {
                      const members = on ? g.members.filter((k) => k !== a.key) : [...g.members, a.key];
                      commit({
                        ...synced,
                        labelGroups: groups.map((x) => (x.id === g.id ? { ...x, members } : x)),
                      });
                    }}
                  />
                  {a.name}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      <button type="button" className="btn" onClick={() => commit(addLabelGroup(synced))}>
        Add group
      </button>
    </Section>
  );
}
