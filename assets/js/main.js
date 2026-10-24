/* ==========================================================================
   L'Atelier des Ongles — main.js
   Lenis (inertie) + GSAP/ScrollTrigger (mise en scène) + interactions.
   Tout ce qui est « mouvement » est isolé : sans GSAP ou avec
   prefers-reduced-motion, le site reste complet et lisible.
   ========================================================================== */
(function () {
  'use strict';

  var cfg = window.ATELIER || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var motion = hasGSAP && !reduce;
  var lenis = null;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ───────────── 1. Réglages : téléphone, réservation, liens ───────────── */
  var phoneRaw = String(cfg.phone || '').trim();
  var tel = phoneRaw.replace(/[^\d+]/g, '');
  var telIntl = tel ? (tel.charAt(0) === '0' ? '+33' + tel.slice(1) : tel) : '';
  var phoneShown = phoneRaw;
  if (/^\d{10}$/.test(tel)) phoneShown = tel.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  var insta = cfg.instagram || 'https://www.instagram.com/latelierdesonglesbrest/';

  function external(a, href) { a.setAttribute('href', href); a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); }

  function wireLinks() {
    $$('[data-insta]').forEach(function (a) { a.setAttribute('href', insta); });
    if (cfg.mapsUrl) $$('a[href^="https://maps.app.goo.gl"]').forEach(function (a) { a.setAttribute('href', cfg.mapsUrl); });

    /* data-book : bouton « rendez-vous » général → réservation en ligne si elle existe, sinon section #rdv */
    $$('[data-book]').forEach(function (a) { if (cfg.bookingUrl) external(a, cfg.bookingUrl); });

    /* data-book-final : action finale → réservation > téléphone > Instagram */
    $$('[data-book-final]').forEach(function (a) {
      if (cfg.bookingUrl) external(a, cfg.bookingUrl);
      else if (tel) a.setAttribute('href', 'tel:' + tel);
      else external(a, insta);
    });

    /* data-call : numéro cliquable (visible seulement si le téléphone est renseigné) */
    $$('[data-call]').forEach(function (a) {
      if (!tel) return;
      a.setAttribute('href', 'tel:' + tel);
      if (a.hasAttribute('data-phone-text')) { a.textContent = phoneShown; a.hidden = false; }
    });

    var fab = $('.fab');
    if (fab) {
      var lab = $('[data-fab-label]', fab);
      if (tel) { fab.setAttribute('href', 'tel:' + tel); if (lab) lab.textContent = 'Appeler'; fab.setAttribute('aria-label', 'Appeler le salon'); }
      else if (cfg.bookingUrl) { external(fab, cfg.bookingUrl); if (lab) lab.textContent = 'Réserver'; fab.setAttribute('aria-label', 'Réserver un rendez-vous'); }
      else { external(fab, insta); if (lab) lab.textContent = 'Réserver'; fab.setAttribute('aria-label', 'Réserver sur Instagram'); }
    }

    /* Données structurées : on y glisse le téléphone une fois renseigné */
    var ld = $('#ld-json');
    if (ld) {
      try {
        var data = JSON.parse(ld.textContent);
        data.image = ['assets/img/realisation-aura-fleurs-dorures.jpg', 'assets/img/realisation-aura-pastel.jpg', 'assets/img/salon-interieur.jpg'].map(function (u) { return new URL(u, location.href).href; });
        if (telIntl) data.telephone = telIntl;
        if (cfg.siteUrl) data.url = cfg.siteUrl;
        ld.textContent = JSON.stringify(data);
      } catch (e) { /* ignore */ }
    }

    $$('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });
  }

  /* ───────────── 2. Ouvert / fermé (heure de Paris) + ligne du jour ───────────── */
  var HOURS = { 2: [8, 19], 3: [8, 19], 4: [8, 21], 5: [8, 19], 6: [8, 19] };
  var DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  function parisNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      return { dow: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday], t: (+o.hour % 24) + (+o.minute) / 60 };
    } catch (e) { var d = new Date(); return { dow: d.getDay(), t: d.getHours() + d.getMinutes() / 60 }; }
  }

  function openStatus() {
    var n = parisNow(), h = HOURS[n.dow], text, open = false, i, d;
    if (h && n.t >= h[0] && n.t < h[1]) { open = true; text = 'Ouvert · jusqu’à ' + h[1] + ' h'; }
    else if (h && n.t < h[0]) { text = 'Fermé · ouvre aujourd’hui à ' + h[0] + ' h'; }
    else {
      for (i = 1; i <= 7; i++) {
        d = (n.dow + i) % 7;
        if (HOURS[d]) { text = 'Fermé · ouvre ' + (i === 1 ? 'demain' : DAYS[d]) + ' à ' + HOURS[d][0] + ' h'; break; }
      }
    }
    $$('[data-open-status]').forEach(function (el) { el.textContent = text; });
    var st = $('.find__status'); if (st) st.classList.toggle('is-open', open);
    $$('.hours tr').forEach(function (tr) { tr.classList.toggle('is-today', +tr.getAttribute('data-day') === n.dow); });
  }

  /* ───────────── 3. Galerie : vraies photos si config.photos est rempli ───────────── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function buildGallery() {
    var grid = $('#galGrid');
    if (!grid || !cfg.photos || !cfg.photos.length) return;
    grid.insertAdjacentHTML('beforeend', cfg.photos.map(function (p) {
      return '<li class="tile tile--photo" data-design="photo"><div class="tile__fig tilt"><div class="tile__bg">' +
        '<img class="tile__img" src="' + esc(p.src) + '" alt="' + esc(p.alt || p.label || '') + '" loading="lazy" decoding="async"></div>' +
        '<div class="tile__cap"><em class="tile__tag">Réalisation de l’atelier</em>' + (p.label ? '<strong>' + esc(p.label) + '</strong>' : '') + (p.text ? '<span>' + esc(p.text) + '</span>' : '') + '</div>' +
        '</div><i class="tile__curtain"></i></li>';
    }).join(''));
  }

  /* ───────────── 4. Sélecteur de forme (morphing d'ongle) ───────────── */
  function initPicker() {
    var svg = $('#pickSvg');
    if (!svg || !window.Art) return;
    var defs = $('defs', svg), group = $('#pickDesigns');
    var canMorph = motion && window.MorphSVGPlugin;
    var designs = ['cherry', 'nude', 'french', 'mirror', 'glitter', 'floral'];

    designs.forEach(function (k) {
      var id = 'pk' + k;
      defs.insertAdjacentHTML('beforeend', Art.DESIGNS[k].defs(id));
      group.insertAdjacentHTML('beforeend', '<g data-d="' + k + '" style="opacity:' + (k === 'cherry' ? 1 : 0) + '">' + Art.DESIGNS[k].body(id) + '</g>');
    });
    $$('[data-shape-icon]').forEach(function (el) {
      el.innerHTML = '<svg viewBox="0 0 100 160" aria-hidden="true" focusable="false"><path d="' + Art.SHAPES[el.getAttribute('data-shape-icon')] + '"/></svg>';
    });

    var shapeBtns = $$('.chip'), swBtns = $$('.sw'), descs = $$('.shape-desc [data-for]');

    function setShape(k) {
      shapeBtns.forEach(function (b) { var on = b.getAttribute('data-shape') === k; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
      var d = Art.SHAPES[k], targets = ['#pickClipPath', '#pickOutline'];
      if (canMorph) gsap.to(targets, { morphSVG: d, duration: 1.1, ease: 'power3.inOut', overwrite: true });
      else targets.forEach(function (s) { $(s).setAttribute('d', d); });
      descs.forEach(function (el) {
        var on = el.getAttribute('data-for') === k;
        el.hidden = !on;
        if (on && motion) gsap.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .8, ease: 'power3.out' });
      });
      if (motion) gsap.fromTo('.conseil__nail', { rotate: -4 }, { rotate: 0, duration: 1.2, ease: 'elastic.out(1,.55)' });
    }

    function setDesign(k) {
      swBtns.forEach(function (b) { var on = b.getAttribute('data-design') === k; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
      $$('#pickDesigns > g').forEach(function (g) {
        var on = g.getAttribute('data-d') === k;
        if (motion) gsap.to(g, { opacity: on ? 1 : 0, duration: .7, ease: 'power2.out' }); else g.style.opacity = on ? 1 : 0;
      });
    }

    function roving(btns, fn, attr) {
      btns.forEach(function (b, i) {
        b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
        b.addEventListener('click', function () { fn(b.getAttribute(attr)); });
        b.addEventListener('keydown', function (e) {
          var dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
          if (!dir) return;
          e.preventDefault();
          var nb = btns[(i + dir + btns.length) % btns.length];
          nb.focus(); fn(nb.getAttribute(attr));
        });
      });
    }
    roving(shapeBtns, setShape, 'data-shape');
    roving(swBtns, setDesign, 'data-design');
  }

  /* ───────────── 5. Accordéon « bon à savoir » ───────────── */
  function initAccordion() {
    $$('.acc__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        $$('.acc__btn').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); b.closest('.acc__item').classList.remove('is-open'); });
        if (!open) { btn.setAttribute('aria-expanded', 'true'); btn.closest('.acc__item').classList.add('is-open'); }
        if (window.ScrollTrigger) setTimeout(function () { ScrollTrigger.refresh(); }, 650);
      });
    });
  }

  /* ───────────── 6. Avis : carrousel animé ───────────── */
  function initReviews() {
    var vp = $('.rev__viewport'), track = $('#revTrack');
    if (!vp || !track) return;
    var cards = $$('.rev__card', track), n = cards.length, idx = 0;
    var cur = $('#revCur'), prev = $('#revPrev'), next = $('#revNext'), play = $('#revPlay'), bar = $('.rev__bar i');
    var DELAY = 7;
    var paused = !motion, hover = false, visible = true, tween = null;

    function label() { if (cur) cur.textContent = idx + 1; }

    /* Version sans mouvement : défilement natif, boutons suivant/précédent */
    if (!motion) {
      vp.classList.add('is-native');
      var step = function (d) { var c = cards[0]; vp.scrollBy({ left: d * (c.offsetWidth + 24), behavior: reduce ? 'auto' : 'smooth' }); };
      prev.addEventListener('click', function () { step(-1); });
      next.addEventListener('click', function () { step(1); });
      play.hidden = true; if (bar) bar.parentNode.hidden = true;
      $('.rev__count').hidden = true;
      return;
    }

    function place(instant) {
      var c = cards[idx], x = vp.clientWidth / 2 - (c.offsetLeft + c.offsetWidth / 2);
      gsap.to(track, { x: x, duration: instant ? 0 : 1.1, ease: 'expo.out', overwrite: true });
      cards.forEach(function (card, i) {
        var d = Math.abs(i - idx);
        gsap.to(card, { scale: d === 0 ? 1 : .86, opacity: d === 0 ? 1 : .32, duration: instant ? 0 : .9, ease: 'expo.out', overwrite: 'auto' });
        card.classList.toggle('is-active', d === 0);
      });
    }

    function restartBar() {
      if (tween) tween.kill();
      if (!bar) return;
      tween = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: DELAY, ease: 'none', onComplete: function () { go(idx + 1); } });
      if (paused || hover || !visible) tween.pause();
    }

    function go(i) {
      idx = (i + n) % n;
      label(); place(false); restartBar();
    }
    function syncPlayState() { if (!tween) return; if (paused || hover || !visible) tween.pause(); else tween.play(); }

    prev.addEventListener('click', function () { go(idx - 1); });
    next.addEventListener('click', function () { go(idx + 1); });
    play.addEventListener('click', function () {
      paused = !paused;
      play.setAttribute('aria-pressed', paused);
      play.setAttribute('aria-label', paused ? 'Reprendre le défilement' : 'Mettre le défilement en pause');
      play.querySelector('use').setAttribute('href', paused ? '#i-play' : '#i-pause');
      syncPlayState();
    });
    vp.addEventListener('mouseenter', function () { hover = true; syncPlayState(); });
    vp.addEventListener('mouseleave', function () { hover = false; syncPlayState(); });
    vp.addEventListener('focusin', function () { hover = true; syncPlayState(); });
    vp.addEventListener('focusout', function () { hover = false; syncPlayState(); });
    vp.setAttribute('tabindex', '0');
    vp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    });

    /* Glisser à la souris / au doigt */
    var down = false, sx = 0, dx = 0, startX = 0;
    vp.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = true; sx = e.clientX; dx = 0; startX = gsap.getProperty(track, 'x');
      gsap.killTweensOf(track);
      hover = true; syncPlayState();
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      dx = e.clientX - sx;
      gsap.set(track, { x: startX + dx });
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false; hover = false;
      if (dx < -50) go(idx + 1); else if (dx > 50) go(idx - 1); else { place(false); syncPlayState(); }
    });
    vp.addEventListener('dragstart', function (e) { e.preventDefault(); });

    ScrollTrigger.create({ trigger: vp, start: 'top bottom', end: 'bottom top', onToggle: function (s) { visible = s.isActive; syncPlayState(); } });
    window.addEventListener('resize', function () { place(true); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(true); });

    label(); place(true); restartBar();
  }

  /* ───────────── 7. Découpe de texte (mots / lettres) ───────────── */
  function split(el, mode) {
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    var chars = [], words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/([ \t\r\n]+)/).forEach(function (p) {
            if (!p) return;
            if (/^[ \t\r\n]+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            var wi = document.createElement('span'); wi.className = 'wi';
            if (mode === 'chars') {
              Array.from(p).forEach(function (ch) {
                var c = document.createElement('span'); c.className = 'ch'; c.textContent = ch; wi.appendChild(c); chars.push(c);
              });
            } else wi.textContent = p;
            w.appendChild(wi); frag.appendChild(w); words.push(wi);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(el);
    var sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = label;
    el.insertBefore(sr, el.firstChild);
    return { words: words, chars: chars };
  }

  /* ───────────── 8. Gouttes de vernis (bas de la section rendez-vous) ───────────── */
  function buildDrips() {
    var svg = $('#drips'); if (!svg) return;
    var W = Math.max(320, Math.round(svg.getBoundingClientRect().width || window.innerWidth));
    var H = 170, count = Math.max(5, Math.round(W / 105)), out = '', i, s = 7;
    function rnd() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    for (i = 0; i < count; i++) {
      var x = (i + .5) * (W / count) + (rnd() - .5) * (W / count) * .55;
      var r = 8 + rnd() * 7, a = r * .78, L = 40 + rnd() * 120;
      out += '<g class="drip" data-len="' + L.toFixed(0) + '">' +
        '<path d="M' + (x - a - 9).toFixed(1) + ' 0 C' + (x - a).toFixed(1) + ' 0 ' + (x - a).toFixed(1) + ' 8 ' + (x - a).toFixed(1) + ' 16 L' + (x - a).toFixed(1) + ' ' + (L - r * 1.7).toFixed(1) +
        ' C' + (x - r).toFixed(1) + ' ' + (L - r * 1.4).toFixed(1) + ' ' + (x - r).toFixed(1) + ' ' + (L - r).toFixed(1) + ' ' + (x - r).toFixed(1) + ' ' + (L - r).toFixed(1) +
        ' A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 0 ' + (x + r).toFixed(1) + ' ' + (L - r).toFixed(1) +
        ' C' + (x + r).toFixed(1) + ' ' + (L - r * 1.4).toFixed(1) + ' ' + (x + a).toFixed(1) + ' ' + (L - r * 1.7).toFixed(1) + ' ' + (x + a).toFixed(1) + ' ' + (L - r * 1.7).toFixed(1) +
        ' L' + (x + a).toFixed(1) + ' 16 C' + (x + a).toFixed(1) + ' 8 ' + (x + a).toFixed(1) + ' 0 ' + (x + a + 9).toFixed(1) + ' 0 Z" fill="#5E0F2B"/>' +
        '<path d="M' + (x - a + 2.2).toFixed(1) + ' 20 V' + (L - r * 1.9).toFixed(1) + '" stroke="#fff" stroke-opacity=".22" stroke-width="2" stroke-linecap="round" fill="none"/>' +
      '</g>';
    }
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = out;
  }

  /* ───────────── 9. Défilement, navigation, menu ───────────── */
  function scrollToEl(target, instant) {
    if (lenis) lenis.scrollTo(target, { offset: -1, duration: instant ? 0 : 1.6, immediate: !!instant, easing: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); } });
    else target.scrollIntoView({ behavior: reduce || instant ? 'auto' : 'smooth' });
  }

  var burger = $('.burger'), menu = $('#menu'), menuOpen = false;
  function setMenu(v) {
    menuOpen = v;
    burger.setAttribute('aria-expanded', v);
    burger.setAttribute('aria-label', v ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.classList.toggle('is-open', v);
    document.body.classList.toggle('menu-open', v);
    if (lenis) { if (v) lenis.stop(); else lenis.start(); }
    if (v) { var f = $('.menu__nav a', menu); if (f) setTimeout(function () { f.focus(); }, 350); }
  }
  burger.addEventListener('click', function () { setMenu(!menuOpen); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    if (menuOpen) setMenu(false);
    scrollToEl(t);
    try { history.replaceState(null, '', id); } catch (er) { /* ignore */ }
  });
  var toTop = $('#toTop');
  if (toTop) toTop.addEventListener('click', function () { if (lenis) lenis.scrollTo(0, { duration: 2, easing: function (t) { return 1 - Math.pow(1 - t, 4); } }); else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* ═══════════════════════════ MOUVEMENT ═══════════════════════════ */

  function initMotion() {
    document.documentElement.classList.add('has-motion');
    gsap.registerPlugin(ScrollTrigger);
    if (window.MorphSVGPlugin) gsap.registerPlugin(MorphSVGPlugin);
    ScrollTrigger.config({ ignoreMobileResize: true });

    /* Smooth scroll */
    if (window.Lenis) {
      lenis = new Lenis({ lerp: .085, smoothWheel: true, wheelMultiplier: .95 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    }

    var mm = gsap.matchMedia();

    /* État initial des éléments mis en scène (le préchargeur les cache pendant ce temps) */
    var heroSplit = $$('.hero [data-split]').map(function (el) { return split(el, el.getAttribute('data-split')); });
    var heroChars = heroSplit.reduce(function (a, s) { return a.concat(s.chars); }, []);
    gsap.set(heroChars, { yPercent: 125, rotate: 7 });
    gsap.set('.hero__eyebrow, .hero__lead, .hero__cta, .hero__meta, .scrollcue', { autoAlpha: 0, y: 24 });
    gsap.set('.hn', { autoAlpha: 0 });
    gsap.set('.hero__arch', { scaleY: 0, transformOrigin: '50% 100%' });
    gsap.set('.hero__ring', { scale: .6, autoAlpha: 0 });
    gsap.set('.header', { yPercent: -120 });

    /* Les autres titres */
    var otherSplits = $$('[data-split]').filter(function (el) { return !el.closest('.hero') && !el.closest('.foot'); }).map(function (el) {
      var s = split(el, el.getAttribute('data-split'));
      gsap.set(s.chars.length ? s.chars : s.words, { yPercent: 118 });
      return { el: el, s: s };
    });

    /* ───── Préchargeur ───── */
    var quick = false;
    try { quick = !!sessionStorage.getItem('ado-visited'); sessionStorage.setItem('ado-visited', '1'); } catch (e) { /* ignore */ }

    var loader = $('.loader'), fill = $('.loader__fill'), num = $('.loader__num'), nail = $('.loader__nail');
    var strokeEl = $('.loader__stroke');
    gsap.set(fill, { y: 160 });
    gsap.set(strokeEl, { strokeDasharray: 1, strokeDashoffset: 1 });
    var cnt = { v: 0 }, k = quick ? .45 : 1;

    var lt = gsap.timeline({ onComplete: enter });
    lt.from('.loader__name', { autoAlpha: 0, y: 22, duration: .9 * k, ease: 'power3.out' }, 0)
      .to(strokeEl, { strokeDashoffset: 0, duration: 1.3 * k, ease: 'power2.inOut' }, 0)
      .to(fill, { y: 0, duration: 1.7 * k, ease: 'power2.inOut' }, .25 * k)
      .to(cnt, { v: 100, duration: 1.7 * k, ease: 'power2.inOut', onUpdate: function () { num.textContent = Math.round(cnt.v); } }, .25 * k)
      .to(['.loader__name', '.loader__count'], { autoAlpha: 0, duration: .35, ease: 'power2.in' }, '>+.05')
      .to(strokeEl, { autoAlpha: 0, duration: .2 }, '<')
      .to(nail, { scale: 70, duration: 1.15, ease: 'expo.inOut', transformOrigin: '50% 52%' }, '<+.1');

    /* ───── Entrée : le hero prend la scène ───── */
    function enter() {
      gsap.to(loader, { autoAlpha: 0, duration: .5, ease: 'power2.out', onComplete: function () { loader.style.display = 'none'; } });
      document.body.classList.remove('is-loading');
      if (lenis) lenis.start();

      var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.to('.header', { yPercent: 0, duration: 1.2 }, .1)
        .to('.hero__arch', { scaleY: 1, duration: 1.8 }, 0)
        .to('.hero__ring', { scale: 1, autoAlpha: 1, duration: 2, stagger: .15 }, .1)
        .to(heroChars, { yPercent: 0, rotate: 0, duration: 1.5, stagger: .035 }, .15)
        .to('.hero__eyebrow', { autoAlpha: 1, y: 0, duration: 1.1 }, .1)
        .to('.hero__lead', { autoAlpha: 1, y: 0, duration: 1.2 }, .6)
        .to('.hero__cta', { autoAlpha: 1, y: 0, duration: 1.2 }, .75)
        .to('.hero__meta', { autoAlpha: 1, y: 0, duration: 1.2 }, .9)
        .to('.scrollcue', { autoAlpha: 1, y: 0, duration: 1.2 }, 1.2)
        .fromTo('.hn', { autoAlpha: 0, y: -340, rotate: function (i) { return (i % 2 ? -1 : 1) * (26 + i * 5); }, scale: .5 }, { autoAlpha: 1, y: 0, rotate: 0, scale: 1, duration: 1.9, ease: 'back.out(1.25)', stagger: { each: .11, from: 'random' } }, .2);

      /* Les ongles flottent (enveloppe interne : pas de conflit avec parallaxe ni entrée) */
      $$('.hn__f').forEach(function (f, i) {
        gsap.to(f, { y: (i % 2 ? -1 : 1) * (8 + (i * 3) % 9), rotate: (i % 2 ? 1 : -1) * (1.5 + (i % 3)), duration: 3.2 + (i % 4) * .6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * .2 });
      });

      ScrollTrigger.refresh();
      if (location.hash && location.hash.length > 1) {
        var t = document.querySelector(location.hash);
        if (t) setTimeout(function () { scrollToEl(t, true); }, 60);
      }
    }

    /* ───── Barre de progression + en-tête qui se cache ───── */
    gsap.to('.progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .2 } });

    var header = $('#header'), headerHidden = false;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var y = self.scroll(), want = headerHidden;
        header.classList.toggle('is-solid', y > 40);
        if (y < 200 || self.direction === -1 || menuOpen) want = false;
        else if (self.direction === 1) want = true;
        if (want !== headerHidden) {
          headerHidden = want;
          gsap.to(header, { yPercent: want ? -120 : 0, duration: .6, ease: 'power3.out', overwrite: true });
        }
      }
    });
    ScrollTrigger.create({ trigger: '.hero', start: 'bottom 60%', end: 'max', onToggle: function (s) { $('.fab').classList.toggle('is-on', s.isActive); } });

    /* ───── Hero : parallaxe multicouche + souris ───── */
    $$('.hero .layer').forEach(function (l) {
      var d = parseFloat(l.getAttribute('data-depth'));
      gsap.to(l, { yPercent: -d * 55, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    });
    gsap.to('.hero__content', { y: -90, autoAlpha: .0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '55% top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__arch', { scaleX: 1.04, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__ring--a', { rotate: 360, ease: 'none', duration: 60, repeat: -1 });
    gsap.to('.hero__ring--b', { rotate: -360, ease: 'none', duration: 90, repeat: -1 });

    if (finePointer) {
      var setters = $$('.hero .m').map(function (m) {
        return { d: parseFloat(m.getAttribute('data-mdepth')), x: gsap.quickTo(m, 'x', { duration: 1.4, ease: 'power3' }), y: gsap.quickTo(m, 'y', { duration: 1.4, ease: 'power3' }) };
      });
      $('.hero').addEventListener('pointermove', function (e) {
        var nx = (e.clientX / window.innerWidth - .5) * 2, ny = (e.clientY / window.innerHeight - .5) * 2;
        setters.forEach(function (s) { s.x(-nx * s.d); s.y(-ny * s.d); });
      });
    }

    /* ───── Marquee : vitesse et sens suivent le scroll ───── */
    var rows = $$('.marquee__row').map(function (row) {
      var group = $('.marquee__group', row), inner = document.createElement('div');
      inner.className = 'marquee__inner';
      row.insertBefore(inner, group); inner.appendChild(group);
      var w = group.offsetWidth || 1200, copies = Math.max(2, Math.ceil(window.innerWidth * 2 / w) + 1), c;
      for (c = 0; c < copies; c++) { var cl = group.cloneNode(true); inner.appendChild(cl); }
      return { inner: inner, w: w, dir: parseFloat(row.getAttribute('data-dir')) || -1, pos: 0, set: gsap.quickSetter(inner, 'x', 'px') };
    });
    var lastY = window.scrollY, sv = 0, dirMul = 1, lastT = performance.now();
    gsap.ticker.add(function () {
      var now = performance.now(), dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
      var y = window.scrollY, v = y - lastY; lastY = y;
      sv += (v - sv) * .12;
      var target = sv > .6 ? 1 : sv < -.6 ? -1 : dirMul;
      dirMul += (target - dirMul) * .06;
      var speed = 62 + Math.abs(sv) * 38;
      rows.forEach(function (r) {
        r.pos += r.dir * dirMul * speed * dt;
        if (r.pos <= -r.w) r.pos += r.w; else if (r.pos > 0) r.pos -= r.w;
        r.set(r.pos);
      });
    });

    /* ───── Histoire : section épinglée, une étape à la fois ───── */
    mm.add('(min-width: 1px)', function () {
      var steps = $$('.step'), layers = $$('.sl'), n = steps.length;
      var cur = $('.story__cur'), barFill = $('.story__progress b');
      gsap.set(steps.slice(1), { autoAlpha: 0, y: 46 });
      gsap.set(layers.slice(1), { autoAlpha: 0 });
      gsap.set(layers.slice(1), { scale: 1.1 });

      var tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: '.story', start: 'top top', end: function () { return '+=' + Math.round(window.innerHeight * 0.95 * (n - 0)); },
          pin: '.story__pin', scrub: .7, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: function (self) {
            var i = Math.min(n - 1, Math.floor(self.progress * n * .999));
            cur.textContent = '0' + (i + 1);
            barFill.style.transform = 'scaleX(' + self.progress.toFixed(3) + ')';
          }
        }
      });
      var i;
      for (i = 1; i < n; i++) {
        var t0 = i - .42;
        tl.to(steps[i - 1], { autoAlpha: 0, y: -46, duration: .3 }, t0)
          .to(layers[i - 1], { autoAlpha: 0, scale: .94, duration: .42 }, t0)
          .to(steps[i], { autoAlpha: 1, y: 0, duration: .36, ease: 'power3.out' }, t0 + .2)
          .to(layers[i], { autoAlpha: 1, scale: 1, duration: .55, ease: 'power2.out' }, t0 + .1);
      }
      tl.to('.sl > svg', { scale: 1.08, duration: n, ease: 'none' }, 0);
      tl.fromTo('.sl__sun', { y: 46 }, { y: -26, duration: 1.2, ease: 'none' }, 0);
      tl.fromTo('.sl__path', { strokeDashoffset: 120 }, { strokeDashoffset: 0, duration: 1.2, ease: 'none' }, 0);
      tl.fromTo('.sl--2 .sl__nail', { y: 60, scale: .88 }, { y: 0, scale: 1, duration: .8, ease: 'power3.out' }, .6);
      tl.fromTo('.sl__draw', { strokeDashoffset: 80 }, { strokeDashoffset: 0, duration: 1, ease: 'none' }, .65);
      tl.fromTo('.sl--3 .sl__nail', { rotate: -8, y: 40 }, { rotate: 4, y: 0, duration: 1.2, ease: 'power2.out' }, 1.6);
      tl.fromTo('.sl__circle', { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: .7, ease: 'power2.inOut' }, 2.55);
      tl.fromTo('.sl__s--sel', { y: 0 }, { y: -22, duration: .6, ease: 'power3.out' }, 2.7);
      tl.fromTo('.sl__nail--duo-a', { x: -90, rotate: -20 }, { x: 0, rotate: -9, duration: .7, ease: 'power3.out' }, 3.55);
      tl.fromTo('.sl__nail--duo-b', { x: 90, rotate: 20 }, { x: 0, rotate: 9, duration: .7, ease: 'power3.out' }, 3.62);
      tl.fromTo('.sl--6 > img', { scale: 1.16, xPercent: 3 }, { scale: 1, xPercent: 0, duration: 1.2, ease: 'none' }, 4.62);
      tl.set({}, {}, n);

      gsap.to('.sl__orbit', { rotation: 360, svgOrigin: '200 260', duration: 60, ease: 'none', repeat: -1 });
      gsap.to('.sl__spin', { rotation: 360, svgOrigin: '200 266', duration: 40, ease: 'none', repeat: -1 });
    });

    /* ───── Sélecteur de forme : entrée + anneau de texte lié au scroll ───── */
    gsap.from('.conseil__nail', { y: 120, rotate: -18, autoAlpha: 0, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: '.conseil__stage', start: 'top 80%', once: true } });
    gsap.to('.conseil__ring', { rotation: 200, ease: 'none', scrollTrigger: { trigger: '.conseil', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.to('.conseil__nail', { y: -50, ease: 'none', scrollTrigger: { trigger: '.conseil', start: 'top bottom', end: 'bottom top', scrub: true } });
    $$('.conseil__sp').forEach(function (s, i) {
      gsap.to(s, { scale: 1.4, autoAlpha: .2, duration: 1.4 + i * .4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    });

    /* ───── Prestations : défilement horizontal piloté par le scroll vertical ───── */
    mm.add('(min-width: 900px)', function () {
      var track = $('.rail__track'), pin = $('.rail__pin'), barI = $('.rail__bar i');
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var tween = gsap.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: {
          trigger: '.rail', start: 'top top', end: function () { return '+=' + dist(); },
          pin: pin, scrub: .7, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: function (self) { barI.style.transform = 'scaleX(' + self.progress.toFixed(3) + ')'; }
        }
      });
      $$('.card, .rail__end').forEach(function (c) {
        gsap.fromTo(c, { autoAlpha: .15, y: 70, scale: .94 }, { autoAlpha: 1, y: 0, scale: 1, ease: 'power2.out', scrollTrigger: { trigger: c, containerAnimation: tween, start: 'left 98%', end: 'left 62%', scrub: true } });
        var g = $('.card__ghost', c);
        if (g) gsap.fromTo(g, { x: 80 }, { x: -80, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
      gsap.fromTo('.rail__hint svg', { x: 0 }, { x: 10, duration: .9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });
    mm.add('(max-width: 899px)', function () {
      $$('.card').forEach(function (c) {
        gsap.from(c, { autoAlpha: 0, y: 40, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 95%', once: true } });
      });
    });

    /* ───── Bon à savoir ───── */
    gsap.from('.savoir__nail', { y: 90, rotate: -25, autoAlpha: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.savoir__nail', start: 'top 90%', once: true } });
    gsap.to('.savoir__nail', { rotate: 12, y: -30, ease: 'none', scrollTrigger: { trigger: '.savoir', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* ───── Chiffres : compteurs + contours d'ongle qui se dessinent ───── */
    $$('.stat').forEach(function (st, i) {
      var el = $('[data-count]', st), target = parseFloat(el.getAttribute('data-count')), o = { v: 0 };
      el.textContent = '0';
      gsap.set(st, { autoAlpha: 0, y: 70 });
      gsap.set($('.stat__p', st), { strokeDashoffset: 1 });
      ScrollTrigger.create({
        trigger: st, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(st, { autoAlpha: 1, y: 0, duration: 1.3, ease: 'expo.out', delay: i * .1 });
          gsap.to($('.stat__p', st), { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut', delay: i * .1 });
          gsap.to(o, { v: target, duration: 2.4, ease: 'power3.out', delay: i * .1, onUpdate: function () { el.textContent = Math.round(o.v); } });
        }
      });
    });

    /* ───── Galerie : rideau, zoom, parallaxe dans le cadre ───── */
    $$('.tile').forEach(function (tile, i) {
      var curtain = $('.tile__curtain', tile), bg = $('.tile__bg', tile), art = $('.tile__art, .tile__img', tile);
      gsap.set(curtain, { scaleY: 1, transformOrigin: '50% 0%' });
      gsap.set(bg, { scale: 1.3 });
      ScrollTrigger.create({
        trigger: tile, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(curtain, { scaleY: 0, duration: 1.4, ease: 'expo.inOut', delay: (i % 3) * .1 });
          gsap.to(bg, { scale: 1, duration: 2, ease: 'expo.out', delay: (i % 3) * .1 });
        }
      });
      if (art) gsap.fromTo(art, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: tile, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* ───── Rendez-vous : sceau qui tourne + gouttes de vernis ───── */
    gsap.to('.cta__spin', { rotation: 220, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: .5 } });
    gsap.fromTo('.cta__nail', { y: 30, rotate: -6 }, { y: -30, rotate: 6, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });

    var dripsPlayed = false;
    function hideDrips() {
      $$('#drips .drip').forEach(function (d) { gsap.set(d, { y: -parseFloat(d.getAttribute('data-len')) - 14 }); });
    }
    function dropDrips() {
      dripsPlayed = true;
      $$('#drips .drip').forEach(function (d, i) {
        gsap.to(d, { y: 0, duration: 2 + Math.random() * 1.2, ease: 'power2.inOut', delay: .15 + (i % 5) * .17 + Math.random() * .3 });
      });
    }
    buildDrips(); hideDrips();
    ScrollTrigger.create({ trigger: '.cta', start: 'bottom 92%', once: true, onEnter: dropDrips });
    var rt; window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        buildDrips();
        if (dripsPlayed) $$('#drips .drip').forEach(function (d) { gsap.set(d, { y: 0 }); }); else hideDrips();
      }, 250);
    });

    /* ───── Nous trouver ───── */
    gsap.from('.mapframe', { y: 80, autoAlpha: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.mapframe', start: 'top 88%', once: true } });

    /* ───── Pied de page : le grand nom se déploie ───── */
    var footSplit = $$('.foot [data-split]').map(function (el) { return split(el, 'chars'); });
    var footChars = footSplit.reduce(function (a, s) { return a.concat(s.chars); }, []);
    gsap.set(footChars, { yPercent: 118 });
    ScrollTrigger.create({
      trigger: '.foot__giant', start: 'top 92%', once: true,
      onEnter: function () { gsap.to(footChars, { yPercent: 0, duration: 1.6, ease: 'expo.out', stagger: .035 }); }
    });

    /* ───── Titres (mots qui montent) et blocs qui apparaissent ───── */
    otherSplits.forEach(function (o) {
      var targets = o.s.chars.length ? o.s.chars : o.s.words;
      ScrollTrigger.create({
        trigger: o.el, start: 'top 88%', once: true,
        onEnter: function () { gsap.to(targets, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: .06 }); }
      });
    });
    $$('[data-reveal]').forEach(function (el) {
      gsap.set(el, { autoAlpha: 0, y: 38 });
      ScrollTrigger.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter: function () { gsap.to(el, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'power3.out' }); }
      });
    });

    /* ───── Micro-interactions (souris uniquement) ───── */
    if (finePointer) {
      /* Boutons magnétiques */
      $$('[data-magnetic]').forEach(function (b) {
        var t = $('.btn__t', b);
        var xTo = gsap.quickTo(b, 'x', { duration: .7, ease: 'power3' }), yTo = gsap.quickTo(b, 'y', { duration: .7, ease: 'power3' });
        var txTo = t ? gsap.quickTo(t, 'x', { duration: .7, ease: 'power3' }) : null, tyTo = t ? gsap.quickTo(t, 'y', { duration: .7, ease: 'power3' }) : null;
        b.addEventListener('pointermove', function (e) {
          var r = b.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          xTo(dx * .32); yTo(dy * .42);
          if (txTo) { txTo(dx * .1); tyTo(dy * .14); }
        });
        b.addEventListener('pointerleave', function () { xTo(0); yTo(0); if (txTo) { txTo(0); tyTo(0); } });
      });

      /* Cartes qui s'inclinent + reflet */
      $$('.tilt').forEach(function (el) {
        var max = parseFloat(el.getAttribute('data-tilt')) || (el.classList.contains('card') ? 5 : 8);
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          gsap.to(el, { rotateY: (px - .5) * 2 * max, rotateX: -(py - .5) * 2 * max, transformPerspective: 1000, duration: .6, ease: 'power3.out', overwrite: 'auto' });
          el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
          el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
        });
        el.addEventListener('pointerleave', function () { gsap.to(el, { rotateX: 0, rotateY: 0, duration: 1, ease: 'power3.out', overwrite: 'auto' }); });
      });

      /* Curseur en forme d'ongle */
      var cursor = $('.cursor'), ring = $('.cursor__ring'), lab = $('.cursor__label');
      var cx = gsap.quickTo(cursor, 'x', { duration: .45, ease: 'power3' }), cy = gsap.quickTo(cursor, 'y', { duration: .45, ease: 'power3' });
      gsap.set(cursor, { xPercent: -50, yPercent: -50 });
      window.addEventListener('pointermove', function (e) { cx(e.clientX); cy(e.clientY); cursor.classList.add('is-on'); }, { passive: true });
      document.addEventListener('pointerleave', function () { cursor.classList.remove('is-on'); });
      document.addEventListener('pointerover', function (e) {
        var el = e.target.closest ? e.target.closest('a, button, [data-cursor], .tilt, summary, [role="radio"]') : null;
        var txt = el && el.getAttribute('data-cursor');
        cursor.classList.toggle('is-link', !!el && !txt);
        cursor.classList.toggle('is-label', !!txt);
        lab.textContent = txt || '';
      });
    }

    /* Anchors de la nav : état actif */
    $$('.nav a').forEach(function (a) {
      var id = a.getAttribute('href'), sec = document.querySelector(id);
      if (!sec) return;
      ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: function (s) { a.classList.toggle('is-current', s.isActive); } });
    });

    /* Rafraîchir quand les polices sont chargées (les hauteurs changent) */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }

  /* ═══════════════════════════ DÉMARRAGE ═══════════════════════════ */
  function boot() {
    wireLinks();
    openStatus();
    setInterval(openStatus, 60000);
    buildGallery();
    initPicker();
    initAccordion();

    if (motion) {
      try { initMotion(); } catch (err) {
        if (window.console) console.error(err);
        fallback();
      }
      initReviews();
    } else {
      fallback();
      initReviews();
    }
  }

  /* Pas de GSAP ou mouvement réduit : tout est visible tout de suite */
  function fallback() {
    $$('.js-hide').forEach(function (el) { el.classList.remove('js-hide'); el.style.opacity = 1; el.style.visibility = 'visible'; });
    var loader = $('.loader'); if (loader) loader.style.display = 'none';
    document.body.classList.remove('is-loading');
    if (reduce) document.documentElement.classList.add('reduce');
    $('.header').classList.add('is-solid');
    var drips = $('#drips');
    if (drips) buildDrips();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
