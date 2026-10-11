# Repclub

A playful, installable workout tracker for Android, with a charcoal, cream, yellow, and cyan interface. Workouts, PRs, plans, body weight, and in-progress sessions stay on the device. There is no backend database, analytics, cloud sync, or remote AI.

## Use it on Android

1. Open the hosted site in Chrome. A private deployment may ask you to sign in to its owner account.
2. Tap **Install app** or Chrome’s menu → **Install and create shortcut → Install**. Some Chrome versions show **Add to Home screen → Install**.
3. Keep the page online until the top indicator says **Ready offline**. It downloads the app, instructions, fonts, and all 327 available reference images.
4. Launch Repclub from the home screen. Workout logging, PRs, the exercise library, and charts work without internet after preparation completes.

The first download and app updates use the network. Personal training data is never included in requests. Export a JSON backup under **Preferences** to keep a separate copy. Clearing browser storage or uninstalling can remove local data.

## What is included

- 897 exercises: a curated core plus an attributed wger community snapshot.
- 327 locally bundled reference images covering 240 source entries. Exercises without a source image are clearly marked.
- Search by name, equipment, or muscle, plus body-part, equipment, and illustrated-entry filters.
- In-session image and technique previews.
- Load + reps, bodyweight reps, and timed activity logging.
- Separate records for maximum load, most bodyweight reps, and longest duration. Weighted volume excludes bodyweight reps and timed seconds.
- Upper-body, lower-body, full-body, and bodyweight routine templates.
- Weekly plan, training calendar, local backups, and sample history for exploration.
- Installable manifest, app icons, service worker, complete-download status, retryable image preparation, and mobile bottom navigation.

## Run locally

Requires Node.js 18 or newer. No npm installation is needed:

```sh
node scripts/serve.mjs
```

Open the localhost address printed by the server. Use an HTTPS static host to install on a separate Android phone. Deploy the contents of `dist/`; relative manifest paths also support a project subdirectory. The hosted version uses the existing Sites project. GitHub source publishing is separate from site deployment.

## Deploy on Vercel

Import `manavnainkwal51/repclub` and deploy the `main` branch. Keep the **Root Directory** at the repository root (empty in Vercel settings), not `dist`. The included `vercel.json` selects **Other** (no framework), skips installation and building, and serves the already-bundled `dist` directory.

If an earlier deployment shows `404 NOT_FOUND`, check **Settings → Build and Deployment**: Root Directory should be empty, Framework Preset **Other**, Output Directory **dist**, and Build Command empty. Deploy the latest `main` commit, then open that deployment's URL from Vercel's **Visit** button. An obsolete or deleted deployment URL can also return a 404.

No environment variables, database, or API keys are required. Hosting downloads public app assets; workout data remains local to the browser/device.

## Checks

```sh
node --check dist/app.js
node --check dist/install.js
node --check dist/sw.js
node tests/check-app.cjs
node tests/check-offline.cjs
node tests/check-install.cjs
```

The checks exercise workout resumption, completion, PRs, deletion, input validation, empty states, backups, catalog filters, bodyweight and timed units, service-worker caching, retries, offline navigation, and attribution completeness. Android-device installation and visual browser QA have not been performed in the build environment.

## Dataset and images

The source is [wger](https://wger.de/), a community-maintained exercise database. It is not a claim of clinical verification. Data is downloaded at build time, normalized from English entries with meaningful descriptions, and bundled. No live exercise API is called by the app.

Per-entry authors, source links, image sources, and Creative Commons licences are available in each exercise and in `dist/exercise-sources.json`. Image files are resized and converted to WebP, with that modification documented in the credits. See `THIRD_PARTY_NOTICES.md`. Entries without a source image do not receive invented technique diagrams.

To refresh the snapshot, install the build-time Python packages `pillow` and `fonttools`, then run:

```sh
python scripts/import-wger.py
python scripts/import-fonts.py
python scripts/update-image-manifest.py
```

Refreshes require internet at build time. When assets change, change the service-worker cache version before deploying. Confirm the catalog, source IDs used in templates, asset counts, attribution, and checks after a dataset refresh.

## Storage and source privacy

The `repclub-v1` local-storage entry contains training data. It is not part of this repository, uploaded to the deployment, or transmitted by the app. Cache Storage holds only public application assets and reference material. JSON backups are local downloads; restoring one replaces the current local history after confirmation. Source snapshots contain reference data and credits, not personal workouts.

The starter history is generated sample data. Choose **Preferences → Start fresh** to begin your own tracking. Existing on-device records are preserved when this app update is installed.
