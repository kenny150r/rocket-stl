# Rocket STL

Browser app that builds watertight sounding-rocket geometry and exports a single STL. Bodies of revolution (von Karman, Haack, ogives, power, conic, …) stack with cylinders, frustums, flares, and boat-tails. Fin sets union into the body with [Manifold](https://github.com/elalish/manifold) so the mesh is one closed solid.

Live preview is local (`npm run dev`) or GitHub Pages. Email/password login is gated by a Supabase allowlist.

## Run locally

Node 20+ (22 recommended).

```bash
cp .env.example .env.local
# fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm test
npm run dev
```

Without `.env.local`, `npm run dev` skips login so you can work on geometry. Production builds always require Auth.

Open http://localhost:5173.

## Geometry

- **+x** along the body, nose at the origin.
- Units are **m / mm / in**; the STL is written in the units shown (no conversion).
- Adjacent body stations share diameter (fore diameter is locked to the previous aft face).
- Fins: preset planforms, DATCOM-style area/AR/taper/sweep, or explicit chords. Cross-section is a modified double-wedge or a constant-thickness plate, both with a leading-edge radius.
- Export is disabled unless the mesh has no open edges, no non-manifold edges, and no degenerates.

## Supabase allowlist

Uses the existing **Sam Progress Tracker** project (`ebdlvmtqzruqxunpshbx`). The `rocket_stl_allowlist` table is already applied there.

1. Sign in with an allowlisted Auth email/password (same users as that project).
2. Add more emails with:

```sql
insert into public.rocket_stl_allowlist (email, notes) values ('someone@example.com', 'collaborator');
```

3. **Authentication → URL configuration**: Site URL = `https://<user>.github.io/rocket-stl/` (and `http://localhost:5173` for local).
4. Copy `.env.example` to `.env.local` (already filled if you used the Cursor Supabase connection). For GitHub Pages, set secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from that file.

The anon key is public (it ships in the JS bundle). RLS only lets an authenticated user **select their own allowlist row**. Do not put the `service_role` key in this repo or in GitHub Actions.

## GitHub Pages

1. Create a GitHub repo named `rocket-stl` and push `main`.
2. Settings → Pages → Build and deployment → **GitHub Actions**.
3. Secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. The workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds with `base: /rocket-stl/` and deploys `dist`.

If the repo is not named `rocket-stl`, change `base` in `vite.config.ts` to match.

## CFD handoff

The STL is a single watertight shell (fins are unioned). Point an external cut-cell solver at `geometry.files = ["rocket.stl"]`. Overlapping parts that are not Boolean-unioned will not be repaired by this app after export.
