# Dependabot review — 2026-10-05

## Result

All 63 alerts in the original review are resolved by the current lockfile: affected dependencies have been removed or every remaining instance is outside the advisory range. npm audit reports **0 vulnerabilities**. No alerts were dismissed.

The initial 2026-10-02 patch fixed 44 alerts and documented 19 deferrals. This migration removes those remaining vulnerable toolchain paths rather than maintaining CRA-specific security workarounds.

## Toolchain changes

- Replaced react-scripts/CRA with Vite 8 and its official React plugin. Removed webpack-dev-server, webpack-dev-middleware, Forge, SVGO, nth-check, uuid and old PostCSS7 chains.
- Aligned Jest, babel-jest and jest-environment-jsdom to 30, removing the old jsdom proxy helper and @tootallnate/once.
- Removed obsolete dependency overrides, CRA Babel proposal plugins, cross-env and the OpenSSL legacy-provider flag.
- Renamed six source files with JSX to .jsx without changing their application code; coverage still includes them.
- Kept GitHub Pages base /AssistantHub/ and output build/. Lighthouse uses Vite preview at that base. CI/deployment verify dev-server security and production asset paths before publishing.
- Development and preview bind loopback, disable CORS and send same-origin CORP. Vite rejects untrusted Host headers and access to .env files. Use npm start; production preview uses npm run preview.
- Removed HTML links to missing favicon.ico and logo192.png rather than retaining broken template assets.

Requires Node 20.19+ or 22.12+ and Vite's modern-browser baseline. Browser support no longer follows CRA Browserslist settings. No application feature redesign was included.

## Per-alert outcome

