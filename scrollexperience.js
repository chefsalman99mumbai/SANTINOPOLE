/* ============================================================
   SANTINOPOLE — scrollexperience.js — MARINE DRIVE
   ------------------------------------------------------------
   Camera flies along the C-curve. 8 acts. Dawn → sunset.
   ============================================================ */

(function () {
  'use strict';
  var S = window.SANTINOPOLE;
  var THREE = window.THREE;
  if (!S || !S.environment || !S.performance || !THREE) { console.error('deps'); return; }
  var Q = S.performance.Q;
  var camera = S.environment.camera;

  var ACTS = [
    { id: 1, name: 'ARRIVAL',      subtitle: 'The curve appears' },
    { id: 2, name: 'DESCENT',      subtitle: 'Down to the shore' },
    { id: 3, name: 'THE STREET',   subtitle: 'Boulevard level' },
    { id: 4, name: 'THE FACADES',  subtitle: 'Art Deco morning' },
    { id: 5, name: 'THE PROMENADE',subtitle: 'Along the sea wall' },
    { id: 6, name: 'CHOWPATTY',    subtitle: 'The end of the arc' },
    { id: 7, name: 'THE TURN',     subtitle: 'Looking back' },
    { id: 8, name: 'THE NECKLACE', subtitle: 'Sunset over the sea' }
  ];

  function actIndexAt(p) {
    var i = Math.floor(p * ACTS.length);
    if (i < 0) i = 0;
    if (i >= ACTS.length) i = ACTS.length - 1;
    return i;
  }

  /* ============================================================
     CAMERA PATH — hand-authored beats along the curve
     ============================================================ */
  var PATH = [
    /* ---- ACT I — ARRIVAL (0.000 – 0.125) ----
       High above the Arabian Sea, far out. The whole curve visible. Dawn. */
    { p: 0.000, pos: [  760, 1000,  950], look: [ 450,  30, -150], fov: 62 },
    { p: 0.060, pos: [  700,  800,  780], look: [ 450,  30, -150], fov: 61 },
    { p: 0.125, pos: [  630,  540,  560], look: [ 420,  40, -130], fov: 59 },

    /* ---- ACT II — DESCENT (0.125 – 0.250) ----
       Fall through morning haze toward the shoreline. */
    { p: 0.165, pos: [  520,  320,  320], look: [ 360,  40,  -90], fov: 57 },
    { p: 0.205, pos: [  340,  160,  160], look: [ 260,  35,  -60], fov: 56 },
    { p: 0.250, pos: [  190,   72,   50], look: [ 200,  22,  -30], fov: 55 },

    /* ---- ACT III — THE STREET (0.250 – 0.375) ----
       Street level at the start of the curve. Buildings left, sea right. */
    { p: 0.275, pos: [   80,   24,   15], look: [ 220,  20,  -30], fov: 55 },
    { p: 0.305, pos: [  100,   10,    8], look: [ 300,  18,  -50], fov: 54 },
    { p: 0.345, pos: [  200,    8,  -12], look: [ 400,  16,  -70], fov: 54 },
    { p: 0.375, pos: [  300,    8,  -32], look: [ 500,  16,  -95], fov: 55 },

    /* ---- ACT IV — THE FACADES (0.375 – 0.500) ----
       Cruising along, watching the Art Deco palazzi slide by. */
    { p: 0.410, pos: [  380,    7,  -52], look: [ 560,  15, -110], fov: 55 },
    { p: 0.445, pos: [  450,    7,  -75], look: [ 630,  15, -130], fov: 54 },
    { p: 0.480, pos: [  520,    8,  -98], look: [ 700,  15, -155], fov: 54 },
    { p: 0.500, pos: [  560,    9, -112], look: [ 740,  18, -170], fov: 55 },

    /* ---- ACT V — THE PROMENADE (0.500 – 0.625) ----
       Lower and slower. Sea wall on the right. Palms. Lamps. */
    { p: 0.540, pos: [  640,    6, -145], look: [ 810,  16, -210], fov: 54 },
    { p: 0.580, pos: [  720,    6, -180], look: [ 860,  20, -240], fov: 54 },
    { p: 0.620, pos: [  800,    9, -215], look: [ 880,  25, -270], fov: 54 },
    { p: 0.625, pos: [  830,   12, -240], look: [ 900,  28, -285], fov: 55 },

    /* ---- ACT VI — CHOWPATTY (0.625 – 0.750) ----
       Reached the far end. Slowing. The last of the road curves out. */
    { p: 0.660, pos: [  855,   18, -260], look: [ 760,  30, -200], fov: 55 },
    { p: 0.695, pos: [  830,   30, -235], look: [ 620,  35, -130], fov: 56 },
    { p: 0.730, pos: [  700,   48, -170], look: [ 480,  40,  -70], fov: 57 },
    { p: 0.750, pos: [  590,   60, -120], look: [ 380,  50,   20], fov: 59 },

    /* ---- ACT VII — THE TURN (0.750 – 0.875) ----
       Rise up and turn back over the sea to face the whole curve. */
    { p: 0.785, pos: [  620,  180,   60], look: [ 450,  50, -150], fov: 60 },
    { p: 0.820, pos: [  650,  340,  220], look: [ 450,  45, -150], fov: 60 },
    { p: 0.855, pos: [  660,  500,  370], look: [ 450,  40, -150], fov: 60 },
    { p: 0.875, pos: [  665,  620,  470], look: [ 450,  35, -150], fov: 60 },

    /* ---- ACT VIII — THE NECKLACE (0.875 – 1.000) ----
       Highest and widest. The full curve at sunset. */
    { p: 0.910, pos: [  700,  780,  590], look: [ 450,  30, -150], fov: 62 },
    { p: 0.955, pos: [  760,  920,  720], look: [ 450,  25, -150], fov: 64 },
    { p: 1.000, pos: [  810, 1050,  840], look: [ 450,  20, -150], fov: 66 }
  ];

  function sampleFov(p) {
    var i = 0;
    while (i < PATH.length - 2 && p > PATH[i + 1].p) i++;
    var a = PATH[i], b = PATH[i + 1];
    var span = b.p - a.p;
    var t = span > 0 ? Math.max(0, Math.min(1, (p - a.p) / span)) : 0;
    return a.fov + (b.fov - a.fov) * t;
  }

  function buildCurve(field) {
    var N = Math.max(60, Q.pathSamples || 200);
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
  var posCurve = buildCurve('pos');
  var lookCurve = buildCurve('look');

  /* ============================================================
     SCROLL — long, cinematic
     ============================================================ */
  var VH_MULT_DESKTOP = 42;
  var VH_MULT_MOBILE  = 26;
  var spacer = document.getElementById('spacer');

  function setSpacerHeight() {
    if (!spacer) return;
    var vh = window.innerHeight;
    var mult = Q.isMobile ? VH_MULT_MOBILE : VH_MULT_DESKTOP;
    spacer.style.height = (vh * mult) + 'px';
  }
  setSpacerHeight();

  var scrollMax = 0;
  function refreshScrollMax() { scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight); }
  refreshScrollMax();

  var state = {
    progress: 0, target: 0, velocity: 0,
    actIndex: 0, paused: false, started: false,
    elapsed: 0, lastFrameTime: 0, rafId: 0
  };

  var frameInterval = (Q.fpsCap && Q.fpsCap < 60) ? (1000 / Q.fpsCap) : 0;
  var subscribers = [];
  var actListeners = [];

  function onProgress(fn) { if (typeof fn === 'function') subscribers.push(fn); }
  function onActChange(fn) { if (typeof fn === 'function') actListeners.push(fn); }
  function emitActChange(idx, prev) {
    for (var i = 0; i < actListeners.length; i++) {
      try { actListeners[i](idx, prev, ACTS[idx]); } catch (e) {}
    }
  }

  function readScroll() {
    if (scrollMax <= 0) refreshScrollMax();
    state.target = Math.max(0, Math.min(1, window.scrollY / scrollMax));
  }
  readScroll();
  window.addEventListener('scroll', readScroll, { passive: true });

  window.addEventListener('resize', function () {
    setSpacerHeight(); refreshScrollMax(); readScroll();
  });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () { setSpacerHeight(); refreshScrollMax(); readScroll(); }, 260);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) state.paused = true;
    else { state.paused = false; state.lastFrameTime = performance.now(); }
  });

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
      } else state.lastFrameTime = now;
    } else state.lastFrameTime = now;

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

    var smoothBase = Q.scrollSmooth || 0.0024;
    var k = 1 - Math.pow(smoothBase, dt);
    state.progress += (state.target - state.progress) * k;
    if (Math.abs(state.target - state.progress) < 0.00001) state.progress = state.target;
    var p = state.progress;

    var rawVel = (p - prevProgress) / Math.max(dt, 0.001);
    state.velocity = state.velocity * 0.82 + rawVel * 0.18;
    prevProgress = p;

    _pos.copy(posCurve.getPoint(p));
    _look.copy(lookCurve.getPoint(p));

    camera.position.copy(_pos);
    camera.fov = sampleFov(p) + clamp(state.velocity * 0.5, -5, 6);
    camera.updateProjectionMatrix();
    camera.lookAt(_look);
    // Subtle roll from velocity
    camera.rotateZ(clamp(state.velocity * 0.06, -0.06, 0.06));

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

  S.scrollexperience = {
    ACTS: ACTS, PATH: PATH,
    actIndexAt: actIndexAt,
    start: start, stop: stop,
    onProgress: onProgress, onActChange: onActChange,
    state: state,
    getProgress: function () { return state.progress; },
    getActIndex: function () { return state.actIndex; },
    getAct: function () { return ACTS[state.actIndex]; },
    getVelocity: function () { return state.velocity; }
  };

  S.log('scrollexperience', true,
    ACTS.length + ' acts · ' + PATH.length + ' keys · Marine Drive');

})();
