# Contributing to Hell Clock Calculator UI

Thanks for your interest in contributing! 🎉  
This project is an open community effort led by **@justjuangui**.

The project is a SvelteKit 5 + TypeScript + TailwindCSS + daisyUI app that loads a TinyGo WASM engine in a Web Worker and renders stats from GamePack JSONs.

---

## Table of contents
- [Code of Conduct](#code-of-conduct)
- [How can I help?](#how-can-i-help)
- [Before you start](#before-you-start)
- [Development setup](#development-setup)
- [Project structure](#project-structure)
- [Running, building, testing](#running-building-testing)
- [Commit style (Conventional Commits)](#commit-style-conventional-commits)
- [DCO (sign your commits)](#dco-sign-your-commits)
- [Branching & Pull Requests](#branching--pull-requests)
- [Style & quality checks](#style--quality-checks)
- [UI/UX & accessibility](#uiux--accessibility)
- [Security issues](#security-issues)
- [Issue triage](#issue-triage)
- [License](#license)

---

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).  
By participating, you agree to uphold it.

---

## How can I help?

- **Bug reports**: Submit a minimal repro with steps, logs, and screenshots if UI-related.
- **Features**: Open an issue to discuss the problem & design before coding.
- **Docs**: Improve README, guides in `docs/`, and inline comments.
- **Refactors**: Small, incremental changes with clear motivation.
- **Accessibility**: ARIA labels, keyboard focus, color contrast fixes.

Check labels like `good first issue` and `help wanted`.

---

## Before you start

1. **Discuss first**: For non-trivial changes, open an Issue or a Discussion.
2. **Keep PRs focused**: One thing per PR. Smaller is faster.
3. **Follow DCO & Conventional Commits** (see below).

---

## Development setup

**Requirements**
- Node **20+**
- npm **10+**

**Install**
```bash
npm ci
```

**Run dev server**
```bash
npm run dev
# App at http://localhost:5173
```

**Build**
```bash
npm run build
```

> ### Static assets & WASM
> Files in `static/` are served from `/` at runtime.  
> So `static/assets/manifest.json` is fetched as **`/assets/manifest.json`** (not `/static/assets/...`).
>
> - Place GamePack JSONs under `static/assets/` (e.g., `hellclock-actor.json`, `player-sheet.json`).
> - Create `static/assets/manifest.json` listing those JSONs (e.g., `"/assets/hellclock-actor.json"`).
> - Place TinyGo runtime & engine in `static/`:
>   - `static/wasm_exec.js`
>   - `static/engine.wasm`
>   - `static/workers/worker.js` (uses `importScripts('/wasm_exec.js')` and fetches `/engine.wasm`).

---

## Project structure

```
static/
  assets/               # static assets (served from /assets/...) GamePack JSONs + manifest.json under static/assets
  wasm_exec.js
  engine.wasm
  workers/engine-worker.js
src/
  lib/
    engine/            # worker wrapper, assets loader, types
    ui/                # shared UI components
  routes/
    +page.svelte       # Calcs page (uses displayedStats + eval/explain)
    ...                # other sections (Gears, Relics, Constellations, Bells, Config)
```

---

## Running, building, testing

Common scripts:

```bash
npm run lint         # ESLint
npm run typecheck    # svelte-check / tsc
npm run build        # SvelteKit production build
# npm test           # (optional) Vitest if/when added
```

Please run `npm run typecheck && npm run lint && npm run build` before opening a PR.

---

## Commit style (Conventional Commits)

Use **Conventional Commits** to make history & releases clear:

```
feat: add displayed stats tabs
fix: worker payload structured clone
docs: contributing guide and getting-started
refactor: extract XNodeTree recursion
perf: memoize eval result parsing
test: add unit tests for getStatFromEval
chore: bump deps and action versions
```

Optionally add scopes: `feat(calcs): add eye explain modal`.

---

## DCO (sign your commits)

We use the **Developer Certificate of Origin (DCO)**.  
**Every commit must be signed off** with `-s`:

```bash
git commit -s -m "feat(calcs): add eye explain modal"
```

If you forgot:
```bash
git commit --amend -s
git push --force-with-lease
```

This adds a line like:
```
Signed-off-by: Your Name <you@example.com>
```

---

## Branching & Pull Requests

- **Fork** the repo, create a branch from `main`:
  - `feat/<short-description>` or `fix/<short-description>`
- Keep PRs small and focused.
- Link related issues in the PR description.
- Include **screenshots** or **GIFs** for UI changes.
- Make sure CI is **green**.

**PR checklist**
- [ ] Discussion/Issue linked (if applicable)
- [ ] `npm run typecheck && npm run lint && npm run build` passed locally
- [ ] Screenshots for UI
- [ ] DCO sign-off on all commits
- [ ] Tests/docs updated when needed

---

## Style & quality checks

- **TypeScript**: Prefer explicit types for public functions/props.
- **Svelte 5 (runes)**:
  - State with `$state`, derived with `$derived`.
  - Avoid leaking runes proxies across worker boundaries; use `structuredClone` before `postMessage`.
- **Accessibility**:
  - Buttons and icons have meaningful `aria-label`s.
  - Ensure keyboard reachability and focus styles.
- **UI**:
  - Use Tailwind + daisyUI components.
  - Keep layouts responsive; use semantic HTML where possible.

---

## Security issues

**Do not** open public issues for vulnerabilities.  
Follow [SECURITY.md](./SECURITY.md) to report privately.

---

## Issue triage

When filing a bug, include:
- **Environment** (OS, browser & version)
- **Steps to reproduce**
- **Expected vs actual**
- **Logs/console output**
- Minimal example if possible

Label suggestions:
- `bug`, `feature`, `docs`, `infra`, `ui`, `performance`, `a11y`, `good first issue`, `help wanted`

---

## License

By contributing, you agree that your contributions are licensed under the project’s license: **Apache-2.0** (see [LICENSE](./LICENSE)).