| Alert | Package | Severity | Current outcome |
| --- | --- | --- | --- |
| [#137](https://github.com/LEO0331/AssistantHub/security/dependabot/137) | node-forge | high | Removed dependency |
| [#129](https://github.com/LEO0331/AssistantHub/security/dependabot/129) | webpack-dev-middleware | high | Removed dependency |
| [#125](https://github.com/LEO0331/AssistantHub/security/dependabot/125) | svgo | high | Removed dependency |
| [#124](https://github.com/LEO0331/AssistantHub/security/dependabot/124) | svgo | medium | Removed dependency |
| [#107](https://github.com/LEO0331/AssistantHub/security/dependabot/107) | postcss | medium | Patched: 8.5.28 |
| [#102](https://github.com/LEO0331/AssistantHub/security/dependabot/102) | postcss | high | Patched: 8.5.28 |
| [#101](https://github.com/LEO0331/AssistantHub/security/dependabot/101) | postcss | high | Patched: 8.5.28 |
| [#99](https://github.com/LEO0331/AssistantHub/security/dependabot/99) | svgo | high | Removed dependency |
| [#96](https://github.com/LEO0331/AssistantHub/security/dependabot/96) | webpack-dev-server | medium | Removed dependency |
| [#95](https://github.com/LEO0331/AssistantHub/security/dependabot/95) | webpack-dev-server | medium | Removed dependency |
| [#84](https://github.com/LEO0331/AssistantHub/security/dependabot/84) | webpack-dev-server | medium | Removed dependency |
| [#82](https://github.com/LEO0331/AssistantHub/security/dependabot/82) | launch-editor | medium | Removed dependency |
| [#81](https://github.com/LEO0331/AssistantHub/security/dependabot/81) | @babel/core | low | Patched: 7.29.7 |
| [#80](https://github.com/LEO0331/AssistantHub/security/dependabot/80) | ws | high | Patched: 8.22.0 |
| [#79](https://github.com/LEO0331/AssistantHub/security/dependabot/79) | ws | high | Patched: 8.22.0 |
| [#77](https://github.com/LEO0331/AssistantHub/security/dependabot/77) | launch-editor | high | Removed dependency |
| [#76](https://github.com/LEO0331/AssistantHub/security/dependabot/76) | serialize-javascript | medium | Removed dependency |
| [#75](https://github.com/LEO0331/AssistantHub/security/dependabot/75) | uuid | medium | Removed dependency |
| [#74](https://github.com/LEO0331/AssistantHub/security/dependabot/74) | @tootallnate/once | low | Removed dependency |
| [#73](https://github.com/LEO0331/AssistantHub/security/dependabot/73) | ws | medium | Patched: 8.22.0 |
| [#72](https://github.com/LEO0331/AssistantHub/security/dependabot/72) | webpack-dev-server | medium | Removed dependency |
| [#71](https://github.com/LEO0331/AssistantHub/security/dependabot/71) | @babel/plugin-transform-modules-systemjs | high | Patched: 7.29.8 |
| [#70](https://github.com/LEO0331/AssistantHub/security/dependabot/70) | postcss | medium | Patched: 8.5.28 |
| [#69](https://github.com/LEO0331/AssistantHub/security/dependabot/69) | follow-redirects | medium | Removed dependency |
| [#63](https://github.com/LEO0331/AssistantHub/security/dependabot/63) | node-forge | high | Removed dependency |
| [#62](https://github.com/LEO0331/AssistantHub/security/dependabot/62) | node-forge | high | Removed dependency |
| [#61](https://github.com/LEO0331/AssistantHub/security/dependabot/61) | node-forge | high | Removed dependency |
| [#60](https://github.com/LEO0331/AssistantHub/security/dependabot/60) | node-forge | high | Removed dependency |
| [#59](https://github.com/LEO0331/AssistantHub/security/dependabot/59) | picomatch | medium | Patched: 4.0.7, 2.3.2 |
| [#58](https://github.com/LEO0331/AssistantHub/security/dependabot/58) | picomatch | high | Patched: 4.0.7, 2.3.2 |
| [#57](https://github.com/LEO0331/AssistantHub/security/dependabot/57) | yaml | medium | Removed dependency |
| [#56](https://github.com/LEO0331/AssistantHub/security/dependabot/56) | yaml | medium | Removed dependency |
| [#53](https://github.com/LEO0331/AssistantHub/security/dependabot/53) | svgo | high | Removed dependency |
| [#52](https://github.com/LEO0331/AssistantHub/security/dependabot/52) | underscore | high | Removed dependency |
| [#51](https://github.com/LEO0331/AssistantHub/security/dependabot/51) | serialize-javascript | high | Removed dependency |
| [#50](https://github.com/LEO0331/AssistantHub/security/dependabot/50) | minimatch | high | Patched: 9.0.9, 10.2.6, 3.1.5 |
| [#49](https://github.com/LEO0331/AssistantHub/security/dependabot/49) | minimatch | high | Patched: 9.0.9, 10.2.6, 3.1.5 |
| [#48](https://github.com/LEO0331/AssistantHub/security/dependabot/48) | minimatch | high | Patched: 9.0.9, 10.2.6, 3.1.5 |
| [#47](https://github.com/LEO0331/AssistantHub/security/dependabot/47) | minimatch | high | Patched: 9.0.9, 10.2.6, 3.1.5 |
| [#46](https://github.com/LEO0331/AssistantHub/security/dependabot/46) | minimatch | high | Patched: 9.0.9, 10.2.6, 3.1.5 |
| [#45](https://github.com/LEO0331/AssistantHub/security/dependabot/45) | minimatch | high | Patched: 9.0.9, 10.2.6, 3.1.5 |
| [#43](https://github.com/LEO0331/AssistantHub/security/dependabot/43) | minimatch | high | Patched: 9.0.9, 10.2.6, 3.1.5 |
| [#42](https://github.com/LEO0331/AssistantHub/security/dependabot/42) | minimatch | high | Patched: 9.0.9, 10.2.6, 3.1.5 |
| [#41](https://github.com/LEO0331/AssistantHub/security/dependabot/41) | minimatch | high | Patched: 9.0.9, 10.2.6, 3.1.5 |
| [#40](https://github.com/LEO0331/AssistantHub/security/dependabot/40) | ajv | medium | Patched: 6.15.0 |
| [#39](https://github.com/LEO0331/AssistantHub/security/dependabot/39) | ajv | medium | Patched: 6.15.0 |
| [#38](https://github.com/LEO0331/AssistantHub/security/dependabot/38) | jsonpath | high | Removed dependency |
| [#36](https://github.com/LEO0331/AssistantHub/security/dependabot/36) | webpack | low | Removed dependency |
| [#35](https://github.com/LEO0331/AssistantHub/security/dependabot/35) | webpack | low | Removed dependency |
| [#34](https://github.com/LEO0331/AssistantHub/security/dependabot/34) | jsonpath | medium | Removed dependency |
| [#31](https://github.com/LEO0331/AssistantHub/security/dependabot/31) | node-forge | high | Removed dependency |
| [#30](https://github.com/LEO0331/AssistantHub/security/dependabot/30) | node-forge | medium | Removed dependency |
| [#29](https://github.com/LEO0331/AssistantHub/security/dependabot/29) | node-forge | high | Removed dependency |
| [#24](https://github.com/LEO0331/AssistantHub/security/dependabot/24) | on-headers | low | Removed dependency |
| [#21](https://github.com/LEO0331/AssistantHub/security/dependabot/21) | webpack-dev-server | medium | Removed dependency |
| [#20](https://github.com/LEO0331/AssistantHub/security/dependabot/20) | webpack-dev-server | medium | Removed dependency |
| [#17](https://github.com/LEO0331/AssistantHub/security/dependabot/17) | @babel/runtime | medium | Patched: 7.29.7 |
| [#16](https://github.com/LEO0331/AssistantHub/security/dependabot/16) | @babel/helpers | medium | Patched: 7.29.7 |
| [#13](https://github.com/LEO0331/AssistantHub/security/dependabot/13) | cross-spawn | high | Patched: 7.0.6 |
| [#4](https://github.com/LEO0331/AssistantHub/security/dependabot/4) | webpack | medium | Removed dependency |
| [#3](https://github.com/LEO0331/AssistantHub/security/dependabot/3) | micromatch | medium | Removed dependency |
| [#2](https://github.com/LEO0331/AssistantHub/security/dependabot/2) | postcss | medium | Patched: 8.5.28 |
| [#1](https://github.com/LEO0331/AssistantHub/security/dependabot/1) | nth-check | high | Removed dependency |

## Verification

- Baseline: 106 tests passed before migration. After migration: all 105 application tests passed across 14 suites with 89.77% line coverage; the one CRA-wrapper-specific test was removed with that wrapper.
- Production build and ESLint passed. No separate typecheck is configured for this JavaScript app.
- Two tooling integration checks cover transformed JSX, host rejection, private-file denial, cross-origin headers, GitHub Pages asset URLs and manifest resolution.
- Browser checks passed in development and production preview: talent rendering/details, lazy chatbot, and Leaflet map dialog; no browser errors observed.
- npm audit reports 0 vulnerabilities. Clean npm ci and GitHub Actions verification accompany delivery.

Vite emits an advisory warning about the existing main bundle exceeding 500 kB. This is a performance follow-up, not a security finding. Future dependency releases can introduce new advisories; zero current audit findings is not a guarantee against undiscovered vulnerabilities.
