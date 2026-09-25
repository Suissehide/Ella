# Ella Couffinhal — portfolio

Static site (HTML / CSS / vanilla JS + GSAP), built by `scripts/build.mjs` and served by nginx.
Public address: https://ellacouffinhal.com

## Content

Everything editable lives in `src/js/data.js`: projects, descriptions, credits, years,
home mosaic, festivals, contact details, bio.

The site is bilingual. French is at the root (`/fiction/`), English under `/en/` (`/en/fiction/`).
Translated content is written `{ en: '...', fr: '...' }` in `data.js`; interface strings
(buttons, headings, page titles for search engines) are in `src/js/i18n.js`.

## Build

`src/` holds the templates. `node scripts/build.mjs` writes the deployable site into `dist/`:

- one page per language and per project (`/project/<slug>/`, `/en/project/<slug>/`)
- per page: `<title>`, description, canonical, hreflang, Open Graph / Twitter preview, JSON-LD
  (Person on the home page, VideoObject on project pages, breadcrumbs)
- `sitemap.xml`, `robots.txt`, `404.html`

No dependencies (Node 18+).

## Local

```sh
ln -s ../assets/media src/media        # once: local videos
node scripts/build.mjs --watch         # rebuilds dist/ on every change in src/
npx http-server dist -p 4321 -c-1      # in another terminal
```

## Media

Raw videos go in `assets/projects/` (not committed). Generate web versions:

```sh
./scripts/build-media.sh
```

This writes `assets/media/<slug>/` (`film.mp4`, `preview.mp4`, `poster.jpg`, `still-1..6.jpg`)
and `assets/media/reel.mp4`. Upload them to the public MinIO bucket `ella`:

```sh
aws --profile qwetle --endpoint-url https://s3.qwetle.fr s3 sync assets/media s3://ella --exclude "*.DS_Store"
```

Adding a project: put the video in `assets/projects/`, add a line to `PROJECTS` in the script,
run it, upload, then add the entry in `data.js`.

## Deploy

`deploy/dokploy/docker-compose.dokploy.yml` builds `deploy/app/Dockerfile`: a Node stage runs the
build, then nginx serves `dist/`.

## Search engines

After the first deployment, in Google Search Console (https://search.google.com/search-console):

1. Add a **Domain** property for `ellacouffinhal.com` and verify it with the DNS TXT record it gives.
2. Sitemaps: submit `https://ellacouffinhal.com/sitemap.xml`.
3. URL inspection: request indexing of `https://ellacouffinhal.com/` and `https://ellacouffinhal.com/en/`.

Redirect `www.ellacouffinhal.com` to `ellacouffinhal.com` (301) in the reverse proxy / Dokploy.
