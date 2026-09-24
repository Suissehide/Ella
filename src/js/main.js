/* ==========================================================================
   Ella Couffinhal — site script
   Pages declare themselves with <body data-page="home|category|project|festival|contact">
   ========================================================================== */
(function () {
    const S = window.SITE;
    const L = window.I18N;
    const t = L.t;
    const page = document.body.dataset.page;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover)').matches;
    const hasGsap = typeof gsap !== 'undefined';

    if (hasGsap && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const esc = (str = '') => String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // *word* in a translated string becomes a serif italic accent
    const rich = (str) => esc(str).replace(/\*(.+?)\*/g, '<em>$1</em>');
    // SMPTE-style timecode at 25 fps
    const timecode = (sec = 0) => {
        const f = Math.floor((sec % 1) * 25);
        const s = Math.floor(sec);
        return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60, f].map((n) => String(n).padStart(2, '0')).join(':');
    };
    // '2.35/1' -> '2.35:1', '16/9' -> '16:9'
    const ratioLabel = (r = '16/9') => {
        const [a, b] = r.split('/');
        return b === '1' ? `${Number(a).toFixed(2)}:1` : `${a}:${b}`;
    };
    const projectUrl = (p) => `/project/?p=${encodeURIComponent(p.slug)}`;
    const byCategory = (cat) => S.visibleProjects.filter((p) => p.category === cat);

    const NAV = [
        ...Object.values(S.categories).map((c) => [c.label, c.path]),
        [t('festival'), '/festival/'],
        [t('contact'), '/contact/'],
    ];

    /* Static page text marked with data-i18n="key" */
    function translateStatic() {
        $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
        $$('[data-i18n-label]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
        const desc = $('meta[name="description"]');
        if (desc) desc.content = t('description');
    }

    const langSwitch = () => `
        <div class="lang" role="group" aria-label="${t('language')}">
            ${L.langs.map((l) => `<button type="button" data-lang="${l}" aria-pressed="${l === L.lang}">${l.toUpperCase()}</button>`).join('<span aria-hidden="true">/</span>')}
        </div>`;

    /* ------------------------------------------------------------------
       Chrome: nav, mobile menu, footer, cursor, curtain
       ------------------------------------------------------------------ */

    function renderChrome() {
        const here = location.pathname.replace(/index\.html$/, '');
        const currentCat = page === 'project' ? (S.bySlug(new URLSearchParams(location.search).get('p')) || {}).category : null;
        const isCurrent = (href) => here === href || (currentCat && S.categories[currentCat].path === href);

        document.body.insertAdjacentHTML('afterbegin', `
            <header class="nav">
                <a class="nav__logo scramble" href="/" data-text="${esc(S.name)}">${esc(S.name)}</a>
                <div class="nav__right">
                    <ul class="nav__links">
                        ${NAV.filter(([, href]) => href !== '/contact/').map(([label, href]) => `<li><a class="scramble" href="${href}" data-text="${label}"${isCurrent(href) ? ' aria-current="page"' : ''}>${label}</a></li>`).join('')}
                    </ul>
                    ${langSwitch()}
                    <button class="nav__toggle" type="button" aria-label="${t('menu')}" aria-expanded="false"><span></span><span></span></button>
                </div>
            </header>
            <div class="nav-cta">
                <a class="nav-cta__btn" href="/contact/"${isCurrent('/contact/') ? ' aria-current="page"' : ''}>
                    <i aria-hidden="true"></i><span class="scramble" data-text="${t('contact')}">${t('contact')}</span>
                </a>
            </div>
            <div class="menu" aria-hidden="true">
                <nav>${NAV.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</nav>
                <div class="menu__meta"><a href="mailto:${esc(S.contact.email)}">${esc(S.contact.email)}</a><span>${esc(S.contact.city)}</span></div>
            </div>
            <div class="curtain"><i></i><i></i></div>
        `);

        const footer = document.querySelector('footer[data-footer]');
        if (footer) {
            footer.className = 'footer';
            footer.innerHTML = `
                <a class="footer__cta" href="mailto:${esc(S.contact.email)}">
                    <span class="display line-mask"><span>${t('ctaLine1')}</span></span>
                    <span class="display line-mask"><span>${t('ctaLine2')}</span></span>
                    <span class="footer__mail">${esc(S.contact.email)} <span aria-hidden="true">&#8599;</span></span>
                </a>
                <div class="footer__bottom">
                    <span><span class="footer__fin">Fin.</span>&copy; ${new Date().getFullYear()} ${esc(S.name)}</span>
                    <nav>
                        ${NAV.map(([label, href]) => `<a class="scramble" href="${href}" data-text="${label}">${label}</a>`).join('')}
                        ${S.contact.instagram ? `<a class="scramble" href="${esc(S.contact.instagram)}" target="_blank" rel="noopener" data-text="Instagram">Instagram</a>` : ''}
                    </nav>
                </div>`;
        }

        // The contact pill sits outside the blended nav (so it keeps its colour): reserve its width
        const cta = $('.nav-cta__btn');
        const reserve = () => document.documentElement.style.setProperty('--cta-w', `${cta.offsetWidth}px`);
        reserve();
        if ('ResizeObserver' in window) new ResizeObserver(reserve).observe(cta);

        // The bar only gets its dark background once the page has scrolled
        const nav = $('.nav');
        const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        $$('.lang button').forEach((b) => b.addEventListener('click', () => L.set(b.dataset.lang)));

        const toggle = $('.nav__toggle');
        toggle.addEventListener('click', () => {
            const open = document.body.classList.toggle('menu-open');
            lockScroll(open);
            toggle.setAttribute('aria-expanded', open);
            $('.menu').setAttribute('aria-hidden', !open);
        });
    }

    /* Letter scramble on hover */
    const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#*+/=';
    function scramble(el) {
        const text = el.dataset.text || el.textContent;
        let frame = 0;
        cancelAnimationFrame(el._raf);
        const total = text.length * 2 + 6;
        const tick = () => {
            el.textContent = text.split('').map((ch, i) => {
                if (ch === ' ') return ' ';
                if (frame >= i * 2 + 6) return ch;
                return frame > i * 2 ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : ch;
            }).join('');
            if (++frame <= total) el._raf = requestAnimationFrame(tick);
        };
        tick();
    }
    function bindScramble() {
        if (reduced) return;
        document.addEventListener('mouseover', (e) => {
            const el = e.target.closest('.scramble');
            if (el && !el.contains(e.relatedTarget)) scramble(el);
        });
    }

    /* Accent curtain between internal pages */
    function bindTransitions() {
        const bars = $$('.curtain i');
        if (!hasGsap || reduced) return;
        if (sessionStorage.getItem('ec-curtain')) {
            sessionStorage.removeItem('ec-curtain');
            gsap.set(bars, { scaleY: 1 });
            gsap.to(bars, { scaleY: 0, duration: 0.9, ease: 'expo.inOut', delay: 0.05 });
        }
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a');
            if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
            const url = new URL(a.href, location.href);
            if (url.origin !== location.origin || url.protocol === 'mailto:' || (url.pathname === location.pathname && url.search === location.search)) return;
            e.preventDefault();
            sessionStorage.setItem('ec-curtain', '1');
            gsap.to(bars, { scaleY: 1, duration: 0.6, ease: 'expo.inOut', onComplete: () => { location.href = url.href; } });
        });
        // Coming back through the history cache must not leave the curtain closed
        window.addEventListener('pageshow', (e) => { if (e.persisted) gsap.set(bars, { scaleY: 0 }); });
    }

    /* Smooth wheel scrolling (Lenis), driven by the GSAP ticker so ScrollTrigger stays in sync.
       Touch keeps native scrolling. */
    let lenis = null;
    function smoothScroll() {
        if (!window.Lenis || !hasGsap || reduced) return;
        lenis = new Lenis({ lerp: 0.09, smoothTouch: false });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    }
    const lockScroll = (locked) => {
        if (lenis) (locked ? lenis.stop() : lenis.start());
        document.documentElement.style.overflow = locked ? 'hidden' : '';
    };

    /* ------------------------------------------------------------------
       Tiles with lazy hover previews
       ------------------------------------------------------------------ */

    function tileHTML(p, extraClass = '', meta = true) {
        const cat = S.categories[p.category];
        return `
            <a class="tile ${extraClass}" href="${projectUrl(p)}" data-slug="${p.slug}">
                <div class="tile__media">
                    <img src="${S.media(p.slug, 'poster.jpg')}" alt="${esc(p.title)}" loading="lazy">
                    <video muted loop playsinline preload="none" data-src="${S.media(p.slug, 'preview.mp4')}"></video>
                </div>
                <span class="tile__vf" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
                <span class="tile__hud" aria-hidden="true"><span><b></b><span data-tc>00:00:00:00</span></span><span>${ratioLabel(p.ratio)}</span></span>
                <div class="tile__caption">
                    <h3 class="tile__title">${esc(p.title)}</h3>
                    ${meta ? `<span class="tile__meta"><b>${esc(p.client && p.client !== p.title ? p.client : p.type)}</b>${esc(p.runtime || (cat ? cat.label : ''))}</span>` : ''}
                </div>
            </a>`;
    }

    function playVideo(video) {
        if (!video.src && video.dataset.src) video.src = video.dataset.src;
        const pr = video.play();
        if (pr && pr.catch) pr.catch(() => {});
    }

    function bindTiles(root = document) {
        const tiles = $$('.tile', root);
        const start = (tile) => { const v = $('video', tile); if (!v) return; playVideo(v); tile.classList.add('is-playing'); };
        const stop = (tile) => { const v = $('video', tile); if (!v) return; v.pause(); tile.classList.remove('is-playing'); };

        if (canHover) {
            tiles.forEach((t) => {
                t.addEventListener('mouseenter', () => start(t));
                t.addEventListener('mouseleave', () => stop(t));
            });
        } else {
            // Touch: previews play while the tile sits in the middle of the screen
            const io = new IntersectionObserver((entries) => {
                entries.forEach((en) => (en.isIntersecting ? start(en.target) : stop(en.target)));
            }, { rootMargin: '-30% 0px -30% 0px' });
            tiles.forEach((t) => io.observe(t));
        }
    }

    /* Running timecodes: hero reel and any playing tile preview */
    function runTimecodes() {
        const hero = $('#hero-video');
        const heroTc = $('#hero-tc');
        const tick = () => {
            if (hero && heroTc) heroTc.textContent = timecode(hero.currentTime);
            $$('.tile.is-playing').forEach((tile) => {
                const v = $('video', tile);
                const out = $('[data-tc]', tile);
                if (v && out) out.textContent = timecode(v.currentTime);
            });
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    /* Scale a single-line title so it spans exactly the available width.
       max: pixel cap, or a function returning one (evaluated on resize) */
    function fitWidth(el, max = Infinity) {
        const fit = () => {
            if (getComputedStyle(el).whiteSpace !== 'nowrap') { el.style.fontSize = ''; return; }
            el.style.fontSize = '100px';
            const avail = el.parentElement.clientWidth - parseFloat(getComputedStyle(el.parentElement).paddingLeft) - parseFloat(getComputedStyle(el.parentElement).paddingRight);
            const cap = typeof max === 'function' ? max() : max;
            el.style.fontSize = `${Math.min(cap, Math.floor((100 * avail) / el.scrollWidth * 10) / 10)}px`;
        };
        fit();
        document.fonts && document.fonts.ready.then(fit);
        window.addEventListener('resize', fit);
    }

    /* ------------------------------------------------------------------
       Motion helpers
       ------------------------------------------------------------------ */

    function splitChars(el) {
        el.innerHTML = el.textContent.trim().split(' ').map((word) =>
            `<span class="word line-mask" style="display:inline-block">${word.split('').map((c) => `<span class="char">${c}</span>`).join('')}</span>`
        ).join('<span class="char space">&nbsp;</span>');
        return $$('.char', el);
    }

    function revealLines(root = document) {
        if (!hasGsap || reduced) return;
        $$('.line-mask > span', root).forEach((span) => {
            gsap.from(span, {
                yPercent: 110,
                duration: 1.2,
                ease: 'expo.out',
                scrollTrigger: { trigger: span.parentElement, start: 'top 92%' },
            });
        });
    }

    /* Tiles grow from 0.88 to 1 on entry, then dim as they leave the top */
    function scaleOnScroll(items) {
        if (!hasGsap || reduced) return;
        items.forEach((el) => {
            gsap.fromTo(el, { scale: 0.88, opacity: 0.4 }, {
                scale: 1, opacity: 1, ease: 'none',
                scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 55%', scrub: 0.6 },
            });
            gsap.to($('.tile__media', el) || el, {
                opacity: 0.25, ease: 'none',
                scrollTrigger: { trigger: el, start: 'bottom 35%', end: 'bottom top', scrub: 0.6 },
            });
        });
    }

    /* ------------------------------------------------------------------
       Pages
       ------------------------------------------------------------------ */

    function home() {
        const featured = S.featured.map(S.bySlug).filter(Boolean);
        const counts = Object.fromEntries(Object.keys(S.categories).map((c) => [c, byCategory(c).length]));

        document.title = `${S.name} — ${S.role}`;
        $('#hero-video').src = `${S.mediaBase}/reel.mp4`;
        $('#hero-lead').textContent = S.tagline;
        $('#hero-title').textContent = S.role;

        $('#mosaic').innerHTML = featured.map((p, i) => tileHTML(p, i === 0 || i === 4 ? 'tile--xl' : '')).join('');

        const marqueeItems = S.visibleProjects.map((p) => `<a href="${projectUrl(p)}">${esc(p.title)}</a>`).join('');
        $('#marquee').innerHTML = marqueeItems + marqueeItems;

        $('#about-heading').innerHTML = rich(t('storiesHeading'));
        $('#about-text').textContent = S.about;
        $('#about-portrait img').src = '/assets/ella.jpg';
        $('#about-facts').innerHTML = `
            <div><dt class="eyebrow">${t('basedIn')}</dt><dd>${esc(S.contact.city)}</dd></div>
            <div><dt class="eyebrow">${t('films')}</dt><dd>${t('projectsCount', { n: S.visibleProjects.length })}</dd></div>
            <div><dt class="eyebrow">${t('contact')}</dt><dd><a class="link-arrow" href="/contact/">${t('getInTouch')} &#8599;</a></dd></div>`;

        const slicePick = { commercials: 'charmail', fiction: 'l-ombre-des-champs', 'music-video': 'mandat-de-depot' };
        $('#slices').innerHTML = Object.entries(S.categories).map(([key, c]) => {
            const p = S.bySlug(slicePick[key]) || byCategory(key)[0];
            return `
                <a class="slice" href="${c.path}">
                    ${p ? `<img src="${S.media(p.slug, 'poster.jpg')}" alt="" loading="lazy"><video muted loop playsinline preload="none" data-src="${S.media(p.slug, 'preview.mp4')}"></video>` : ''}
                    <div class="slice__label"><h3 class="display">${c.label}<sup>${counts[key]}</sup></h3><span aria-hidden="true">&#8599;</span></div>
                </a>`;
        }).join('');
        $$('.slice').forEach((s) => {
            const v = $('video', s);
            if (!v) return;
            s.addEventListener('mouseenter', () => { playVideo(v); if (hasGsap) gsap.to($('img', s), { opacity: 0, duration: 0.6 }); });
            s.addEventListener('mouseleave', () => { v.pause(); if (hasGsap) gsap.to($('img', s), { opacity: 1, duration: 0.6 }); });
        });

        bindTiles($('#mosaic'));
        const titleChars = splitChars($('#hero-title'));
        // Full width, but never taller than about half the screen
        fitWidth($('#hero-title'), () => window.innerHeight * 0.52);
        heroIntro(titleChars);

        if (hasGsap && !reduced) {
            scaleOnScroll($$('#mosaic .tile'));
            // The hero stays put (sticky) while the page body slides over it:
            // the reel recedes and darkens, the title drifts up and fades.
            const cover = { trigger: '.page-body', start: 'top bottom', end: 'top top', scrub: true };
            gsap.to('.hero__inner', { yPercent: -30, opacity: 0, ease: 'none', scrollTrigger: cover });
            gsap.to('.hero__video', { scale: 1.08, filter: 'brightness(0.35)', ease: 'none', scrollTrigger: cover });
            gsap.to('.viewfinder', { opacity: 0, ease: 'none', scrollTrigger: { ...cover, end: 'top 40%' } });
            gsap.from('.slice', {
                yPercent: 12, opacity: 0, stagger: 0.1, duration: 1.2, ease: 'expo.out',
                scrollTrigger: { trigger: '#slices', start: 'top 85%' },
            });
        }
    }

    /* Accent intro screen (once per session), then the hero title rises */
    function heroIntro(chars) {
        if (!hasGsap || reduced) return;
        const rise = (delay) => gsap.from(chars, { yPercent: 110, duration: 1.3, stagger: 0.035, ease: 'expo.out', delay });
        const fade = (delay) => gsap.from('.hero__row > *', { opacity: 0, y: 20, duration: 1, stagger: 0.1, ease: 'expo.out', delay });

        if (sessionStorage.getItem('ec-intro')) { rise(0.2); fade(0.5); return; }
        sessionStorage.setItem('ec-intro', '1');
        sessionStorage.removeItem('ec-curtain');

        document.body.insertAdjacentHTML('beforeend', `
            <div class="intro" aria-hidden="true">
                <div class="intro__row"><span>${esc(S.role)} &mdash; ${esc(S.tagline)}</span><span>Roll A001 &nbsp; Sc. 1 &nbsp; Tk. 1</span></div>
                <div>
                    <div class="intro__name display line-mask">${S.name.split('').map((c) => `<span class="char">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
                    <div class="intro__row" style="margin-top:24px"><span class="intro__count">0</span><span>${t('loadingReel')}</span></div>
                </div>
            </div>`);
        const intro = $('.intro');
        fitWidth($('.intro__name'));
        const counter = { v: 0 };
        lockScroll(true);
        gsap.timeline({ onComplete: () => { intro.remove(); lockScroll(false); } })
            .from($$('.intro__name .char'), { yPercent: 110, duration: 1, stagger: 0.04, ease: 'expo.out' })
            .to(counter, { v: 100, duration: 1.4, ease: 'power2.inOut', onUpdate: () => { $('.intro__count').textContent = Math.round(counter.v); } }, 0.1)
            .to($$('.intro__name .char'), { yPercent: -110, duration: 0.7, stagger: 0.02, ease: 'expo.in' }, '+=0.1')
            .to(intro, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=0.3')
            .add(() => { rise(0); fade(0.3); }, '-=0.5');
    }

    function category() {
        const key = document.body.dataset.category;
        const cat = S.categories[key];
        const items = byCategory(key);
        document.title = `${cat.label} — ${S.name}`;
        $('#cat-blurb').textContent = cat.blurb || '';
        $('#cat-title').innerHTML = `<span id="cat-name">${esc(cat.label)}</span><sup>${items.length}</sup>`;

        // Rhythm: wide, half, half... A trailing lone half becomes wide.
        const sizes = items.map((_, i) => (i % 3 === 0 ? 'tile--xl' : ''));
        if (items.length % 3 === 2) sizes[items.length - 1] = 'tile--xl';
        $('#works').innerHTML = items.map((p, i) => tileHTML(p, sizes[i])).join('');

        $('#list').innerHTML = items.map((p) => `
            <li><a href="${projectUrl(p)}" data-slug="${p.slug}">
                <span class="list__title">${esc(p.title)}</span>
                <span class="list__col">${esc(p.client && p.client !== p.title ? p.client : p.type)}</span>
                <span class="list__col">${esc(p.runtime || '')}</span>
                <span class="list__arrow" aria-hidden="true">&#8594;</span>
            </a></li>`).join('');

        bindTiles($('#works'));
        bindListPreview();

        const buttons = $$('.toggle button');
        const setView = (view) => {
            buttons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === view));
            $('#works').hidden = view !== 'grid';
            $('#list').hidden = view !== 'list';
            try { localStorage.setItem('ec-view', view); } catch (e) { /* storage unavailable */ }
            if (hasGsap) ScrollTrigger.refresh();
        };
        buttons.forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
        let saved = 'grid';
        try { saved = localStorage.getItem('ec-view') || 'grid'; } catch (e) { /* storage unavailable */ }
        setView(saved);

        splitChars($('#cat-name'));
        if (hasGsap && !reduced) {
            gsap.from('#cat-title .char', { yPercent: 110, duration: 1.2, stagger: 0.04, ease: 'expo.out', delay: 0.3 });
            scaleOnScroll($$('#works .tile'));
            gsap.from('#list li', { y: 30, opacity: 0, stagger: 0.06, duration: 1, ease: 'expo.out', delay: 0.4 });
        }
    }

    /* List view: a preview follows the cursor */
    function bindListPreview() {
        if (!canHover) return;
        const box = document.createElement('div');
        box.className = 'floating-preview';
        box.innerHTML = '<video muted loop playsinline></video>';
        document.body.appendChild(box);
        const video = $('video', box);
        const xTo = hasGsap ? gsap.quickTo(box, 'x', { duration: 0.6, ease: 'power3' }) : null;
        const yTo = hasGsap ? gsap.quickTo(box, 'y', { duration: 0.6, ease: 'power3' }) : null;

        $$('#list a').forEach((a) => {
            a.addEventListener('mouseenter', () => {
                const src = S.media(a.dataset.slug, 'preview.mp4');
                if (!video.src.endsWith(src)) video.src = src;
                playVideo(video);
                if (hasGsap) gsap.to(box, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
            });
            a.addEventListener('mouseleave', () => {
                video.pause();
                if (hasGsap) gsap.to(box, { opacity: 0, scale: 0.8, duration: 0.4, ease: 'expo.out' });
            });
            a.addEventListener('mousemove', (e) => {
                if (!xTo) return;
                xTo(e.clientX + 24);
                yTo(e.clientY - box.offsetHeight / 2);
            });
        });
    }

    function project() {
        const p = S.bySlug(new URLSearchParams(location.search).get('p'));
        if (!p) { location.replace('/'); return; }
        const cat = S.categories[p.category];
        const portrait = p.ratio === '9/16';
        document.title = `${p.title} — ${S.name}`;

        $('#back').href = cat.path;
        $('#back').innerHTML = `<span aria-hidden="true">&#8592;</span> ${esc(cat.label)}`;
        $('#back').dataset.text = `← ${cat.label}`;
        $('#title').textContent = p.title;

        const player = $('#player');
        player.classList.toggle('player--portrait', portrait);
        $('.project__layout').classList.toggle('project__layout--portrait', portrait);
        player.innerHTML = `
            <video src="${S.media(p.slug, 'film.mp4')}" poster="${S.media(p.slug, 'poster.jpg')}" autoplay muted playsinline controls preload="auto"></video>
            <button class="player__sound" type="button"><i><b></b><b></b><b></b></i> ${t('soundOn')}</button>`;
        const video = $('video', player);
        const sound = $('.player__sound', player);
        sound.addEventListener('click', () => {
            video.muted = false;
            if (video.currentTime > 4) video.currentTime = 0;
            playVideo(video);
            sound.hidden = true;
        });
        video.addEventListener('volumechange', () => { sound.hidden = !video.muted; });

        const rows = [
            [t('type'), p.type],
            [t('client'), p.client && p.client !== p.title ? p.client : ''],
            [t('year'), p.year],
            [t('runtime'), p.runtime],
            [t('format'), ratioLabel(p.ratio)],
        ].filter(([, v]) => v);
        $('#info').innerHTML = `
            ${p.description ? `<p class="info__desc">${esc(p.description)}</p>` : ''}
            <dl>${rows.map(([k, v]) => `<dt class="eyebrow">${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
            ${p.credits && p.credits.length ? `<div class="info__credits"><span class="eyebrow">${t('credits')}</span><ul>${p.credits.map(([r, n]) => `<li><span>${esc(r)}</span><span>${esc(n)}</span></li>`).join('')}</ul></div>` : ''}`;

        const stills = $('#stills');
        stills.classList.toggle('stills--portrait', portrait);
        // Stills are taken at these fractions of the film (see scripts/build-media.sh)
        const STILL_AT = [0.14, 0.28, 0.42, 0.56, 0.70, 0.84];
        stills.innerHTML = STILL_AT.map((_, i) => `
            <figure>
                <img src="${S.media(p.slug, `still-${i + 1}.jpg`)}" alt="${esc(p.title)} — ${t('still')} ${i + 1}" loading="lazy">
                <figcaption><span>A001 &middot; ${String(i + 1).padStart(2, '0')}</span><span data-still-tc></span></figcaption>
            </figure>`).join('');
        const stampStills = (duration) => {
            if (!duration || !isFinite(duration)) return;
            $$('[data-still-tc]', stills).forEach((el, i) => { el.textContent = timecode(duration * STILL_AT[i]); });
        };
        stampStills(p.duration);
        video.addEventListener('loadedmetadata', () => stampStills(video.duration));

        const list = S.visibleProjects;
        const next = list[(list.indexOf(p) + 1) % list.length];
        const nextEl = $('#next');
        nextEl.href = projectUrl(next);
        nextEl.dataset.slug = next.slug;
        nextEl.innerHTML = `
            <div class="tile__media">
                <img src="${S.media(next.slug, 'poster.jpg')}" alt="" loading="lazy">
                <video muted loop playsinline preload="none" data-src="${S.media(next.slug, 'preview.mp4')}"></video>
            </div>
            <div class="next__label"><span class="eyebrow">${t('nextProject')}</span><span class="display">${esc(next.title)}</span></div>`;
        nextEl.classList.add('tile');
        bindTiles(nextEl.parentElement);

        const titleChars = splitChars($('#title'));
        if (hasGsap && !reduced) {
            gsap.from(titleChars, { yPercent: 110, duration: 1.2, stagger: 0.03, ease: 'expo.out', delay: 0.25 });
            gsap.from(['#player', '#info'], { y: 40, opacity: 0, duration: 1.2, stagger: 0.12, ease: 'expo.out', delay: 0.45 });
            $$('#stills figure').forEach((f) => {
                gsap.from(f, { scale: 0.9, opacity: 0, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'top 65%', scrub: 0.6 } });
            });
        }
    }

    function festival() {
        const list = S.festivals || [];
        document.title = `${t('festival')} — ${S.name}`;
        $('#fest-title').textContent = t('festival');
        const title = splitChars($('#fest-title'));
        if (list.length) {
            $('#fest').innerHTML = `<ul class="fest">${list.map((f) => {
                const film = S.bySlug(f.film);
                return `<li>
                    <span class="eyebrow">${esc(f.year || '')}</span>
                    <span class="fest__name">${esc(f.festival)}${f.city ? `<span class="eyebrow" style="display:block;margin-top:8px">${esc(f.city)}</span>` : ''}</span>
                    <span class="fest__film">${film ? `<a href="${projectUrl(film)}">${esc(film.title)}</a>` : esc(f.film || '')}</span>
                    <span class="fest__award">${esc(f.award || t('officialSelection'))}</span>
                </li>`;
            }).join('')}</ul>`;
        } else {
            $('#fest').innerHTML = `
                <div class="empty">
                    <div>
                        <p class="display">${t('festEmpty')}</p>
                        <p>${t('festMeanwhile')}</p>
                        <p style="margin-top:28px"><a class="link-arrow" href="/fiction/">Fiction &#8594;</a></p>
                    </div>
                </div>`;
        }
        if (hasGsap && !reduced) {
            gsap.from(title, { yPercent: 110, duration: 1.2, stagger: 0.04, ease: 'expo.out', delay: 0.3 });
            gsap.from('#fest li, #fest .empty', { y: 30, opacity: 0, stagger: 0.06, duration: 1, ease: 'expo.out', delay: 0.5 });
        }
    }

    function contact() {
        const c = S.contact;
        document.title = `${t('contact')} — ${S.name}`;
        $('#contact-video').src = `${S.mediaBase}/reel.mp4`;

        const pill = S.bySlug('le-caprice') || S.visibleProjects[0];
        $('#contact-title').innerHTML = `<span class="line-mask"><span>${esc(t('sayHello')).replace('{pill}',
            `<span class="pill"><video src="${S.media(pill.slug, 'preview.mp4')}" autoplay muted loop playsinline></video></span>`)}</span></span>`;

        const mail = $('#contact-mail');
        mail.href = `mailto:${c.email}`;
        mail.textContent = c.email;
        fitWidth(mail, 150);

        const copy = $('#contact-copy');
        if (navigator.clipboard) {
            copy.textContent = t('copyEmail');
            copy.addEventListener('click', () => {
                navigator.clipboard.writeText(c.email).then(() => {
                    copy.textContent = t('copied');
                    copy.classList.add('is-done');
                    clearTimeout(copy._t);
                    copy._t = setTimeout(() => { copy.textContent = t('copyEmail'); copy.classList.remove('is-done'); }, 2000);
                });
            });
        } else {
            copy.remove();
        }

        const row = (label, value, href, external) => href
            ? `<li><a class="contact__row" href="${esc(href)}"${external ? ' target="_blank" rel="noopener"' : ''}><span class="eyebrow">${label}</span><span class="contact__val">${value}</span><span class="contact__arrow" aria-hidden="true">&#8599;</span></a></li>`
            : `<li><div class="contact__row"><span class="eyebrow">${label}</span><span class="contact__val">${value}</span></div></li>`;
        $('#contact-rows').innerHTML = [
            c.instagram && row('Instagram', esc(c.instagramHandle || 'Instagram'), c.instagram, true),
            c.vimeo && row('Vimeo', 'Vimeo', c.vimeo, true),
            c.phone && row(t('phone'), esc(c.phone), `tel:${c.phone.replace(/\s/g, '')}`),
            row(t('basedIn'), `${esc(c.city)} <time class="contact__clock" id="contact-clock"></time>`),
        ].filter(Boolean).join('');

        // Local time in Paris, so visitors abroad know when to expect an answer
        const clock = $('#contact-clock');
        const fmt = new Intl.DateTimeFormat(L.lang, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris', timeZoneName: 'short' });
        const tick = () => { clock.textContent = fmt.format(new Date()); };
        tick();
        setInterval(tick, 15000);

        if (hasGsap && !reduced) {
            gsap.from('.contact__bg video', { scale: 1.15, duration: 2.4, ease: 'expo.out' });
            gsap.from('.contact .line-mask > span', { yPercent: 110, duration: 1.2, stagger: 0.08, ease: 'expo.out', delay: 0.3 });
            gsap.from('#contact-mail', { yPercent: 110, duration: 1.2, ease: 'expo.out', delay: 0.45 });
            gsap.from('.contact__title .pill', { width: 0, marginInline: 0, duration: 1.2, ease: 'expo.inOut', delay: 0.7 });
            gsap.from('.contact__copy', { opacity: 0, y: 12, duration: 1, ease: 'expo.out', delay: 0.8 });
            gsap.from('.contact__rows li', { yPercent: 100, opacity: 0, stagger: 0.08, duration: 1, ease: 'expo.out', delay: 0.7 });
        }
    }

    /* ------------------------------------------------------------------ */

    translateStatic();
    renderChrome();
    bindScramble();
    bindTransitions();
    smoothScroll();
    runTimecodes();

    ({ home, category, project, festival, contact })[page]?.();

    revealLines($('footer') || document.createElement('div'));
    if (page === 'home') revealLines($('#about'));
})();
