# React major-version dependency policy

**Merged resolution, November 18, 2026:** [PR #37](https://github.com/LEO0331/AssistantHub/pull/37) retained React 18.3.1 / React DOM 18.3.1 and added regression tests and pre-install checks. The React 19 upgrade was **not merged**. The [post-merge Pages deployment](https://github.com/LEO0331/AssistantHub/actions/runs/44249787263) succeeded. See [verified current state](current-state.md).

PR #37 originally attempted to update **react-dom** from 18.3.1 to 19.3.1 on its own. CI, Lighthouse and the dependency assessment all failed during strict `npm ci` with `ERESOLVE`: react-dom@19.3.1 requires react@^19.3.1, but AssistantHub currently uses react@18.3.1.

Changing React alone is **also not safe**. The current React Leaflet 4.2.1 and @react-leaflet/core 2.1.0 declare React 18 and React DOM 18 peer constraints; react-copy-to-clipboard 5.1.0 also does not declare React 19 support. Forcing npm to ignore peer dependencies could leave map and clipboard behavior broken.

## Resolution in PR #37

- Preserve the last verified, mutually compatible React 18.3.1 and React DOM 18.3.1 versions in `package.json` and `package-lock.json`; do **not** claim the React 19 upgrade shipped.
- `npm run test:react-stack` checks the manifest/lock consistency, exact runtime alignment, and declared peers for the installed React DOM, React Leaflet, @react-leaflet/core and clipboard integration.
- Native tests reproduce the original React DOM 19-only mismatch and ensure that upgrading both runtimes without the integration dependencies still fails.
- CI, Lighthouse and Pages deployment run the check **before** `npm ci`, so a future incompatible Dependabot PR is rejected with an actionable explanation and no ignored npm peer conflicts.
- `npm ci` remains strict; neither `--legacy-peer-deps`, `--force`, nor modified npm audit gates are used.

## Future React 19 migration

Create a separately reviewed migration PR that upgrades React and React DOM together; updates or replaces React Leaflet 4.x and its core, migrates the clipboard integration to a React 19-compatible solution, regenerates the lockfile under strict npm resolution, and validates the card map, contact copy, shortlisting, hiring status, full Jest suite, Vite build, Pages release guard, Lighthouse and security checks. React 19 is **deferred**, not silently excluded from dependency monitoring.

The check is deliberately narrow: it recognizes the simple peer-version expressions used by the current pinned integrations. npm's resolver remains the authoritative full peer-dependency validator.
