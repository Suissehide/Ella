/*
 * Language handling and interface strings.
 *
 * The language is part of the URL, so each version can be indexed on its own:
 * French at the root (/fiction/), English under /en/ (/en/fiction/).
 * A visitor who picked a language with the switch is sent back to it on the
 * next visit; nobody is redirected on the browser language alone (search
 * engine crawlers would then only ever see one version).
 *
 * Content (bio, project types, descriptions...) is translated in data.js with
 * { en: '...', fr: '...' } values. This file is also loaded by scripts/build.mjs
 * to write each page's title and description.
 */
(function () {
    const LANGS = ['fr', 'en'];
    const DEFAULT = 'fr';

    const read = () => { try { return localStorage.getItem('ec-lang'); } catch (e) { return null; } };
    const write = (l) => { try { localStorage.setItem('ec-lang', l); } catch (e) { /* storage unavailable */ } };

    // '/en/fiction/' -> ['en', '/fiction/']
    const split = (pathname) => {
        const m = pathname.match(/^\/(en)(\/.*|$)/);
        return m ? [m[1], m[2] || '/'] : [DEFAULT, pathname];
    };
    // Path of the same page in another language
    const localized = (path, l) => {
        const [, base] = split(path);
        return l === DEFAULT ? base : `/${l}${base}`;
    };

    const [lang, basePath] = split(location.pathname);

    // Old ?lang= links, or a language chosen earlier with the switch
    if (typeof window !== 'undefined' && window.document && !window.__BUILD__) {
        const param = new URLSearchParams(location.search).get('lang');
        const wanted = LANGS.includes(param) ? param : read();
        if (LANGS.includes(param)) write(param);
        if (LANGS.includes(wanted) && wanted !== lang) {
            const url = new URL(location.href);
            url.searchParams.delete('lang');
            url.pathname = localized(basePath, wanted);
            location.replace(url.href);
        }
        document.documentElement.lang = lang;
    }

    const UI = {
        en: {
            description: 'Ella Couffinhal, director. Fiction, commercials and music videos.',
            seoHomeTitle: 'Ella Couffinhal — Director | Fiction, commercials & music videos',
            seoHomeDesc: 'Ella Couffinhal is a director of short films, commercials and music videos based in Paris and Bordeaux: {titles}.',
            seoCategoryTitle: '{label} — Ella Couffinhal, director',
            seoProjectTitle: '{title} — {type} directed by Ella Couffinhal',
            seoProjectDesc: '{title}, {type} directed by Ella Couffinhal{client}. Runtime {runtime}. Watch the film.',
            seoFestivalTitle: 'Festivals — Ella Couffinhal, director',
            seoContactTitle: 'Contact — Ella Couffinhal, director',
            seoContactDesc: 'Get in touch with Ella Couffinhal, director based in Paris and Bordeaux, for a film, a commercial or a music video.',
            notFound: 'This page does not exist.',
            backHome: 'Back to the home page',
            festival: 'Festival',
            contact: 'Contact',
            language: 'Language',
            menu: 'Menu',
            scroll: 'Scroll',
            loadingReel: 'Loading the reel',
            selectedWork: 'Selected work',
            allFilms: 'All films',
            allProjects: 'All projects',
            explore: 'Explore',
            storiesHeading: 'I tell stories through *light* and *motion*',
            basedIn: 'Based in',
            films: 'Films',
            projectsCount: '{n} projects',
            getInTouch: 'Get in touch',
            ctaLine1: "Let's make",
            ctaLine2: 'a <em>film</em> together',
            view: 'View',
            grid: 'Grid',
            list: 'List',
            soundOn: 'Sound on',
            type: 'Type',
            client: 'Client',
            year: 'Year',
            runtime: 'Runtime',
            format: 'Format',
            credits: 'Credits',
            still: 'still',
            nextProject: 'Next project',
            festBlurb: 'Where my films have been selected, screened and awarded.',
            festEmpty: 'Selections to be announced',
            festMeanwhile: 'Meanwhile, watch my films.',
            officialSelection: 'Official selection',
            contactEyebrow: 'Shooting, editing, post-production',
            sayHello: 'Say hello',
            copyEmail: 'Copy address',
            copied: 'Copied',
            email: 'Email',
            phone: 'Phone',
        },
        fr: {
            description: 'Ella Couffinhal, réalisatrice. Fiction, publicités et clips.',
            seoHomeTitle: 'Ella Couffinhal — Réalisatrice | Fiction, publicités & clips',
            seoHomeDesc: 'Ella Couffinhal, réalisatrice basée à Paris et Bordeaux : courts métrages, publicités et clips. {titles}.',
            seoCategoryTitle: '{label} — Ella Couffinhal, réalisatrice',
            seoProjectTitle: '{title} — {type} d’Ella Couffinhal',
            seoProjectDesc: '{title}, {type} d’Ella Couffinhal, réalisatrice{client}. Durée {runtime}. Voir le film.',
            seoFestivalTitle: 'Festivals — Ella Couffinhal, réalisatrice',
            seoContactTitle: 'Contact — Ella Couffinhal, réalisatrice',
            seoContactDesc: 'Contacter Ella Couffinhal, réalisatrice basée à Paris et Bordeaux, pour une fiction, une publicité ou un clip.',
            notFound: 'Cette page n’existe pas.',
            backHome: 'Retour à l’accueil',
            festival: 'Festivals',
            contact: 'Contact',
            language: 'Langue',
            menu: 'Menu',
            scroll: 'Défiler',
            loadingReel: 'Chargement du showreel',
            selectedWork: 'Sélection',
            allFilms: 'Tous les films',
            allProjects: 'Tous les projets',
            explore: 'Explorer',
            storiesHeading: 'Je raconte des histoires par *l’image* et le *mouvement*',
            basedIn: 'Basée à',
            films: 'Films',
            projectsCount: '{n} projets',
            getInTouch: 'Me contacter',
            ctaLine1: 'Faisons',
            ctaLine2: 'un <em>film</em> ensemble',
            view: 'Affichage',
            grid: 'Grille',
            list: 'Liste',
            soundOn: 'Activer le son',
            type: 'Type',
            client: 'Client',
            year: 'Année',
            runtime: 'Durée',
            format: 'Format',
            credits: 'Crédits',
            still: 'photogramme',
            nextProject: 'Projet suivant',
            festBlurb: 'Les festivals où mes films ont été sélectionnés, projetés et primés.',
            festEmpty: 'Sélections à venir',
            festMeanwhile: 'En attendant, regardez mes films.',
            officialSelection: 'Sélection officielle',
            contactEyebrow: 'Tournage, montage, post-production',
            sayHello: 'Écrivez-moi',
            copyEmail: 'Copier l’adresse',
            copied: 'Copiée',
            email: 'Email',
            phone: 'Téléphone',
        },
    };

    window.I18N = {
        lang,
        langs: LANGS,

        /* Interface string, with optional {placeholders} */
        t(key, vars = {}) {
            const str = UI[lang][key] ?? UI.en[key] ?? key;
            return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
        },

        /* Resolves every { en, fr } value in a content tree to the current language */
        localize(value) {
            if (Array.isArray(value)) return value.map((v) => I18N.localize(v));
            if (value && typeof value === 'object') {
                if ('en' in value || 'fr' in value) return value[lang] || value.en || value.fr || '';
                return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, I18N.localize(v)]));
            }
            return value;
        },

        /* Internal link in the current language: path('/fiction/') -> '/en/fiction/' */
        path: (p) => localized(p, lang),
        /* URL of the current page in another language */
        switchUrl: (l) => {
            const q = new URLSearchParams(location.search);
            q.delete('lang');
            return localized(basePath, l) + (q.toString() ? `?${q}` : '');
        },
        remember: write,
    };
})();
