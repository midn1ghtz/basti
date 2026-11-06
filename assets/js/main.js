/* ==========================================================================
   midn1ght — main script (no dependencies)
   Header · mobile menu · fit text · reveal · 3D video ring · tilt
   · video overlay · statement highlight · 404 moon · contact form
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;

  /* ---------- Year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Header: hide on scroll down, show on scroll up ---------- */
  const header = $('[data-header]');
  let lastY = window.scrollY;
  const onHeaderScroll = () => {
    if (!header) return;
    const y = window.scrollY;
    if (!document.body.classList.contains('menu-open')) {
      if (y > lastY + 4 && y > 480) header.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 480) header.classList.remove('is-hidden');
    }
    lastY = y;
  };

  /* ---------- Mobile menu ---------- */
  const toggle = $('.menu-toggle');
  const menu = $('#mobile-menu');
  const setMenu = (open) => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    document.body.classList.toggle('menu-open', open);
    root.style.overflow = open ? 'hidden' : '';
  };
  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu && $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  window.matchMedia('(min-width: 961px)').addEventListener?.('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Active nav link ---------- */
  const navLinks = $$('.nav a[href*="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    const map = new Map(navLinks.map((a) => [a.getAttribute('href').split('#')[1], a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => a.classList.remove('is-active'));
        map.get(en.target.id)?.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); s && io.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Showcase: 3D ring turns slowly on its own ---------- */
  const showcase = $('[data-showcase]');
  const ring = $('[data-ring]');
  // Ring angle comes from one shared clock, so the title ticker can follow it even when the ring is off screen.
  const RING_SPEED = 4; // degrees per second
  let ringAngle = -30, pausedMs = 0, pauseStart = 0;
  const setRingPaused = (p) => {
    if (p && !pauseStart) pauseStart = performance.now();
    else if (!p && pauseStart) { pausedMs += performance.now() - pauseStart; pauseStart = 0; }
  };
  const ringClockStart = performance.now();
  let ringSpin = 0; // extra degrees from swiping the ring on touch screens
  const ringAngleNow = () => {
    if (reduceMotion) return -30 + ringSpin;
    const now = pauseStart || performance.now();
    return -30 + ringSpin - ((now - ringClockStart - pausedMs) / 1000) * RING_SPEED;
  };
  let openVideo = null;
  /* ---------- Thumbnails breathe softly, each on its own rhythm ---------- */
  if (!reduceMotion) {
    $$('.tilt').forEach((t, i) => {
      // golden-ratio spread so neighbours never pulse in sync
      const f = (i * 0.618034) % 1;
      t.style.setProperty('--pdur', (4.2 + f * 2.6).toFixed(2) + 's');
      t.style.setProperty('--pd', (-f * 7).toFixed(2) + 's');
    });
  }

  if (ring) {
    const cards = $$('.showcase__card', ring);
    const step = 360 / cards.length;
    ring.style.setProperty('--step', step + 'deg');
    // The gallery below holds the same videos for keyboard users; keep the ring out of the tab order.
    cards.forEach((c) => c.setAttribute('tabindex', '-1'));

    // Two layers of the same ring (back half / front half), so a centre element could sit between them.
    const stage = ring.closest('.showcase__stage');
    const backStage = stage.cloneNode(true);
    backStage.classList.add('showcase__stage--back');
    backStage.setAttribute('aria-hidden', 'true');
    backStage.querySelectorAll('[data-video]').forEach((c) => { c.removeAttribute('data-video'); c.setAttribute('tabindex', '-1'); });
    const backRing = $('[data-ring]', backStage);
    backRing.removeAttribute('data-ring');
    const backCards = $$('.showcase__card', backRing);
    stage.before(backStage);
    let lastFront = '';
    const dofCache = [];
    const setRot = (deg) => {
      const v = deg.toFixed(2) + 'deg';
      ring.style.setProperty('--rot', v);
      backRing.style.setProperty('--rot', v);
      let sig = '';
      cards.forEach((c, i) => {
        const front = Math.cos(((deg + i * step) * Math.PI) / 180) > 0;
        sig += front ? '1' : '0';
        // turn each card most of the way back towards the viewer (angle wrapped to -180…180)
        const a = ((((deg + i * step + 180) % 360) + 360) % 360) - 180;
        const face = (-a).toFixed(2) + 'deg'; // fully undo the ring turn: every card faces the viewer
        c.style.setProperty('--face', face);
        backCards[i].style.setProperty('--face', face);
        // depth of field: cards further back get softer (0 px at the front … 6 px at the back)
        const depth = (1 - Math.cos((a * Math.PI) / 180)) / 2;
        const dof = Math.round(depth * depth * 24) / 4;
        if (dofCache[i] !== dof) {
          dofCache[i] = dof;
          c.style.setProperty('--dof', dof + 'px');
          backCards[i].style.setProperty('--dof', dof + 'px');
        }
      });
      if (sig === lastFront) return; // only touch the DOM when a card changes layer
      lastFront = sig;
      cards.forEach((c, i) => {
        const front = sig[i] === '1';
        c.style.visibility = front ? '' : 'hidden';
        backCards[i].style.visibility = front ? 'hidden' : '';
      });
    };

    if (reduceMotion) {
      setRot(-30);
    } else {
      let raf = 0;
      const tick = () => {
        ringAngle = ringAngleNow();
        setRot(ringAngle);
        raf = requestAnimationFrame(tick);
      };
      new IntersectionObserver(([en]) => {
        if (en.isIntersecting && !raf) { raf = requestAnimationFrame(tick); }
        else if (!en.isIntersecting) { cancelAnimationFrame(raf); raf = 0; }
      }).observe(showcase);
    }
  }

  /* ---------- Phones: swipe sideways over the hero to spin the ring (with inertia) ---------- */
  const heroSticky = $('.showcase__sticky');
  if (heroSticky && ring) {
    let lastX = 0, startX = 0, startY = 0, vel = 0, dragging = false, moved = false, inertia = 0;
    const DEG_PER_PX = 0.3;
    const glide = () => {
      vel *= 0.92;
      ringSpin += vel;
      inertia = Math.abs(vel) > 0.02 ? requestAnimationFrame(glide) : 0;
    };
    heroSticky.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      dragging = true; moved = false;
      startX = lastX = e.clientX; startY = e.clientY; vel = 0;
      cancelAnimationFrame(inertia); inertia = 0;
    });
    heroSticky.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerType !== 'touch') return;
      const dx = e.clientX - lastX;
      if (!moved && Math.abs(e.clientX - startX) > 8 && Math.abs(e.clientX - startX) > Math.abs(e.clientY - startY)) moved = true;
      if (!moved) return;
      ringSpin += dx * DEG_PER_PX;
      vel = dx * DEG_PER_PX;
      lastX = e.clientX;
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      if (moved && !inertia) inertia = requestAnimationFrame(glide);
    };
    heroSticky.addEventListener('pointerup', end);
    heroSticky.addEventListener('pointercancel', end);
    // a swipe should not also open a video
    heroSticky.addEventListener('click', (e) => { if (moved) { e.stopImmediatePropagation(); moved = false; } }, true);
  }

  /* ---------- Phones: tilt the headline and the ring cards with the phone (gyroscope) ---------- */
  if (!finePointer && !reduceMotion && 'DeviceOrientationEvent' in window) {
    const mark = $('.showcase__wordmark');
    const tiltEls = $$('[data-ring] .tilt');
    const cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 };
    let base = null, raf = 0;
    const onOrient = (e) => {
      if (e.beta == null || e.gamma == null) return;
      if (!base) base = { b: e.beta, g: e.gamma };
      tgt.y = clamp((e.gamma - base.g) / 25, -1, 1);   // left / right
      tgt.x = clamp((e.beta - base.b) / 25, -1, 1);    // towards / away
      if (!raf) raf = requestAnimationFrame(step);
    };
    const step = () => {
      cur.x += (tgt.x - cur.x) * 0.12; cur.y += (tgt.y - cur.y) * 0.12;
      if (mark) {
        mark.style.setProperty('--rx', (-cur.x * 12).toFixed(2) + 'deg');
        mark.style.setProperty('--ry', (cur.y * 14).toFixed(2) + 'deg');
      }
      tiltEls.forEach((el) => {
        el.style.setProperty('--rx', (-cur.x * 10).toFixed(2) + 'deg');
        el.style.setProperty('--ry', (cur.y * 10).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (50 + cur.y * 40).toFixed(1) + '%');
        el.style.setProperty('--gy', (50 + cur.x * 40).toFixed(1) + '%');
        el.style.setProperty('--lift', Math.min(1, Math.hypot(cur.x, cur.y)).toFixed(2));
      });
      raf = Math.abs(tgt.x - cur.x) + Math.abs(tgt.y - cur.y) > 0.002 ? requestAnimationFrame(step) : 0;
    };
    const listen = () => window.addEventListener('deviceorientation', onOrient, { passive: true });
    // iOS asks for permission, and only after a tap
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const ask = () => {
        DeviceOrientationEvent.requestPermission().then((s) => { if (s === 'granted') listen(); }).catch(() => {});
        window.removeEventListener('touchend', ask);
      };
      window.addEventListener('touchend', ask, { once: true });
    } else {
      listen();
    }
    // re-centre when the phone is put down / picked up again
    document.addEventListener('visibilitychange', () => { base = null; });
  }

  /* ---------- Headline: watery warp of the whole word + 3D tilt towards the cursor ---------- */
  const warpWrap = $('[data-warp]');
  const warpMark = warpWrap && $('.showcase__wordmark', warpWrap);
  const warpDisp = document.getElementById('warp-disp');
  if (warpWrap && warpMark && warpDisp && finePointer && !reduceMotion) {
    const MAX_TILT = 10, MAX_WARP = 9;
    const cur = { rx: 0, ry: 0, w: 0 }, tgt = { rx: 0, ry: 0, w: 0 };
    let raf = 0, t0 = 0;
    const step = (now) => {
      cur.rx += (tgt.rx - cur.rx) * 0.1; cur.ry += (tgt.ry - cur.ry) * 0.1; cur.w += (tgt.w - cur.w) * 0.06;
      warpMark.style.setProperty('--rx', cur.rx.toFixed(2) + 'deg');
      warpMark.style.setProperty('--ry', cur.ry.toFixed(2) + 'deg');
      const t = (now - t0) / 1000;
      warpDisp.setAttribute('scale', (cur.w * (0.75 + 0.25 * Math.cos(t * 2.4))).toFixed(2)); // calm, breathing wobble
      const still = Math.abs(cur.rx) + Math.abs(cur.ry) < 0.02 && cur.w < 0.05;
      if (still && tgt.w === 0) {
        warpMark.style.removeProperty('--warp'); warpMark.style.removeProperty('--rx'); warpMark.style.removeProperty('--ry');
        warpDisp.setAttribute('scale', '0'); raf = 0; return;
      }
      raf = requestAnimationFrame(step);
    };
    const kick = () => { warpMark.style.setProperty('--warp', 'url(#warp)'); if (!raf) { t0 = performance.now(); raf = requestAnimationFrame(step); } };
    warpWrap.addEventListener('pointermove', (e) => {
      const r = warpWrap.getBoundingClientRect();
      const px = clamp((e.clientX - r.left) / r.width), py = clamp((e.clientY - r.top) / r.height);
      tgt.ry = (px - 0.5) * 2 * MAX_TILT;
      tgt.rx = -(py - 0.5) * 2 * MAX_TILT;
      tgt.w = MAX_WARP;
      kick();
    });
    warpWrap.addEventListener('pointerleave', () => { tgt.rx = 0; tgt.ry = 0; tgt.w = 0; kick(); });
  }

  /* ---------- Title ticker: follows the ring, so the title in the middle is always the video at the front.
                Titles blur smoothly towards the edges. Never pauses. ---------- */
  const tickerTrack = $('[data-ticker]');
  if (tickerTrack) {
    const ticker = tickerTrack.parentElement;
    const spans = $$('span', tickerTrack);
    const N = spans.length / 3;                // three identical copies; we steer by the middle one
    const items = spans.map((el) => ({ el, b: -1 }));
    let centres = [], period = 0;
    const measure = () => {
      centres = [];
      for (let i = 0; i <= N; i++) { const el = spans[N + i]; centres.push(el.offsetLeft + el.offsetWidth / 2); }
      period = spans[2 * N].offsetLeft - spans[N].offsetLeft;
    };
    const smooth = (x) => x * x * (3 - 2 * x); // smoothstep
    const step = 360 / N;
    let lastX = null;
    const update = () => {
      // which card is at the front: card i faces the viewer when angle + i * step = 0 (mod 360)
      let f = (-ringAngleNow() / step) % N;
      if (f < 0) f += N;
      const i0 = Math.floor(f), t = f - i0;
      // hold the current title, then glide to the next one around the moment the front card changes (t = 0.5)
      const u = smooth(clamp((t - 0.28) / 0.44));
      const pos = centres[i0] + (centres[i0 + 1] - centres[i0]) * u;
      const x = ticker.clientWidth / 2 - pos;
      if (x !== lastX) { tickerTrack.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`; lastX = x; }
      if (reduceMotion) return;
      const half = ticker.clientWidth / 2;
      items.forEach((it) => {
        const l = it.el.offsetLeft + x, r = l + it.el.offsetWidth;
        if (r < -80 || l > ticker.clientWidth + 80) return; // off screen
        const dx = r < half ? half - r : l > half ? l - half : 0; // distance to nearest edge
        const k = smooth(clamp((dx / half - 0.03) / 0.55));
        const blur = Math.round(k * 90) / 10;
        if (blur === it.b) return;
        it.b = blur;
        it.el.style.setProperty('--blur', blur + 'px');
        it.el.style.setProperty('--fade', (1 - k * 0.45).toFixed(2));
      });
    };
    measure();
    document.fonts?.ready.then(() => { measure(); update(); });
    window.addEventListener('resize', () => { measure(); update(); });
    let raf = 0;
    const loop = () => { update(); raf = requestAnimationFrame(loop); };
    if (reduceMotion) update();
    else new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !raf) raf = requestAnimationFrame(loop);
      else if (!en.isIntersecting) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(ticker);
  }

  /* ---------- Statement: words light up while scrolling ---------- */
  const statement = $('[data-statement]');
  let words = [];
  if (statement && !reduceMotion) {
    statement.innerHTML = statement.textContent.trim().split(/\s+/)
      .map((w) => `<span class="w${/night|mood|beat/i.test(w) ? ' is-key' : ''}">${w}</span>`).join(' ');
    words = $$('.w', statement);
  }
  const updateStatement = () => {
    if (!words.length) return;
    const r = statement.getBoundingClientRect();
    const p = clamp((window.innerHeight * 0.85 - r.top) / (r.height + window.innerHeight * 0.35));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => {
      w.classList.toggle('is-on', i < n);
      w.classList.toggle('is-hl', i < n && w.classList.contains('is-key'));
    });
  };

  /* ---------- Scroll loop (rAF-throttled) ---------- */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onHeaderScroll();
      updateStatement();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(onScroll, 120);
  });
  onScroll();

  /* ======================================================================
     3D tilt — follows the pointer with perspective, eases back on leave
     ====================================================================== */
  /* ======================================================================
     Consent: the site sets no cookies itself. YouTube only loads after
     consent. The choice is kept in localStorage (strictly necessary,
     § 25 (2) No. 2 TDDDG) and can be changed via "Cookie-Einstellungen".
     ====================================================================== */
  const CONSENT_KEY = 'midn1ght-consent-v1';
  const consent = {
    read() { try { return JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null'); } catch { return null; } },
    write(v) { try { localStorage.setItem(CONSENT_KEY, JSON.stringify(v)); } catch { /* storage blocked: ask again next time */ } },
    has(k) { return !!this.read()?.[k]; },
    set(k) { this.write({ ...(this.read() || {}), [k]: true, date: new Date().toISOString() }); },
  };
  const privacyHref = (document.querySelector('a[href$="privacy.html"]')?.getAttribute('href')) || 'privacy.html';
  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Cookie-Einstellungen');
  banner.hidden = true;
  banner.innerHTML = `
    <p class="cookie-banner__title">Cookies &amp; externe Medien</p>
    <p class="cookie-banner__text">Diese Website setzt selbst keine Cookies und nutzt kein Tracking. Die Videos werden von YouTube (Google) bereitgestellt. Erst wenn du zustimmst, wird YouTube geladen. Dabei können Daten in die USA übertragen und Cookies gesetzt werden. Du kannst deine Wahl jederzeit unter „Cookie-Einstellungen“ ändern. <a href="${privacyHref}">Datenschutzerklärung</a></p>
    <div class="cookie-banner__actions">
      <button class="btn btn--light btn--sm" type="button" data-consent="necessary">Nur notwendige</button>
      <button class="btn btn--light btn--sm" type="button" data-consent="youtube">YouTube erlauben</button>
    </div>`;
  document.body.appendChild(banner);
  const showBanner = (show) => {
    banner.hidden = !show;
    requestAnimationFrame(() => banner.classList.toggle('is-in', show));
  };
  $$('[data-consent]', banner).forEach((b) => b.addEventListener('click', () => {
    consent.write({ youtube: b.dataset.consent === 'youtube', date: new Date().toISOString() });
    showBanner(false);
  }));
  $$('[data-consent-settings]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); showBanner(true); }));
  if (!consent.read()) setTimeout(() => showBanner(true), 900);

  const tilts = new WeakMap();
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach((el) => {
      const host = el.closest('button, a') || el;
      const inRing = !!el.closest('.showcase__card');
      const max = inRing ? 9 : 8; // degrees
      const cur = { rx: 0, ry: 0, gx: 50, gy: 50, lift: 0 };
      const tgt = { rx: 0, ry: 0, gx: 50, gy: 50, lift: 0 };
      let raf = 0;
      const step = () => {
        let moving = false;
        for (const k in cur) {
          const k2 = k === 'lift' ? 0.1 : 0.12;
          cur[k] += (tgt[k] - cur[k]) * k2;
          if (Math.abs(tgt[k] - cur[k]) > 0.01) moving = true;
        }
        el.style.setProperty('--rx', cur.rx.toFixed(2) + 'deg');
        el.style.setProperty('--ry', cur.ry.toFixed(2) + 'deg');
        el.style.setProperty('--gx', cur.gx.toFixed(1) + '%');
        el.style.setProperty('--gy', cur.gy.toFixed(1) + '%');
        el.style.setProperty('--lift', cur.lift.toFixed(3));
        raf = moving ? requestAnimationFrame(step) : 0;
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
      const ctrl = {
        move(e) {
          const r = host.getBoundingClientRect();
          const px = clamp((e.clientX - r.left) / r.width);
          const py = clamp((e.clientY - r.top) / r.height);
          tgt.ry = (px - 0.5) * 2 * max;
          tgt.rx = -(py - 0.5) * 2 * max;
          tgt.gx = px * 100; tgt.gy = py * 100; tgt.lift = 1;
          kick();
        },
        leave() {
          tgt.rx = 0; tgt.ry = 0; tgt.lift = 0; tgt.gx = 50; tgt.gy = 50;
          kick();
        },
      };
      tilts.set(host, ctrl);
      if (!inRing) {
        host.addEventListener('pointermove', ctrl.move);
        host.addEventListener('pointerleave', ctrl.leave);
      }
    });
  }

  /* ---------- Ring hit-testing: pick the front-most card under the pointer ---------- */
  const ringSticky = $('.showcase__sticky');
  const ringCardAt = (x, y) => {
    if (!ring) return null;
    const cards = $$('.showcase__card', ring);
    const step = 360 / cards.length;
    let best = null, bestFacing = -2; // front cards win, back cards are clickable too
    cards.forEach((c, i) => {
      const facing = Math.cos(((ringAngle + i * step) * Math.PI) / 180);
      if (facing <= bestFacing) return;
      const r = $('.tilt', c).getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { best = c; bestFacing = facing; }
    });
    return best;
  };
  if (ringSticky && ring) {
    let hovered = null;
    ringSticky.addEventListener('pointermove', (e) => {
      const c = e.target.closest('a, button:not(.showcase__card)') ? null : ringCardAt(e.clientX, e.clientY);
      if (c !== hovered) { hovered && tilts.get(hovered)?.leave(); hovered = c; }
      c && tilts.get(c)?.move(e);
      ringSticky.classList.toggle('is-pointing', !!c);
    });
    ringSticky.addEventListener('pointerleave', () => { hovered && tilts.get(hovered)?.leave(); hovered = null; ringSticky.classList.remove('is-pointing'); });
    ringSticky.addEventListener('click', (e) => {
      if (e.target.closest('a, button:not(.showcase__card)')) return;
      const c = ringCardAt(e.clientX, e.clientY);
      if (c) { hovered && tilts.get(hovered)?.leave(); hovered = null; openVideo?.(c); }
    });
  }

  /* ======================================================================
     Video overlay — the thumbnail grows into the player (FLIP), YouTube
     (privacy-enhanced, no cookies) only loads after a click.
     ====================================================================== */
  const player = $('[data-player]');
  if (player) {
    const frame = $('[data-player-frame]', player);
    const dialog = $('.player__dialog', player);
    const backdrop = $('.player__backdrop', player);
    const titleEl = $('[data-player-title]', player);
    const ask = $('[data-player-ask]', player);
    const closeBtn = $('.player__close', player);
    const EASE_OPEN = 'cubic-bezier(.16, 1, .3, 1)';
    const EASE_CLOSE = 'cubic-bezier(.5, 0, .2, 1)';
    let source = null, current = null, busy = false;

    const sourceRect = () => {
      const el = source && ($('.tilt', source) || source);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const onScreen = r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
      return onScreen ? r : null;
    };
    const flip = (from, to) => {
      const sx = from.width / to.width, sy = from.height / to.height;
      return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})`;
    };

    const open = (btn) => {
      if (busy || !player.hidden) return;
      busy = true;
      source = btn;
      current = { id: btn.dataset.video, title: btn.dataset.title };
      const thumb = $('img', btn)?.getAttribute('src') || '';
      frame.innerHTML = `<img src="${thumb}" alt="">`;
      titleEl.textContent = current.title;
      player.hidden = false;
      player.classList.add('is-anim');
      root.classList.add('player-open');
      setRingPaused(true);

      const loadVideo = () => {
        // No YouTube connection without consent (TDDDG § 25 / GDPR): ask inside the player first
        if (!consent.has('youtube')) {
          const gate = document.createElement('div');
          gate.className = 'player__consent';
          gate.innerHTML = `
            <p><strong>Externes Video von YouTube</strong>Beim Abspielen wird eine Verbindung zu YouTube (Google) aufgebaut. Dabei können personenbezogene Daten, z.&nbsp;B. deine IP-Adresse, in die USA übertragen und Cookies gesetzt werden. Mehr in der <a href="privacy.html#youtube">Datenschutzerklärung</a>.</p>
            <div class="player__consent-actions">
              <button class="btn btn--accent btn--sm" type="button" data-yt-once>Video laden <span class="btn__icon"><svg width="14" height="14"><use href="#i-play"/></svg></span></button>
              <button class="btn btn--light btn--sm" type="button" data-yt-always>YouTube immer erlauben</button>
            </div>`;
          frame.appendChild(gate);
          $('[data-yt-once]', gate).addEventListener('click', () => { gate.remove(); embed(); });
          $('[data-yt-always]', gate).addEventListener('click', () => { consent.set('youtube'); gate.remove(); embed(); });
          player.classList.remove('is-anim');
          busy = false;
          $('[data-yt-once]', gate).focus({ preventScroll: true });
          return;
        }
        embed();
        player.classList.remove('is-anim');
        busy = false;
        closeBtn.focus({ preventScroll: true });
      };
      const embed = () => {
        const f = document.createElement('iframe');
        f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(current.id)}?autoplay=1&rel=0&playsinline=1`;
        f.title = current.title;
        f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        f.allowFullscreen = true;
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        f.addEventListener('load', () => f.classList.add('is-ready'), { once: true });
        frame.appendChild(f);
      };

      const from = sourceRect();
      if (reduceMotion || !from || !frame.animate) { loadVideo(); return; }
      const to = frame.getBoundingClientRect();
      const tiltEl = $('.tilt', source);
      if (tiltEl) tiltEl.style.visibility = 'hidden';
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: 'ease-out' });
      frame.animate(
        [{ transform: flip(from, to), boxShadow: '0 0 0 rgba(0,0,0,0)' }, { transform: 'none' }],
        { duration: 760, easing: EASE_OPEN }
      ).finished.then(loadVideo);
    };

    const close = () => {
      if (busy || player.hidden) return Promise.resolve();
      busy = true;
      const iframe = $('iframe', frame);
      iframe && iframe.remove(); // stops playback immediately
      player.classList.add('is-anim');
      const done = () => {
        player.hidden = true;
        player.classList.remove('is-anim');
        frame.innerHTML = '';
        root.classList.remove('player-open');
        setRingPaused(false);
        const tiltEl = source && $('.tilt', source);
        if (tiltEl) tiltEl.style.visibility = '';
        const focusTo = source && source.getAttribute('tabindex') !== '-1' ? source : null;
        focusTo?.focus({ preventScroll: true });
        busy = false;
      };
      if (reduceMotion || !frame.animate) { done(); return Promise.resolve(); }
      const to = frame.getBoundingClientRect();
      const from = sourceRect();
      backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 480, easing: 'ease-in', fill: 'forwards' });
      const anim = from
        ? frame.animate([{ transform: 'none' }, { transform: flip(from, to) }], { duration: 560, easing: EASE_CLOSE, fill: 'forwards' })
        : dialog.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(.94)', opacity: 0 }], { duration: 360, easing: EASE_CLOSE, fill: 'forwards' });
      return anim.finished.then(() => {
        done();
        frame.getAnimations().forEach((a) => a.cancel());
        dialog.getAnimations().forEach((a) => a.cancel());
        backdrop.getAnimations().forEach((a) => a.cancel());
      });
    };

    openVideo = open;
    $$('[data-video]:not(.showcase__card)').forEach((btn) => btn.addEventListener('click', () => open(btn)));
    $$('[data-player-close]', player).forEach((el) => el.addEventListener('click', close));
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!player.hidden) close(); else setMenu(false);
    });
    // Keep keyboard focus inside the dialog while it is open
    document.addEventListener('focusin', (e) => {
      if (!player.hidden && !player.contains(e.target)) closeBtn.focus({ preventScroll: true });
    });
    ask?.addEventListener('click', (e) => {
      e.preventDefault();
      const title = current?.title;
      close().then(() => {
        prefill('Buy or license a video', title);
        document.getElementById('contact')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });
  } else {
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- Prefill the contact form from "collaborate" links ---------- */
  function prefill(request, video) {
    const f = $('[data-form]');
    if (!f) return;
    const req = $('select[name="request"]', f);
    const vid = $('select[name="video"]', f);
    if (req && request) req.value = request;
    if (vid && video !== undefined) vid.value = video || '';
  }
  $$('[data-request]').forEach((a) => a.addEventListener('click', () => prefill(a.dataset.request)));

  /* ======================================================================
     Canvas helpers
     ====================================================================== */
  const hash3 = (x, y, z) => {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const noise3 = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const l = (a, b, t) => a + (b - a) * t;
    const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
    return l(
      l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
      l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
      w
    );
  };

  /** Runs `draw(t)` in a rAF loop only while the canvas is on screen. */
  const animate = (canvas, draw, layout) => {
    let raf = 0, visible = false, last = 0;
    const t0 = performance.now();
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 1000 / 45) return; // ~45 fps is plenty for dots
      last = now;
      draw((now - t0) / 1000);
    };
    const start = () => { if (!raf && visible && !document.hidden && !reduceMotion) raf = requestAnimationFrame(frame); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    layout();
    draw(reduceMotion ? 4 : 0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }).observe(canvas);
    } else { visible = true; start(); }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { layout(); draw(reduceMotion ? 4 : (performance.now() - t0) / 1000); }, 150);
    });
  };

  /* ---------- Dot-matrix moon ---------- */
  const initMoon = (canvas) => {
    const ctx = canvas.getContext('2d');
    const mode = canvas.dataset.moon || 'hero';
    const DOT = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#0b0e17';
    const ACC = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#174dff';
    let w = 0, h = 0, dpr = 1, sp = 9, R = 100, cx = 0, cy = 0;
    let disk = [], halo = [], stars = [];
    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };

    const layout = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      if (!w || !h) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      sp = w < 600 ? 7 : 9;
      if (mode === 'center') { R = Math.min(w, h) * 0.3; cx = w / 2; cy = h / 2; }
      else if (w < 961) { R = Math.min(w * 0.36, h * 0.17); cx = w * 0.5; cy = 72 + R * 1.25; }
      else { R = Math.min(h * 0.35, w * 0.22); cx = w * 0.26; cy = h * 0.44; }

      disk = []; halo = []; stars = [];
      const ext = R * 1.8;
      const x0 = Math.floor((cx - ext) / sp) * sp + sp / 2;
      const y0 = Math.floor((cy - ext) / sp) * sp + sp / 2;
      for (let y = y0; y < cy + ext; y += sp) {
        for (let x = x0; x < cx + ext; x += sp) {
          const dx = (x - cx) / R, dy = (y - cy) / R, d2 = dx * dx + dy * dy;
          if (d2 <= 1) {
            const nz = Math.sqrt(1 - d2);
            const maria = noise3(dx * 1.7 + 11, dy * 1.7 + 7, nz * 1.7 + 3);
            const detail = noise3(dx * 7 + 1, dy * 7 + 2, nz * 7 + 5);
            let tex = 0.8 + 0.2 * detail;
            if (maria < 0.48) tex *= 0.5 + 0.5 * (maria / 0.48);
            disk.push(x, y, dx, dy, nz, tex);
          } else if (d2 < 3.24) {
            halo.push(x, y, dx, dy, Math.sqrt(d2));
          }
        }
      }
      const count = Math.round((w * h) / 14000);
      for (let i = 0; i < count; i++) {
        stars.push(Math.round(Math.random() * w / sp) * sp + sp / 2, Math.round(Math.random() * h / sp) * sp + sp / 2, Math.random() * 6.28, 0.4 + Math.random() * 0.6);
      }
    };

    const draw = (t) => {
      if (!w || !h) return;
      mouse.sx += (mouse.x - mouse.sx) * 0.05;
      mouse.sy += (mouse.y - mouse.sy) * 0.05;
      const scrollShift = mode === 'hero' ? Math.min(window.scrollY, h) * 0.18 : 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // stars
      ctx.fillStyle = DOT;
      for (let i = 0; i < stars.length; i += 4) {
        const a = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.2 * stars[i + 3] + stars[i + 2]));
        ctx.globalAlpha = a;
        ctx.fillRect(stars[i] - 0.75, stars[i + 1] - 0.75 - scrollShift * 0.3, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;

      ctx.setTransform(dpr, 0, 0, dpr, mouse.sx * 14 * dpr, (mouse.sy * 10 - scrollShift) * dpr);

      // light direction: slowly sweeping phase + mouse
      const az = 0.95 + Math.sin(t * 0.16) * 0.42 + mouse.sx * 0.35;
      const el = 0.32 - mouse.sy * 0.25;
      let Lx = Math.sin(az) * Math.cos(el), Ly = -Math.sin(el), Lz = Math.cos(az) * Math.cos(el);
      const half = sp * 0.5;

      ctx.beginPath();
      const accent = [];
      for (let i = 0; i < disk.length; i += 6) {
        const nx = disk[i + 2], ny = disk[i + 3], nz = disk[i + 4], tex = disk[i + 5];
        const lam = nx * Lx + ny * Ly + nz * Lz;
        let v = lam > 0 ? Math.pow(lam, 0.7) * tex : 0;
        v = Math.max(v, 0.06 * tex) + Math.pow(1 - nz, 4) * 0.25;
        if (lam > -0.06 && lam < 0.05 && tex > 0.55) accent.push(disk[i], disk[i + 1]);
        const r = half * Math.min(1, v) * 1.02;
        if (r < 0.35) continue;
        ctx.moveTo(disk[i] + r, disk[i + 1]);
        ctx.arc(disk[i], disk[i + 1], r, 0, 6.2832);
      }
      for (let i = 0; i < halo.length; i += 5) {
        const dx = halo[i + 2], dy = halo[i + 3], d = halo[i + 4];
        const side = 0.55 + 0.45 * Math.max(0, (dx * Lx + dy * Ly) / d);
        const v = 0.2 * Math.pow(Math.max(0, 1 - (d - 1) / 0.8), 2.4) * side;
        const r = half * v;
        if (r < 0.3) continue;
        ctx.moveTo(halo[i] + r, halo[i + 1]);
        ctx.arc(halo[i], halo[i + 1], r, 0, 6.2832);
      }
      ctx.fillStyle = DOT;
      ctx.fill();

      if (accent.length) {
        ctx.beginPath();
        const r = half * 0.42;
        for (let i = 0; i < accent.length; i += 2) {
          ctx.moveTo(accent[i] + r, accent[i + 1]);
          ctx.arc(accent[i], accent[i + 1], r, 0, 6.2832);
        }
        ctx.fillStyle = ACC;
        ctx.fill();
      }
    };

    window.addEventListener('pointermove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    animate(canvas, draw, layout);
  };

  $$('canvas[data-moon]').forEach(initMoon);

  /* ======================================================================
     Contact form
     data-endpoint=""            → mailto fallback (opens email app)
     data-endpoint="contact.php" → PHP mailer (see contact.php)
     data-endpoint="https://…"   → Formspree or any JSON form service
     ====================================================================== */
  $$('[data-form]').forEach((f) => {
    const status = $('[data-status]', f);
    const submit = $('button[type="submit"]', f);
    const setStatus = (msg, type) => {
      if (!status) return;
      status.innerHTML = msg;
      status.className = 'form__status' + (type ? ` is-${type}` : '');
    };

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!f.checkValidity()) {
        f.reportValidity();
        setStatus('Please fill in the required fields.', 'error');
        return;
      }
      const hp = $('input[name="company_url"]', f);
      if (hp && hp.value) return; // bot

      const data = new FormData(f);
      const endpoint = (f.dataset.endpoint || '').trim();
      const mailto = f.dataset.mailto || 'hello@midn1ghtz.com';

      if (!endpoint) {
        const lines = [
          `Name: ${data.get('name') || ''}`,
          `Email: ${data.get('email') || ''}`,
          `Request: ${data.get('request') || '-'}`,
          `Video: ${data.get('video') || '-'}`,
          '',
          `${data.get('message') || ''}`,
        ];
        const subject = `${data.get('request') || 'Request'} — ${data.get('name') || ''}`;
        window.location.href = `mailto:${mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
        setStatus(`Your email app should open now. Nothing happening? Write to <a href="mailto:${mailto}">${mailto}</a>.`, 'ok');
        return;
      }

      submit && (submit.disabled = true);
      setStatus('Sending…');
      try {
        const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        f.reset();
        setStatus('Thank you! I’ll get back to you soon.', 'ok');
      } catch (err) {
        setStatus(`Something went wrong. Please email <a href="mailto:${mailto}">${mailto}</a>.`, 'error');
      } finally {
        submit && (submit.disabled = false);
      }
    });
  });
})();
