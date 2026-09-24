/*
 * Language handling and interface strings.
 *
 * Language order of precedence: ?lang=fr|en in the URL, the visitor's last
 * choice, then the browser language (French browsers get French, others English).
 *
 * Content (bio, project types, descriptions...) is translated in data.js with
 * { en: '...', fr: '...' } values.
 */
(function () {
    const LANGS = ['fr', 'en'];

    const read = () => { try { return localStorage.getItem('ec-lang'); } catch (e) { return null; } };
    const write = (l) => { try { localStorage.setItem('ec-lang', l); } catch (e) { /* storage unavailable */ } };

    const param = new URLSearchParams(location.search).get('lang');
    const stored = read();
    const browser = (navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en';
    const lang = LANGS.includes(param) ? param : LANGS.includes(stored) ? stored : browser;
    if (LANGS.includes(param)) write(param);
    document.documentElement.lang = lang;

    const UI = {
        en: {
            description: 'Ella Couffinhal, director. Fiction, commercials and music videos.',
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
            storiesHeading: 'Stories told {pill} in light and motion',
            basedIn: 'Based in',
            films: 'Films',
            projectsCount: '{n} projects',
            getInTouch: 'Get in touch',
            ctaLine1: "Let's make",
            ctaLine2: 'a <em>film</em> together',
            play: 'Play',
            open: 'Open',
            next: 'Next',
            view: 'View',
            grid: 'Grid',
            list: 'List',
            soundOn: 'Sound on',
            type: 'Type',
            client: 'Client',
            year: 'Year',
            runtime: 'Runtime',
            credits: 'Credits',
            still: 'still',
            nextProject: 'Next project',
            festBlurb: 'Selections, screenings and awards.',
            festEmpty: 'Selections to be announced',
            festMeanwhile: 'Meanwhile, watch the films.',
            officialSelection: 'Official selection',
            contactEyebrow: 'Commissions, collaborations, screenings',
            sayHello: 'Say hello',
            email: 'Email',
            phone: 'Phone',
        },
        fr: {
            description: 'Ella Couffinhal, réalisatrice. Fiction, publicités et clips.',
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
            storiesHeading: 'Raconter des histoires {pill} par l’image et le mouvement',
            basedIn: 'Basée à',
            films: 'Films',
            projectsCount: '{n} projets',
            getInTouch: 'Me contacter',
            ctaLine1: 'Faisons',
            ctaLine2: 'un <em>film</em> ensemble',
            play: 'Lecture',
            open: 'Voir',
            next: 'Suivant',
            view: 'Affichage',
            grid: 'Grille',
            list: 'Liste',
            soundOn: 'Activer le son',
            type: 'Type',
            client: 'Client',
            year: 'Année',
            runtime: 'Durée',
            credits: 'Crédits',
            still: 'photogramme',
            nextProject: 'Projet suivant',
            festBlurb: 'Sélections, projections et prix.',
            festEmpty: 'Sélections à venir',
            festMeanwhile: 'En attendant, regardez les films.',
            officialSelection: 'Sélection officielle',
            contactEyebrow: 'Commandes, collaborations, projections',
            sayHello: 'Écrivez-moi',
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

        set(next) {
            if (!LANGS.includes(next) || next === lang) return;
            write(next);
            const url = new URL(location.href);
            url.searchParams.delete('lang');
            location.replace(url.href);
        },
    };
})();
