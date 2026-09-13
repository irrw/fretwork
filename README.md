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

Then open http://localhost:5173/ in your browser (Vite's default port).

## Building for production

```bash
npm run build
npm run preview  # preview the build locally
```

The output is in the `dist/` folder, ready for deployment.

## Deployment

This repo is connected to [Vercel](https://vercel.com/): it deploys `main` to production on every push and builds a preview URL for every pull request automatically — no workflow config needed on this side.

A separate GitHub Actions workflow (`.github/workflows/ci.yml`) runs `npm run build` on every PR as an independent build check.

## Making changes

`main` is protected — direct pushes are rejected, changes go through a branch + PR:

```bash
git checkout -b your-branch-name
# make changes, commit
git push -u origin your-branch-name
gh pr create
```

Opening the PR triggers two automatic checks: the `ci.yml` build check (must pass before merge is allowed) and a Vercel preview deploy (a live URL for that branch — useful for checking on an actual phone before it's live). Once the build check is green:

```bash
gh pr merge --squash --delete-branch
```

Merging to `main` auto-deploys to production via Vercel within a minute or two — no manual deploy step.

## Architecture

See `DECISIONS.md` for product decisions, intent, and design rationale.
