#!/usr/bin/env node
/*
 * Builds the deployable site into dist/ from src/.
 *
 * - French pages at the root, English pages under /en/
 * - one static page per project: /project/<slug>/
 * - every page gets its own <title>, description, canonical URL, hreflang
 *   alternates, social preview tags (Open Graph / Twitter) and JSON-LD
 * - the text search engines should read first (titles, bio, project lists)
 *   is written into the HTML; main.js then renders the page as usual
 * - sitemap.xml, robots.txt, 404.html
 *
 * Content and strings come from src/js/data.js and src/js/i18n.js, the same
 * files the browser uses. No dependencies.
 *
 *   node scripts/build.mjs           build once
 *   node scripts/build.mjs --watch   rebuild when src/ changes
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const LANGS = ['fr', 'en'];
const DEFAULT_LANG = 'fr';
const OG_LOCALE = { fr: 'fr_FR', en: 'en_US' };

const esc = (str = '') => String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rich = (str) => esc(str).replace(/\*(.+?)\*/g, '<em>$1</em>');
const localPath = (p, lang) => (lang === DEFAULT_LANG ? p : `/${lang}${p}`);
const lcFirst = (str = '') => str.charAt(0).toLowerCase() + str.slice(1);

/* Runs i18n.js + data.js as the browser would, for one language */
function loadContent(lang) {
    const sandbox = {
        location: { pathname: localPath('/', lang), search: '', hostname: 'build' },
        localStorage: { getItem: () => null, setItem: () => {} },
        navigator: { language: '' },
        URL,
        URLSearchParams,
        console,
        __BUILD__: true,
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    for (const file of ['js/i18n.js', 'js/data.js']) {
        vm.runInContext(fs.readFileSync(path.join(SRC, file), 'utf8'), sandbox, { filename: file });
    }
    return { S: sandbox.SITE, L: sandbox.I18N };
}

/* PT2M19S */
const isoDuration = (sec) => `PT${Math.floor(sec / 60)}M${Math.round(sec % 60)}S`;

/* An Instagram link left at the bare domain is a placeholder, not a profile */
const realProfile = (url) => {
    try { return url && new URL(url).pathname.replace(/\//g, '') ? url : null; } catch { return null; }
};

/* ------------------------------------------------------------------ */

function pagesFor(S) {
    const pages = [
        { key: 'home', template: 'index.html', path: '/' },
        ...Object.entries(S.categories).map(([cat, c]) => ({ key: 'category', cat, template: `${cat}/index.html`, path: c.path })),
        { key: 'festival', template: 'concerts/index.html', path: '/concerts/' },
        { key: 'contact', template: 'contact/index.html', path: '/contact/' },
        ...S.visibleProjects.map((p) => ({ key: 'project', project: p, template: 'project/index.html', path: `/project/${p.slug}/` })),
        // Generic project page: only there to redirect old /project/?p=<slug> links
        { key: 'project-redirect', template: 'project/index.html', path: '/project/', noindex: true },
    ];
    return pages;
}

function seoFor(page, S, L, lang) {
    const t = L.t;
    const url = (p) => S.siteUrl + localPath(p, lang);
    const person = { '@id': `${S.siteUrl}/#ella` };
    const defaultImage = { url: `${S.siteUrl}/assets/og.jpg`, width: 1200, height: 630 };
    const crumbs = (items) => ({
        '@type': 'BreadcrumbList',
        itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url(p) })),
    });

    switch (page.key) {
        case 'home': {
            const titles = S.featured.map(S.bySlug).filter(Boolean).map((p) => p.title).join(', ');
            return {
                title: t('seoHomeTitle'),
                description: t('seoHomeDesc', { titles }),
                image: defaultImage,
                jsonld: {
                    '@context': 'https://schema.org',
                    '@graph': [
                        {
                            '@type': 'Person',
                            ...person,
                            name: S.name,
                            jobTitle: S.role,
                            description: S.about,
                            url: url('/'),
                            image: `${S.siteUrl}/assets/ella.jpg`,
                            email: `mailto:${S.contact.email}`,
                            address: { '@type': 'PostalAddress', addressLocality: S.contact.city, addressCountry: 'FR' },
                            sameAs: [realProfile(S.contact.instagram), realProfile(S.contact.linkedin), realProfile(S.contact.vimeo)].filter(Boolean),
                        },
                        { '@type': 'WebSite', '@id': `${S.siteUrl}/#website`, name: S.name, url: url('/'), inLanguage: lang, publisher: person },
                    ],
                },
            };
        }
        case 'category': {
            const c = S.categories[page.cat];
            const items = S.visibleProjects.filter((p) => p.category === page.cat);
            return {
                title: t('seoCategoryTitle', { label: c.label }),
                description: `${c.blurb} ${items.map((p) => p.title).join(', ')}.`,
                image: items[0] ? { url: S.media(items[0].slug, 'poster.jpg') } : defaultImage,
                jsonld: {
                    '@context': 'https://schema.org',
                    '@graph': [
                        { '@type': 'CollectionPage', name: c.label, url: url(page.path), inLanguage: lang, author: person },
                        {
                            '@type': 'ItemList',
                            itemListElement: items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.title, url: url(`/project/${p.slug}/`) })),
                        },
                        crumbs([[S.name, '/'], [c.label, page.path]]),
                    ],
                },
            };
        }
        case 'project': {
            const p = page.project;
            const c = S.categories[p.category];
            const client = p.client && p.client !== p.title ? ` (${p.client})` : '';
            const description = p.description || t('seoProjectDesc', { title: p.title, type: lcFirst(p.type), client, runtime: p.runtime || '' });
            const video = {
                '@type': 'VideoObject',
                name: p.title,
                description,
                thumbnailUrl: [S.media(p.slug, 'poster.jpg')],
                contentUrl: S.media(p.slug, 'film.mp4'),
                url: url(page.path),
                inLanguage: lang,
                director: person,
                creator: person,
            };
            if (p.duration) video.duration = isoDuration(p.duration);
            if (p.year) video.uploadDate = `${p.year}-01-01`;
            if (p.client) video.sponsor = { '@type': 'Organization', name: p.client };
            return {
                title: t('seoProjectTitle', { title: p.title, type: p.type }),
                description,
                image: { url: S.media(p.slug, 'poster.jpg') },
                ogType: 'video.other',
                jsonld: {
                    '@context': 'https://schema.org',
                    '@graph': [video, crumbs([[S.name, '/'], [c.label, c.path], [p.title, page.path]])],
                },
            };
        }
        case 'festival':
            return { title: t('seoFestivalTitle'), description: t('festBlurb'), image: defaultImage };
        case 'contact':
            return { title: t('seoContactTitle'), description: t('seoContactDesc'), image: defaultImage };
        case 'project-redirect':
            return { title: S.name, description: t('description'), image: defaultImage };
        case 'notfound':
            return { title: `404 — ${S.name}`, description: t('notFound'), image: defaultImage };
        default:
            throw new Error(`No SEO for page ${page.key}`);
    }
}

