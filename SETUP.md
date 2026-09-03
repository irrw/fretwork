# Fretwork — First-Time Setup

Instructions for converting the React component into a deployable GitHub Pages project. Follow these before the first commit.

> **Note:** kept as-written for history. Actual implementation deviates in two places: `index.html` lives at the project **root**, not `public/` (Vite only processes the HTML entry from root — `public/` is for static assets copied as-is); and the dev server is pinned to **port 5180** (not the default 5173) via `server.port` + `strictPort: true` in `vite.config.js`, to avoid collisions with other local Vite projects. See `README.md` for the current dev URL.

## Folder structure

```
fretwork/
├── src/
│   └── fretwork.jsx
├── public/
│   └── index.html
├── .github/
│   └── workflows/
│       └── deploy.yml
├── package.json
├── vite.config.js
├── DECISIONS.md
├── SETUP.md
├── README.md
└── .gitignore
```

## Files to create

### `package.json`

```json
{
  "name": "fretwork",
  "version": "1.0.0",
  "description": "Mobile-first scale and fingering visualizer for mandolin and other fretted instruments",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}
```

### `vite.config.js`

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/fretwork/',  // Change this if deploying to a different path
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
```

**Note on `base`**: If you're deploying to `username.github.io/fretwork`, keep it as `/fretwork/`. If deploying to a custom domain or the repo root, set `base: '/'` instead.

### `public/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fretwork — Scale Visualizer</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body, #root {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/fretwork.jsx"></script>
</body>
</html>
```

### `src/fretwork.jsx`

Copy the entire `fretwork.jsx` component here (the one from the artifact), but make one change at the very end:

Replace the final closing `}` with:

```javascript
}

// Mount to the DOM
import React from 'react';
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<Fretwork />);
```

This wires the component into the HTML root div.

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

### `.gitignore`

```
node_modules/
dist/
.DS_Store
*.log
.env.local
```

### `README.md`

```markdown
# Fretwork

A mobile-first scale and fingering visualizer for mandolin, guitar, and ukulele.

## Features

- Clean, minimal UI focused on the fretboard itself
- Customizable scale list (hide/show modes, preview unavailable scales)
- Box position selection (two-tap anchoring for full width control)
- Diatonic double-stop overlay (thirds and sixths)
- Label mode toggle (note names, scale degrees, finger positions)
- Dark and light themes
- Persistent settings (localStorage)

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

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
2. Source: Deploy from a branch
3. Branch: gh-pages
4. (GitHub Actions will create this branch automatically on first run)

## Architecture

See `DECISIONS.md` for product decisions, intent, and design rationale.
```

## Setup checklist

Before your first commit:

- [ ] Create the folder structure above
- [ ] Copy `fretwork.jsx` into `src/` and add the React DOM mount code at the end
- [ ] Create all five new files (`package.json`, `vite.config.js`, `public/index.html`, `.github/workflows/deploy.yml`, `.gitignore`, `README.md`)
- [ ] Run locally: `npm install` → `npm run dev` → verify it works at http://localhost:5173
- [ ] Test the build: `npm run build` → check that `dist/` folder is created with output
- [ ] Commit everything except `node_modules/` and `dist/` (handled by `.gitignore`)
- [ ] Push to GitHub `main` branch
- [ ] Go to repo Settings → Pages, enable deployments (GitHub Actions will auto-create the `gh-pages` branch)
- [ ] Check Actions tab to confirm the workflow ran successfully
- [ ] Visit your live site at `https://username.github.io/fretwork`

## Notes

- The `vite.config.js` `base` setting must match your actual deployment URL. If you change the repo name or deploy to a custom domain, update it.
- `package-lock.json` (generated by `npm install`) should be committed; it locks exact dependency versions for reproducible builds.
- The GitHub Actions workflow runs on every push to `main`; to test on a branch before merging, just push there and check the Actions tab — it won't deploy until you merge to `main`.
