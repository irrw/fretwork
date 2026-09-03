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

This repo is configured to automatically deploy to GitHub Pages on every push to `main`. The GitHub Actions workflow in `.github/workflows/deploy.yml` handles building and deploying.

To enable Pages deployments:
1. Go to repo Settings → Pages
2. Source: **GitHub Actions** (not "Deploy from a branch" — the workflow uploads a build artifact directly via `actions/deploy-pages`, there's no `gh-pages` branch involved)
3. Push to `main` (or run the workflow manually) to trigger the first deploy

## Architecture

See `DECISIONS.md` for product decisions, intent, and design rationale.
