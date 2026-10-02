
/* ============================================================
   SANTINOPOLE — interface.js
   ------------------------------------------------------------
   The narrative layer. HUD, chapter typography, wayfinding,
   loader fade, CTA reveal. Subscribes to scrollexperience.

   Depends on: three.js, performance.js, scrollexperience.js
   Exposes:    window.SANTINOPOLE.interface
   ============================================================ */

(function () {
  'use strict';

  var S = window.SANTINOPOLE;
  if (!S || !S.scrollexperience) {
    console.error('[interface.js] scrollexperience.js must load first.');
    return;
  }

  /* ============================================================
     1. DOM REFERENCES
     ============================================================ */
  var el = {
    loader:        document.getElementById('loader'),
    loaderBar:     document.getElementById('loaderBar'),
    loaderLog:     document.getElementById('loaderLog'),
    err:           document.getElementById('err'),
    errMsg:        document.getElementById('errMsg'),

    chapter:       document.getElementById('chapter'),
    chNum:         document.getElementById('chNum'),
    chTitle:       document.getElementById('chTitle'),
    chText:        document.getElementById('chText'),

    progressFill:  document.getElementById('progressFill'),
    progressPct:   document.getElementById('progressPct'),
    progressAct:   document.getElementById('progressAct'),

    hint:          document.getElementById('hint'),

    hudSector:     document.getElementById('hudSector'),
    hudLon:        document.getElementById('hudLon'),
    hudLat:        document.getElementById('hudLat'),
    hudClock:      document.getElementById('hudClock'),

    wayfinding:    document.getElementById('wayfinding')
  };

  /* ============================================================
     2. CHAPTER CONTENT — one per act
     ============================================================ */
  var CHAPTERS = [
    {
      num:   'ACT I',
      title: 'The city appears.',
      text:  'Before you: Santinopole. A digital metropolis. Everything you will see belongs to it — the streets, the districts, the people. You are arriving.'
    },
    {
      num:   'ACT II',
      title: 'Through the atmosphere.',
      text:  'You descend. The city sharpens. Towers resolve into buildings. Buildings resolve into businesses. Businesses resolve into stories.'
    },
    {
      num:   'ACT III',
      title: 'Welcome to Santinopole.',
      text:  'Boulevard level. The traffic moves, the cafés fill, the storefronts open. This is not a representation. This is the city.'
    },
    {
      num:   'ACT IV',
      title: 'The Web Quarter.',
      text:  'A district built from digital infrastructure. Every building here is a website, an application, a system. We build these. This is our craft.'
    },
    {
      num:   'ACT V',
      title: 'The Index Ward.',
      text:  'Where information is discovered. Search signals flow along the pathways. Data moves between buildings. This district exists to be found.'
    },
    {
      num:   'ACT VI',
      title: 'The commercial heart.',
      text:  'We don\'t just build websites. We build digital cities for businesses. Traffic peaks. Windows begin to glow. Growth is not an abstraction here.'
    },
    {
      num:   'ACT VII',
      title: 'The Santinopolitans.',
      text:  'Pull back. Thousands of people. Thousands of businesses. Thousands of digital systems — all connected, all alive. These are the citizens of Santinopole.'
    },
    {
      num:   'ACT VIII',
      title: 'Everything, at once.',
      text:  'The city entire. Illuminated. Understood. What you have seen is not a metaphor for what we do — it is what we do.'
    }
  ];

  /* ============================================================
     3. HUD COORDINATES — one per act
     Fictional but geographically coherent.
     ============================================================ */
  var COORDS = [
    { sector: 'ARRIVAL',      lon: '00.0000° S', lat: '00.0000° W' },
    { sector: 'DESCENT',      lon: '00.4200° S', lat: '00.1400° E' },
    { sector: 'THE STREETS',  lon: '00.8100° S', lat: '00.4800° E' },
    { sector: 'WEB',          lon: '01.4400° S', lat: '02.0600° E' },
    { sector: 'SEO',          lon: '01.9100° S', lat: '02.4400° W' },
    { sector: 'GROWTH',       lon: '03.2200° S', lat: '00.0000° E' },
    { sector: 'SANTINOPOLITANS', lon: '02.1000° S', lat: '00.0000° E' },
    { sector: 'THE CITY REVEAL', lon: '00.0000° S', lat: '00.0000° W' }
  ];

  /* ============================================================
     4. TIME-OF-DAY CURVE
     The journey begins at 06:12 (dawn) and ends at 01:00 (deep night).
     ============================================================ */
  var START_MIN = 6 * 60 + 12;   // 372
  var END_MIN   = 25 * 60;       // 1500 (mod 24 → 1:00)

  function formatClock(minutes) {
    var m = Math.floor(minutes) % (24 * 60);
    if (m < 0) m += 24 * 60;
    var hh = Math.floor(m / 60);
    var mm = Math.floor(m % 60);
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }

  /* ============================================================
     5. CHAPTER TRANSITION
     Fades old text out, swaps, fades in.
     ============================================================ */
  var currentChapter = -1;
  var chapterFadeTimeout = null;
  var CHAPTER_FADE_OUT = 220;
  var CHAPTER_FADE_IN  = 520;

  function setChapter(index) {
    if (index === currentChapter) return;
    currentChapter = index;
    var ch = CHAPTERS[index];
    if (!ch || !el.chapter) return;

    // Fade out, swap, fade in
    el.chapter.style.opacity = '0';
    el.chapter.style.transform = 'translateY(14px)';

    if (chapterFadeTimeout) clearTimeout(chapterFadeTimeout);
    chapterFadeTimeout = setTimeout(function () {
      if (el.chNum)   el.chNum.textContent   = ch.num;
      if (el.chTitle) el.chTitle.textContent = ch.title;
      if (el.chText)  el.chText.textContent  = ch.text;
      el.chapter.style.opacity = '1';
      el.chapter.style.transform = 'translateY(0)';
    }, CHAPTER_FADE_OUT);
  }

  /* ============================================================
     6. HUD UPDATE — coordinates + clock
     ============================================================ */
  var lastSector = '';
  var lastLon = '';
  var lastLat = '';
  var lastClock = '';

  function updateHUD(progress, actIndex) {
    var coord = COORDS[actIndex] || COORDS[0];
    if (el.hudSector && coord.sector !== lastSector) {
      el.hudSector.textContent = coord.sector;
      lastSector = coord.sector;
    }
    if (el.hudLon && coord.lon !== lastLon) {
      el.hudLon.textContent = coord.lon;
      lastLon = coord.lon;
    }
    if (el.hudLat && coord.lat !== lastLat) {
      el.hudLat.textContent = coord.lat;
      lastLat = coord.lat;
    }
    var minutes = START_MIN + (END_MIN - START_MIN) * progress;
    var clock = formatClock(minutes);
    if (el.hudClock && clock !== lastClock) {
      el.hudClock.textContent = clock;
      lastClock = clock;
    }
  }

  /* ============================================================
     7. PROGRESS BAR + ACT LABEL
     ============================================================ */
  var lastPct = -1;
  var lastActLabel = '';
  var ACT_LABELS = [
    'ACT I — ARRIVAL',
    'ACT II — DESCENT',
    'ACT III — THE STREETS',
    'ACT IV — WEB',
    'ACT V — SEO',
    'ACT VI — GROWTH',
    'ACT VII — SANTINOPOLITANS',
    'ACT VIII — THE CITY REVEAL'
  ];

  function updateProgress(progress, actIndex) {
    if (el.progressFill) {
      // Use transform: scaleX — no layout, GPU-composited
      el.progressFill.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
      el.progressFill.style.transformOrigin = 'left center';
      // Remove width-based styling from CSS default
      if (el.progressFill.style.width && el.progressFill.style.width !== '100%') {
        el.progressFill.style.width = '100%';
      }
    }
    var pct = Math.round(progress * 100);
    if (el.progressPct && pct !== lastPct) {
      el.progressPct.textContent = (pct < 10 ? '0' : '') + pct + '%';
      lastPct = pct;
    }
    var label = ACT_LABELS[actIndex] || ACT_LABELS[0];
    if (el.progressAct && label !== lastActLabel) {
      el.progressAct.textContent = label;
      lastActLabel = label;
    }
  }

  /* ============================================================
     8. WAYFINDING NAV — highlight active district
     Mapping: act index → district key
     ============================================================ */
  var ACT_TO_DISTRICT = [
    'city',    // ARRIVAL
    'city',    // DESCENT
    'city',    // THE STREETS
    'web',     // WEB
    'seo',     // SEO
    'growth',  // GROWTH
    'growth',  // SANTINOPOLITANS (people, growth)
    'city'     // THE CITY REVEAL
  ];

  var wayLinks = el.wayfinding ? el.wayfinding.querySelectorAll('a[data-district]') : [];
  var lastDistrict = '';

  function updateWayfinding(actIndex) {
    var key = ACT_TO_DISTRICT[actIndex] || 'city';
    if (key === lastDistrict) return;
    lastDistrict = key;
    for (var i = 0; i < wayLinks.length; i++) {
      var linkKey = wayLinks[i].getAttribute('data-district');
      if (linkKey === key) wayLinks[i].classList.add('is-active');
      else wayLinks[i].classList.remove('is-active');
    }
  }

  /* ============================================================
     9. CTA REVEAL — appears only at end of ACT VIII
     ============================================================ */
  var ctaRevealed = false;
  var ctaContainer = null;

  function buildCTA() {
    if (ctaContainer) return ctaContainer;
    ctaContainer = document.createElement('div');
    ctaContainer.className = 'cta-reveal';
    ctaContainer.innerHTML =
      '<div class="cta-line">SANTINOPOLE DIGITAL</div>' +
      '<div class="cta-sub">WEB &nbsp;•&nbsp; SEO &nbsp;•&nbsp; GROWTH</div>' +
      '<div class="cta-actions">' +
        '<a class="cta-primary" href="#enter">ENTER SANTINOPOLE</a>' +
        '<a class="cta-secondary" href="#build">BUILD YOUR DISTRICT</a>' +
      '</div>';
    document.body.appendChild(ctaContainer);

    // Inject styles once
    if (!document.getElementById('ctaStyles')) {
      var st = document.createElement('style');
      st.id = 'ctaStyles';
      st.textContent = [
        '.cta-reveal {',
        '  position: fixed; left: 0; right: 0; bottom: clamp(90px, 14vh, 140px);',
        '  z-index: 7; pointer-events: none;',
        '  display: flex; flex-direction: column; align-items: center; gap: 18px;',
        '  opacity: 0; transform: translateY(18px);',
        '  transition: opacity 1200ms cubic-bezier(.22,1,.36,1), transform 1200ms cubic-bezier(.22,1,.36,1);',
        '  text-align: center; padding: 0 24px;',
        '}',
        '.cta-reveal.is-visible { opacity: 1; transform: translateY(0); pointer-events: auto; }',
        '.cta-line {',
        '  font-family: Georgia, serif; font-weight: 400;',
        '  font-size: clamp(20px, 3.4vw, 40px); letter-spacing: 0.32em;',
        '  text-transform: uppercase; color: #f6efe0;',
        '  text-shadow: 0 4px 44px rgba(0,0,0,0.92);',
        '}',
        '.cta-sub {',
        '  font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;',
        '  font-size: clamp(9px, 0.9vw, 11px); letter-spacing: 0.5em;',
        '  text-transform: uppercase; color: #d4a24a;',
        '  margin-top: -6px; opacity: 0.92;',
        '}',
        '.cta-actions {',
        '  display: flex; gap: 14px; margin-top: 12px; flex-wrap: wrap;',
        '  justify-content: center; align-items: center;',
        '}',
        '.cta-primary, .cta-secondary {',
        '  font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;',
        '  font-size: 10px; letter-spacing: 0.42em; text-transform: uppercase;',
        '  padding: 14px 26px; border-radius: 2px; text-decoration: none;',
        '  transition: background 400ms cubic-bezier(.22,1,.36,1), color 400ms cubic-bezier(.22,1,.36,1), border-color 400ms cubic-bezier(.22,1,.36,1);',
        '  cursor: pointer;',
        '}',
        '.cta-primary {',
        '  background: #d4a24a; color: #050708;',
        '  border: 1px solid #d4a24a;',
        '}',
        '.cta-primary:hover { background: #f2d29a; border-color: #f2d29a; }',
        '.cta-secondary {',
        '  background: transparent; color: #f6efe0;',
        '  border: 1px solid rgba(246,239,224,0.28);',
        '}',
        '.cta-secondary:hover { border-color: #d4a24a; color: #d4a24a; }',
        '@media (max-width: 640px) {',
        '  .cta-reveal { bottom: clamp(120px, 20vh, 180px); gap: 14px; }',
        '  .cta-actions { flex-direction: column; gap: 10px; }',
        '  .cta-primary, .cta-secondary { padding: 12px 22px; }',
        '}'
      ].join('\n');
      document.head.appendChild(st);
    }
    return ctaContainer;
  }

  function checkCTA(progress) {
    if (progress < 0.965) {
      if (ctaRevealed && ctaContainer) {
        ctaContainer.classList.remove('is-visible');
        ctaRevealed = false;
      }
      return;
    }
    if (ctaRevealed) return;
    ctaRevealed = true;
    if (!ctaContainer) buildCTA();
    // Fade in after a beat — the camera has to settle into the reveal
    setTimeout(function () {
      if (ctaContainer) ctaContainer.classList.add('is-visible');
    }, 600);
  }

  /* ============================================================
     10. HINT FADE
     Hide the scroll hint as soon as the user scrolls.
     ============================================================ */
  var hintHidden = false;
  window.addEventListener('scroll', function () {
    if (!hintHidden && window.scrollY > 40) {
      hintHidden = true;
      if (el.hint) el.hint.style.opacity = '0';
    }
  }, { passive: true });

  // Mobile: swipe language
  if (S.performance && S.performance.Q && S.performance.Q.isMobile) {
    var hintLabel = el.hint ? el.hint.querySelector('.hint-label') : null;
    if (hintLabel) hintLabel.textContent = 'Swipe to travel';
  }

  /* ============================================================
     11. SUBSCRIBE TO SCROLL EXPERIENCE
     ============================================================ */
  function handleProgress(progress, actIndex) {
    updateProgress(progress, actIndex);
    updateHUD(progress, actIndex);
    updateWayfinding(actIndex);
    checkCTA(progress);
  }

  function handleActChange(actIndex) {
    setChapter(actIndex);
  }

  S.scrollexperience.onProgress(handleProgress);
  S.scrollexperience.onActChange(handleActChange);

  // Force initial chapter paint
  setChapter(0);
  updateProgress(0, 0);
  updateHUD(0, 0);
  updateWayfinding(0);

  /* ============================================================
     12. LOADER ORCHESTRATION
     When the world is ready (main.js signals), fade the loader,
     reveal the HUD, then show the wayfinding nav after a beat.
     ============================================================ */
  function revealHUD() {
    // Loader fade out
    if (el.loader) {
      el.loader.classList.add('done');
    }
    // Wayfinding appears after the loader has faded
    setTimeout(function () {
      document.body.classList.add('wayfinding-visible');
    }, 900);
    // Body ready class — CSS uses this if needed
    document.body.classList.add('is-ready');
  }

  /* ============================================================
     13. ERROR HANDLING (graceful)
     If main.js catches a fatal error, it will call this.
     ============================================================ */
  function showError(msg) {
    if (el.errMsg && msg) el.errMsg.innerHTML = msg;
    if (el.err) el.err.classList.add('is-visible');
    if (el.loader) el.loader.classList.add('done');
  }

  /* ============================================================
     14. EXPORT
     ============================================================ */
  S.interface = {
    revealHUD: revealHUD,
    showError: showError,
    setChapter: setChapter,
    updateProgress: updateProgress,
    updateHUD: updateHUD,
    updateWayfinding: updateWayfinding,
    // Debug: force the CTA visible (call from console)
    _forceCTA: function () {
      if (!ctaContainer) buildCTA();
      ctaContainer.classList.add('is-visible');
      ctaRevealed = true;
    }
  };

  S.log('interface', true, CHAPTERS.length + ' chapters · HUD ready · CTA armed');

})();