function headHTML(page, seo, S, lang) {
    const abs = (l) => S.siteUrl + localPath(page.path, l);
    const lines = [
        `<title>${esc(seo.title)}</title>`,
        `<meta name="description" content="${esc(seo.description)}">`,
    ];
    if (page.noindex) {
        lines.push('<meta name="robots" content="noindex">');
    } else {
        lines.push(`<link rel="canonical" href="${abs(lang)}">`);
        for (const l of LANGS) lines.push(`<link rel="alternate" hreflang="${l}" href="${abs(l)}">`);
        lines.push(`<link rel="alternate" hreflang="x-default" href="${abs(DEFAULT_LANG)}">`);
    }
    lines.push(
        `<meta property="og:site_name" content="${esc(S.name)}">`,
        `<meta property="og:type" content="${seo.ogType || 'website'}">`,
        `<meta property="og:title" content="${esc(seo.title)}">`,
        `<meta property="og:description" content="${esc(seo.description)}">`,
        `<meta property="og:url" content="${abs(lang)}">`,
        `<meta property="og:image" content="${esc(seo.image.url)}">`,
    );
    if (seo.image.width) lines.push(`<meta property="og:image:width" content="${seo.image.width}">`, `<meta property="og:image:height" content="${seo.image.height}">`);
    lines.push(`<meta property="og:locale" content="${OG_LOCALE[lang]}">`);
    for (const l of LANGS.filter((l) => l !== lang)) lines.push(`<meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`);
    lines.push(
        '<meta name="twitter:card" content="summary_large_image">',
        `<meta name="twitter:title" content="${esc(seo.title)}">`,
        `<meta name="twitter:description" content="${esc(seo.description)}">`,
        `<meta name="twitter:image" content="${esc(seo.image.url)}">`,
    );
    if (page.key === 'home') lines.push(`<link rel="preload" as="image" href="${esc(S.media('nemesis', 'poster.jpg'))}">`);
    if (seo.jsonld) lines.push(`<script type="application/ld+json">${JSON.stringify(seo.jsonld).replace(/</g, '\\u003c')}</script>`);
    return lines.map((l) => `    ${l}`).join('\n') + '\n';
}

