# Fretwork

A mobile-first scale and fingering visualizer for mandolin, guitar, and ukulele.

## Features

- Clean, minimal UI focused on the fretboard itself
- Responsive fretboard scaling (fills available vertical space on tall/desktop viewports; unchanged on mobile)
- Customizable scale list (hide/show modes, preview unavailable scales)
- Box position selection (two-tap anchoring for full width control)
- Diatonic double-stop overlay (thirds and sixths)
- Label mode toggle (note names, scale degrees, finger positions)
- Dark and light themes
- Dismissible onboarding tooltip ("don't show this again")
- Persistent settings (localStorage)

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:5180/fretwork/ in your browser (port is pinned in `vite.config.js`; note the `/fretwork/` base path).

## Building for production

```bash
npm run build
npm run preview  # preview the build locally
```

The output is in the `dist/` folder, ready for deployment.

## Deployment

This repo is set up to deploy via [Vercel](https://vercel.com/): once the GitHub repo is imported as a Vercel project, it deploys `main` to production on every push and builds a preview URL for every pull request automatically — no workflow config needed on this side.

To connect it:
1. [vercel.com/new](https://vercel.com/new) → Import Git Repository → select `irrw/fretwork`
2. Framework preset: **Vite** (should auto-detect). Build command `npm run build`, output directory `dist` (defaults should already match)
3. Deploy — subsequent pushes to `main` and PRs deploy automatically from then on

A separate GitHub Actions workflow (`.github/workflows/ci.yml`) runs `npm run build` on every PR as an independent build check.

## Architecture

See `DECISIONS.md` for product decisions, intent, and design rationale.
