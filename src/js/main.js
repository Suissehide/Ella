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
                        ${NAV.map(([label, href]) => `<li><a class="scramble" href="${href}" data-text="${label}"${isCurrent(href) ? ' aria-current="page"' : ''}>${label}</a></li>`).join('')}
                    </ul>
                    ${langSwitch()}
                    <button class="nav__toggle" type="button" aria-label="${t('menu')}" aria-expanded="false"><span></span><span></span></button>
                </div>
            </header>
            <div class="menu" aria-hidden="true">
                <nav>${NAV.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</nav>
                <div class="menu__meta"><a href="mailto:${esc(S.contact.email)}">${esc(S.contact.email)}</a><span>${esc(S.contact.city)}</span></div>
            </div>
            <div class="curtain"></div>
            <div class="cursor"><span>${t('play')}</span></div>
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
                    <span>&copy; ${new Date().getFullYear()} ${esc(S.name)}</span>
                    <nav>
                        ${NAV.map(([label, href]) => `<a class="scramble" href="${href}" data-text="${label}">${label}</a>`).join('')}
                        ${S.contact.instagram ? `<a class="scramble" href="${esc(S.contact.instagram)}" target="_blank" rel="noopener" data-text="Instagram">Instagram</a>` : ''}
                    </nav>
                </div>`;
        }

        $$('.lang button').forEach((b) => b.addEventListener('click', () => L.set(b.dataset.lang)));

        const toggle = $('.nav__toggle');
        toggle.addEventListener('click', () => {
            const open = document.body.classList.toggle('menu-open');
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
        const curtain = $('.curtain');
        if (!hasGsap || reduced) return;
        if (sessionStorage.getItem('ec-curtain')) {
            sessionStorage.removeItem('ec-curtain');
            gsap.set(curtain, { scaleY: 1, transformOrigin: 'top' });
            gsap.to(curtain, { scaleY: 0, duration: 0.8, ease: 'expo.inOut', delay: 0.05 });
        }
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a');
            if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
            const url = new URL(a.href, location.href);
            if (url.origin !== location.origin || url.protocol === 'mailto:' || (url.pathname === location.pathname && url.search === location.search)) return;
            e.preventDefault();
            sessionStorage.setItem('ec-curtain', '1');
            gsap.set(curtain, { transformOrigin: 'bottom' });
            gsap.to(curtain, { scaleY: 1, duration: 0.6, ease: 'expo.inOut', onComplete: () => { location.href = url.href; } });
        });
        // Coming back through the history cache must not leave the curtain closed
        window.addEventListener('pageshow', (e) => { if (e.persisted) gsap.set(curtain, { scaleY: 0 }); });
    }

    /* Accent disc following the cursor over playable things */
    function bindCursor() {
        if (!canHover || !hasGsap) return;
        const cursor = $('.cursor');
        const label = $('span', cursor);
        const xTo = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3' });
        const yTo = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3' });
        window.addEventListener('mousemove', (e) => { xTo(e.clientX); yTo(e.clientY); });
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-cursor]');
            if (target) label.textContent = target.dataset.cursor;
            gsap.to(cursor, { scale: target ? 1 : 0, duration: 0.5, ease: 'expo.out', overwrite: 'auto' });
        });
    }

    /* ------------------------------------------------------------------
       Tiles with lazy hover previews
       ------------------------------------------------------------------ */

    function tileHTML(p, extraClass = '', meta = true) {
        const cat = S.categories[p.category];
        return `
            <a class="tile ${extraClass}" href="${projectUrl(p)}" data-slug="${p.slug}" data-cursor="${t('play')}">
                <div class="tile__media">
                    <img src="${S.media(p.slug, 'poster.jpg')}" alt="${esc(p.title)}" loading="lazy">
                    <video muted loop playsinline preload="none" data-src="${S.media(p.slug, 'preview.mp4')}"></video>
                </div>
                <div class="tile__caption">
                    <h3 class="tile__title">${esc(p.title)}</h3>
                    ${meta ? `<span class="tile__meta"><b>${esc(p.client && p.client !== p.title ? p.client : p.type)}</b>${esc(cat ? cat.label : '')}</span>` : ''}
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

    /* Scale a single-line title so it spans exactly the available width */
    function fitWidth(el, max = Infinity) {
        const fit = () => {
            if (getComputedStyle(el).whiteSpace !== 'nowrap') { el.style.fontSize = ''; return; }
            el.style.fontSize = '100px';
            const avail = el.parentElement.clientWidth - parseFloat(getComputedStyle(el.parentElement).paddingLeft) - parseFloat(getComputedStyle(el.parentElement).paddingRight);
            el.style.fontSize = `${Math.min(max, Math.floor((100 * avail) / el.scrollWidth * 10) / 10)}px`;
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
        $('#hero-lead').innerHTML = `${esc(S.role)} <span>&mdash;</span> ${esc(S.tagline)}`;

        $('#mosaic').innerHTML = featured.map((p, i) => tileHTML(p, i === 0 || i === 4 ? 'tile--xl' : '')).join('');

        const marqueeItems = S.visibleProjects.map((p) => `<a href="${projectUrl(p)}">${esc(p.title)}</a>`).join('');
        $('#marquee').innerHTML = marqueeItems + marqueeItems;

        const pill = S.bySlug('remanence') || S.visibleProjects[0];
        $('#about-heading').innerHTML = esc(t('storiesHeading')).replace('{pill}', `<span class="pill"><video src="${S.media(pill.slug, 'preview.mp4')}" autoplay muted loop playsinline></video></span>`);
        $('#about-text').innerHTML = S.about.split(' ').map((w) => `<span class="w">${esc(w)}</span>`).join(' ');
        const portrait = $('#about-portrait img');
        portrait.src = '/assets/ella.jpg';
        portrait.onerror = () => { portrait.onerror = null; portrait.src = S.media('remanence', 'still-3.jpg'); };
        $('#about-facts').innerHTML = `
            <div><dt class="eyebrow">${t('basedIn')}</dt><dd>${esc(S.contact.city)}</dd></div>
            <div><dt class="eyebrow">${t('films')}</dt><dd>${t('projectsCount', { n: S.visibleProjects.length })}</dd></div>
            <div><dt class="eyebrow">${t('contact')}</dt><dd><a class="link-arrow" href="/contact/">${t('getInTouch')} &#8599;</a></dd></div>`;

        const slicePick = { commercials: 'charmail', fiction: 'l-ombre-des-champs', 'music-video': 'mandat-de-depot' };
        $('#slices').innerHTML = Object.entries(S.categories).map(([key, c]) => {
            const p = S.bySlug(slicePick[key]) || byCategory(key)[0];
            return `
                <a class="slice" href="${c.path}" data-cursor="${t('open')}">
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
        fitWidth($('#hero-title'));
        heroIntro(titleChars);

        if (hasGsap && !reduced) {
            scaleOnScroll($$('#mosaic .tile'));
            // Scrubbed word-by-word reveal of the bio
            gsap.to('#about-text .w', {
                opacity: 1, stagger: 0.08, ease: 'none',
                scrollTrigger: { trigger: '#about-text', start: 'top 80%', end: 'bottom 45%', scrub: true },
            });
            // Hero title drifts and fades under the next section
            gsap.to('.hero__inner', {
                yPercent: -18, opacity: 0, ease: 'none',
                scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
            });
            gsap.from('.slice', {
                yPercent: 12, opacity: 0, stagger: 0.1, duration: 1.2, ease: 'expo.out',
                scrollTrigger: { trigger: '#slices', start: 'top 85%' },
            });
        } else {
            $$('#about-text .w').forEach((w) => (w.style.opacity = 1));
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
                <div class="intro__row"><span>${esc(S.role)}</span><span>${esc(S.tagline)}</span></div>
                <div>
                    <div class="intro__name display line-mask">${S.name.split('').map((c) => `<span class="char">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
                    <div class="intro__row" style="margin-top:24px"><span class="intro__count">0</span><span>${t('loadingReel')}</span></div>
                </div>
            </div>`);
        const intro = $('.intro');
        fitWidth($('.intro__name'));
        const counter = { v: 0 };
        document.documentElement.style.overflow = 'hidden';
        gsap.timeline({ onComplete: () => { intro.remove(); document.documentElement.style.overflow = ''; } })
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
        ].filter(([, v]) => v);
        $('#info').innerHTML = `
            ${p.description ? `<p class="info__desc">${esc(p.description)}</p>` : ''}
            <dl>${rows.map(([k, v]) => `<dt class="eyebrow">${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
            ${p.credits && p.credits.length ? `<div class="info__credits"><span class="eyebrow">${t('credits')}</span><ul>${p.credits.map(([r, n]) => `<li><span>${esc(r)}</span><span>${esc(n)}</span></li>`).join('')}</ul></div>` : ''}`;

        const stills = $('#stills');
        stills.classList.toggle('stills--portrait', portrait);
        stills.innerHTML = [1, 2, 3, 4, 5, 6].map((n) =>
            `<figure><img src="${S.media(p.slug, `still-${n}.jpg`)}" alt="${esc(p.title)} — ${t('still')} ${n}" loading="lazy"></figure>`).join('');

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
        const mail = $('#contact-mail');
        mail.href = `mailto:${c.email}`;
        mail.textContent = c.email;
        fitWidth(mail, 150);
        const cells = [
            [t('email'), `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`],
            c.phone && [t('phone'), `<a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a>`],
            c.instagram && ['Instagram', `<a href="${esc(c.instagram)}" target="_blank" rel="noopener">${esc(c.instagramHandle || 'Instagram')}</a>`],
            c.vimeo && ['Vimeo', `<a href="${esc(c.vimeo)}" target="_blank" rel="noopener">Vimeo</a>`],
            [t('basedIn'), esc(c.city)],
        ].filter(Boolean);
        $('#contact-grid').innerHTML = cells.map(([k, v]) => `<div><dt class="eyebrow">${k}</dt><dd>${v}</dd></div>`).join('');
        if (hasGsap && !reduced) {
            gsap.from('.contact .line-mask > span', { yPercent: 110, duration: 1.2, stagger: 0.08, ease: 'expo.out', delay: 0.3 });
            gsap.from('#contact-grid > div', { y: 24, opacity: 0, stagger: 0.08, duration: 1, ease: 'expo.out', delay: 0.6 });
        }
    }

    /* ------------------------------------------------------------------ */

    translateStatic();
    renderChrome();
    bindScramble();
    bindTransitions();
    bindCursor();

    ({ home, category, project, festival, contact })[page]?.();

    revealLines($('footer') || document.createElement('div'));
    if (page === 'home') revealLines($('#about'));
})();
