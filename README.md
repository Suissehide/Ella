# Ella Couffinhal — portfolio

Static site (HTML / CSS / vanilla JS + GSAP), served by nginx.

## Content

Everything editable lives in `src/js/data.js`: projects, descriptions, credits,
home mosaic, festivals, contact details, bio.

The site is bilingual (FR / EN). Translated content is written `{ en: '...', fr: '...' }`
in `data.js`; interface strings (buttons, headings) are in `src/js/i18n.js`.
The language comes from `?lang=fr|en`, then the visitor's last choice, then the browser language.

## Media

Raw videos go in `assets/projects/` (not committed). Generate web versions:

```sh
./scripts/build-media.sh
```

This writes `assets/media/<slug>/` (`film.mp4`, `preview.mp4`, `poster.jpg`, `still-1..6.jpg`)
and `assets/media/reel.mp4`. Upload the content of `assets/media/` to the MinIO bucket `ella`
(public read), e.g. `mc mirror assets/media myminio/ella`, then set `mediaBase` in `src/js/data.js`.

The bucket needs a CORS rule allowing GET from the site domain only if videos are fetched with
JavaScript; plain `<video src>` tags work without it.

Adding a project: put the video in `assets/projects/`, add a line to `PROJECTS` in the script,
run it, then add the entry in `data.js`.

## Local

```sh
ln -s ../assets/media src/media   # once
npx http-server src -p 4321 -c-1
```

## Deploy

`deploy/dokploy/docker-compose.dokploy.yml` builds `deploy/app/Dockerfile` (nginx:alpine + `src/`).