/* Writes the main text into the HTML so it is readable before (and without) JavaScript */
function prefill(html, page, S, L, lang) {
    const t = L.t;
    const link = (p) => localPath(p, lang);
    const fill = (id, content, tag = '[a-z0-9]+') => {
        const re = new RegExp(`(<(${tag})\\b[^>]*\\bid="${id}"[^>]*>)(</\\2>)`);
        return html.replace(re, `$1${content}$3`);
    };

    if (page.key === 'home') {
        html = fill('hero-lead', esc(S.tagline));
        html = fill('hero-title', esc(S.role));
        html = fill('marquee', S.visibleProjects.map((p) => `<a href="${link(`/project/${p.slug}/`)}">${esc(p.title)}</a>`).join(''));
        html = fill('about-heading', rich(t('storiesHeading')));
        html = fill('about-text', esc(S.about));
    }
    if (page.key === 'category') {
        const c = S.categories[page.cat];
        const items = S.visibleProjects.filter((p) => p.category === page.cat);
        html = fill('cat-title', `<span id="cat-name">${esc(c.label)}</span><sup>${items.length}</sup>`);
        html = fill('cat-blurb', esc(c.blurb));
        html = fill('list', items.map((p) => `<li><a href="${link(`/project/${p.slug}/`)}" data-slug="${p.slug}"><span class="list__title">${esc(p.title)}</span></a></li>`).join(''));
    }
    if (page.key === 'project') {
        const p = page.project;
        html = fill('title', esc(p.title));
        if (p.description) html = fill('info', `<p class="info__desc">${esc(p.description)}</p>`);
    }
    if (page.key === 'festival') html = fill('fest-title', esc(t('festival')));
    return html;
}

function renderPage(page, S, L, lang) {
    let html = fs.readFileSync(path.join(SRC, page.template), 'utf8');
    const seo = seoFor(page, S, L, lang);
    html = html.replace(/<html lang="[^"]*">/, `<html lang="${lang}">`);
    const head = /[ \t]*<title>[\s\S]*?<meta property="og:type"[^>]*>\n/;
    if (!head.test(html)) throw new Error(`${page.template}: head block (<title> ... og:type) not found`);
    html = html.replace(head, headHTML(page, seo, S, lang));
    return prefill(html, page, S, L, lang);
}

function sitemap(entries, S) {
    const today = new Date().toISOString().slice(0, 10);
    const urls = entries.map(({ page, image }) => {
        const alts = [...LANGS, 'x-default'].map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${S.siteUrl}${localPath(page.path, l === 'x-default' ? DEFAULT_LANG : l)}"/>`).join('\n');
        return LANGS.map((lang) => [
            '  <url>',
            `    <loc>${S.siteUrl}${localPath(page.path, lang)}</loc>`,
            `    <lastmod>${today}</lastmod>`,
            alts,
            image ? `    <image:image><image:loc>${esc(image)}</image:loc></image:image>` : '',
            '  </url>',
        ].filter(Boolean).join('\n')).join('\n');
    }).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`;
}

/* ------------------------------------------------------------------ */

function copyDir(from, to) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
        if (entry.name === '.DS_Store') continue;
        const a = path.join(from, entry.name);
        const b = path.join(to, entry.name);
        if (entry.isSymbolicLink()) continue; // src/media (local videos) is linked separately
        if (entry.isDirectory()) copyDir(a, b);
        else fs.copyFileSync(a, b);
    }
}

function write(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
}

function build() {
    const started = Date.now();
    fs.rmSync(DIST, { recursive: true, force: true });
    copyDir(SRC, DIST);

    // Local development: keep serving the videos from assets/media
    const mediaLink = path.join(SRC, 'media');
    if (fs.existsSync(mediaLink) && fs.lstatSync(mediaLink).isSymbolicLink()) {
        fs.symlinkSync(fs.realpathSync(mediaLink), path.join(DIST, 'media'));
    }

    let S0;
    let count = 0;
    for (const lang of LANGS) {
        const { S, L } = loadContent(lang);
        S0 = S0 || S;
        for (const page of pagesFor(S)) {
            write(path.join(DIST, localPath(page.path, lang), 'index.html'), renderPage(page, S, L, lang));
            count++;
        }
    }

    // 404: one page for both languages (main.js switches to English under /en/)
    {
        const { S, L } = loadContent(DEFAULT_LANG);
        write(path.join(DIST, '404.html'), renderPage({ key: 'notfound', template: '404.html', path: '/404', noindex: true }, S, L, DEFAULT_LANG));
    }

    const indexed = pagesFor(S0).filter((p) => !p.noindex).map((page) => ({
        page,
        image: page.key === 'project' ? S0.media(page.project.slug, 'poster.jpg') : null,
    }));
    write(path.join(DIST, 'sitemap.xml'), sitemap(indexed, S0));
    write(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${S0.siteUrl}/sitemap.xml\n`);

    console.log(`Built ${count} pages (${LANGS.join(', ')}) + 404, sitemap, robots in ${Date.now() - started} ms`);
}

build();

if (process.argv.includes('--watch')) {
    let timer = null;
    fs.watch(SRC, { recursive: true }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            try { build(); } catch (e) { console.error(e.message); }
        }, 150);
    });
    console.log('Watching src/ ...');
}
