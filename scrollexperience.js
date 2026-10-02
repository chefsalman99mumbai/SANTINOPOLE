/* ============================================================
   SANTINOPOLE — scrollexperience.js
   ------------------------------------------------------------
   The conductor. Owns the frame loop. Drives the camera along
   the 8-act path. Reads + smooths scroll. Broadcasts progress
   and act-change events to any subscriber (interface.js).

   Depends on: three.js, performance.js, environment.js
   Exposes:    window.SANTINOPOLE.scrollexperience
   ============================================================ */

(function () {
  'use strict';

  var S = window.SANTINOPOLE;
  var THREE = window.THREE;

  if (!S || !S.environment || !S.performance || !THREE) {
    console.error('[scrollexperience.js] three.js, performance.js and environment.js must load first.');
    return;
  }
  var Q = S.performance.Q;
  var camera = S.environment.camera;

  /* ============================================================
     1. THE 8 ACTS
     ============================================================ */
  var ACTS = [
    { id: 1, name: 'ARRIVAL',         subtitle: 'The city appears' },
    { id: 2, name: 'DESCENT',         subtitle: 'Through the atmosphere' },
    { id: 3, name: 'THE STREETS',     subtitle: 'Boulevard level' },
    { id: 4, name: 'FASHION',         subtitle: 'The Fashion District' },
    { id: 5, name: 'SHOPPING',        subtitle: 'The Grand Corso' },
    { id: 6, name: 'CANAL',           subtitle: 'Canal Quarter restaurants' },
    { id: 7, name: 'SANTINOPOLITANS', subtitle: 'The people' },
    { id: 8, name: 'THE CITY REVEAL', subtitle: 'The endless city' }
  ];

  function actIndexAt(p) {
    var i = Math.floor(p * ACTS.length);
    if (i < 0) i = 0;
    if (i >= ACTS.length) i = ACTS.length - 1;
    return i;
  }

  /* ============================================================
     2. CAMERA PATH — Milan-focused beats
     ============================================================ */
  var PATH = [
    /* ACT 01 — ARRIVAL (0.000 → 0.125) */
    { p: 0.000, pos: [   0, 1250, 1500], look: [   0,  60,  -60], fov: 62 },
    { p: 0.060, pos: [   0,  980, 1220], look: [   0,  50,  -40], fov: 61 },
    { p: 0.125, pos: [   0,  720,  920], look: [   0,  45,  -20], fov: 59 },

    /* ACT 02 — DESCENT (0.125 → 0.250) */
    { p: 0.165, pos: [  20,  540,  760], look: [   0,  45,  -20], fov: 57 },
    { p: 0.205, pos: [  60,  340,  600], look: [   0,  40,  -10], fov: 56 },
    { p: 0.250, pos: [  80,  180,  480], look: [   0,  35,  -10], fov: 55 },

    /* ACT 03 — THE STREETS (0.250 → 0.375) */
    { p: 0.275, pos: [  60,   70,  400], look: [   0,  20,  200], fov: 56 },
    { p: 0.305, pos: [  40,   14,  320], look: [   0,  10,  160], fov: 54 },
    { p: 0.340, pos: [  50,    8,  240], look: [   0,  10,   80], fov: 54 },
    { p: 0.375, pos: [ 120,    6,  180], look: [  80,   8,   60], fov: 55 },

    /* ACT 04 — FASHION (0.375 → 0.500) — Quadrilatero della Moda */
    { p: 0.410, pos: [ 200,   40,  120], look: [ 240,  30,  -40], fov: 56 },
    { p: 0.445, pos: [ 200,   26,  -40], look: [ 180,  20, -140], fov: 56 },
    { p: 0.480, pos: [ 140,   20, -100], look: [ 140,  16, -180], fov: 58 },
    { p: 0.500, pos: [ 100,   14, -140], look: [ 140,  12, -220], fov: 58 },

    /* ACT 05 — SHOPPING (0.500 → 0.625) — Corso Buenos Aires */
    { p: 0.535, pos: [ 240,   40,  -60], look: [ 340,  30,  -60], fov: 58 },
    { p: 0.570, pos: [ 380,   24,  -40], look: [ 480,  20,  -60], fov: 58 },
    { p: 0.605, pos: [ 500,   16,  -60], look: [ 620,  14,  -80], fov: 58 },
    { p: 0.625, pos: [ 620,   12,  -80], look: [ 760,  10, -100], fov: 58 },

    /* ACT 06 — CANAL (0.625 → 0.750) — Navigli */
    { p: 0.660, pos: [ 200,   30,  240], look: [ -40,  20,  320], fov: 58 },
    { p: 0.695, pos: [ -80,   20,  360], look: [-300,  16,  400], fov: 58 },
    { p: 0.725, pos: [-260,   14,  400], look: [-420,  12,  380], fov: 60 },
    { p: 0.750, pos: [-400,   12,  420], look: [-540,  10,  400], fov: 60 },

    /* ACT 07 — SANTINOPOLITANS (0.750 → 0.875) */
    { p: 0.785, pos: [-400,  140,  420], look: [-200,  60,  200], fov: 62 },
    { p: 0.820, pos: [-200,  300,  200], look: [   0,  60,    0], fov: 62 },
    { p: 0.855, pos: [   0,  460,   60], look: [   0,  60,  -60], fov: 62 },
    { p: 0.875, pos: [   0,  620,  -80], look: [   0,  55,  -20], fov: 62 },

    /* ACT 08 — THE CITY REVEAL (0.875 → 1.000) — endless horizon */
    { p: 0.895, pos: [   0,  950,  200], look: [   0,  55, -140], fov: 62 },
    { p: 0.935, pos: [   0, 1400,  600], look: [   0,  40, -260], fov: 64 },
    { p: 0.965, pos: [   0, 1600,  880], look: [   0,  30, -380], fov: 66 },
    { p: 1.000, pos: [   0, 1750, 1100], look: [   0,  20, -500], fov: 68 }
  ];

  /* ============================================================
     3. SAMPLE FOV
     ============================================================ */
  function sampleFov(p) {
    var i = 0;
    while (i < PATH.length - 2 && p > PATH[i + 1].p) i++;
    var a = PATH[i], b = PATH[i + 1];
    var span = b.p - a.p;
    var t = span > 0 ? Math.max(0, Math.min(1, (p - a.p) / span)) : 0;
    return a.fov + (b.fov - a.fov) * t;
  }

  /* ============================================================
     4. BUILD CURVES
     ============================================================ */
  function buildCurve(field) {
    var N = Math.max(40, Q.pathSamples);
    var pts = [];
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1);
      var k = 0;
      while (k < PATH.length - 2 && t > PATH[k + 1].p) k++;
      var a = PATH[k], b = PATH[k + 1];
      var span = b.p - a.p;
      var u = span > 0 ? Math.max(0, Math.min(1, (t - a.p) / span)) : 0;
      var av = a[field], bv = b[field];
      pts.push(new THREE.Vector3(
        av[0] + (bv[0] - av[0]) * u,
        av[1] + (bv[1] - av[1]) * u,
        av[2] + (bv[2] - av[2]) * u
      ));
    }
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  }
  var posCurve  = buildCurve('pos');
  var lookCurve = buildCurve('look');

  /* ============================================================
     5. SCROLL SETUP — LONG ENOUGH TO FEEL ENDLESS
     ============================================================ */
  var VH_MULT_DESKTOP = 55;   // 5500vh total scroll — around 10 min at slow scroll
  var VH_MULT_MOBILE  = 35;   // 3500vh — mobile thumb scrolling
  var spacer = document.getElementById('spacer');

  function setSpacerHeight() {
    if (!spacer) return;
    var vh = window.innerHeight;
    var mult = Q.isMobile ? VH_MULT_MOBILE : VH_MULT_DESKTOP;
    spacer.style.height = (vh * mult) + 'px';
  }
  setSpacerHeight();

  var scrollMax = 0;
  function refreshScrollMax() {
    scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }
  refreshScrollMax();

  /* ============================================================
     6. STATE
     ============================================================ */
  var state = {
    progress: 0,
    target: 0,
    velocity: 0,
    actIndex: 0,
    actChanged: false,
    paused: false,
    started: false,
    elapsed: 0,
    lastFrameTime: 0,
    rafId: 0
  };

  var frameInterval = (Q.fpsCap && Q.fpsCap < 60) ? (1000 / Q.fpsCap) : 0;

  var subscribers = [];
  var actListeners = [];

  function onProgress(fn) { if (typeof fn === 'function') subscribers.push(fn); }
  function onActChange(fn) { if (typeof fn === 'function') actListeners.push(fn); }

  function emitActChange(index, prevIndex) {
    for (var i = 0; i < actListeners.length; i++) {
      try { actListeners[i](index, prevIndex, ACTS[index]); } catch (e) {}
    }
  }

  /* ============================================================
     7. SCROLL READ
     ============================================================ */
  function readScroll() {
    if (scrollMax <= 0) refreshScrollMax();
    state.target = Math.max(0, Math.min(1, window.scrollY / scrollMax));
  }
  readScroll();
  window.addEventListener('scroll', readScroll, { passive: true });

  /* ============================================================
     8. RESIZE
     ============================================================ */
  window.addEventListener('resize', function () {
    setSpacerHeight();
    refreshScrollMax();
    readScroll();
  });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () {
      setSpacerHeight();
      refreshScrollMax();
      readScroll();
    }, 260);
  });

  /* ============================================================
     9. VISIBILITY
     ============================================================ */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      state.paused = true;
    } else {
      state.paused = false;
      state.lastFrameTime = performance.now();
    }
  });

  /* ============================================================
     10. FRAME LOOP
     ============================================================ */
  var _pos = new THREE.Vector3();
  var _look = new THREE.Vector3();
  var prevProgress = 0;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function frame(now) {
    state.rafId = requestAnimationFrame(frame);
    if (state.paused) return;

    if (frameInterval > 0) {
      if (state.lastFrameTime > 0) {
        var since = now - state.lastFrameTime;
        if (since < frameInterval - 1) return;
        state.lastFrameTime = now - (since % frameInterval);
      } else {
        state.lastFrameTime = now;
      }
    } else {
      state.lastFrameTime = now;
    }

    var dt = 0.016;
    if (!state.started) {
      state.started = true;
    } else {
      if (!state._prevNow) state._prevNow = now;
      dt = Math.min((now - state._prevNow) / 1000, 0.05);
      state._prevNow = now;
    }
    state.elapsed += dt;

    readScroll();

    var smoothBase = Q.scrollSmooth || 0.0022;
    var k = 1 - Math.pow(smoothBase, dt);
    state.progress += (state.target - state.progress) * k;
    if (Math.abs(state.target - state.progress) < 0.00001) {
      state.progress = state.target;
    }
    var p = state.progress;

    var rawVel = (p - prevProgress) / Math.max(dt, 0.001);
    state.velocity = state.velocity * 0.82 + rawVel * 0.18;
    prevProgress = p;

    _pos.copy(posCurve.getPoint(p));
    _look.copy(lookCurve.getPoint(p));

    camera.position.copy(_pos);
    camera.fov = sampleFov(p) + clamp(state.velocity * 0.4, -4, 6);
    camera.updateProjectionMatrix();
    camera.lookAt(_look);
    camera.rotateZ(clamp(state.velocity * 0.05, -0.05, 0.05));

    var newActIndex = actIndexAt(p);
    if (newActIndex !== state.actIndex) {
      var prevIdx = state.actIndex;
      state.actIndex = newActIndex;
      emitActChange(newActIndex, prevIdx);
    }

    S.environment.update(p, dt, state.elapsed);
    S.performance.measure();

    for (var i = 0; i < subscribers.length; i++) {
      try { subscribers[i](p, state.actIndex, dt, state.elapsed, state.velocity); } catch (e) {}
    }
  }

  /* ============================================================
     11. START / STOP
     ============================================================ */
  function start() {
    if (state.rafId) return;
    readScroll();
    state.progress = state.target;
    prevProgress = state.progress;
    state._prevNow = 0;
    state.rafId = requestAnimationFrame(frame);
  }
  function stop() {
    if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = 0; }
  }

  /* ============================================================
     12. EXPORT
     ============================================================ */
  S.scrollexperience = {
    ACTS: ACTS,
    PATH: PATH,
    actIndexAt: actIndexAt,
    start: start,
    stop: stop,
    onProgress: onProgress,
    onActChange: onActChange,
    state: state,
    getProgress: function () { return state.progress; },
    getActIndex: function () { return state.actIndex; },
    getAct: function () { return ACTS[state.actIndex]; },
    getVelocity: function () { return state.velocity; }
  };

  S.log('scrollexperience', true,
    ACTS.length + ' acts · ' +
    PATH.length + ' keys · ' +
    'scroll ' + VH_MULT_DESKTOP + 'vh · ' +
    (frameInterval ? 'capped ' + Q.fpsCap + 'fps' : 'uncapped'));

})();
