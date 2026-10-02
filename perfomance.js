/* ============================================================
   SANTINOPOLE — performance.js
   ------------------------------------------------------------
   Device tier detection + adaptive quality + frame budget
   enforcement. Produces S.performance.Q — the single source
   of truth for every budget in the world.

   Depends on: three.js (for S.capabilities + S.log)
   Exposes:    window.SANTINOPOLE.performance.{Q, tier, adapt,
               measure, onTierChange}
   ============================================================ */

(function () {
  'use strict';

  var S = window.SANTINOPOLE;
  if (!S) {
    console.error('[performance.js] three.js must load first.');
    return;
  }

  /* ============================================================
     1. RAW SIGNALS — real numbers, not user-agent guessing
     ============================================================ */

  function readSignals() {
    var caps = S.capabilities || {};

    var dpr = Math.min(
      window.devicePixelRatio || 1,
      caps.maxTextureSize >= 8192 ? 2.5 : 2
    );

    var shortSide = Math.min(window.innerWidth, window.innerHeight);
    var longSide  = Math.max(window.innerWidth, window.innerHeight);

    var cores = navigator.hardwareConcurrency || 4;

    // deviceMemory is Chromium-only. Treat 0 as "unknown = 4 GB" (safe mid).
    var memoryGB = navigator.deviceMemory || 0;
    var memoryAssumed = memoryGB === 0;

    var ua = (navigator.userAgent || '').toLowerCase();
    var isIOS = /iphone|ipad|ipod/.test(ua) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isAndroid = /android/.test(ua);
    var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    var isMobile = (isIOS || isAndroid || isTouch) && shortSide < 820;

    // GPU is a strong signal. Catch integrated/software/low-end renderers.
    var gpu = (caps.rendererString || '').toLowerCase();
    var isSoftwareGPU =
      gpu.indexOf('swiftshader') !== -1 ||
      gpu.indexOf('llvmpipe')     !== -1 ||
      gpu.indexOf('software')     !== -1 ||
      gpu.indexOf('basic render') !== -1;

    return {
      caps: caps,
      dpr: dpr,
      shortSide: shortSide,
      longSide: longSide,
      cores: cores,
      memoryGB: memoryGB,
      memoryAssumed: memoryAssumed,
      isIOS: isIOS,
      isAndroid: isAndroid,
      isTouch: isTouch,
      isMobile: isMobile,
      isSoftwareGPU: isSoftwareGPU
    };
  }

  /* ============================================================
     2. TIER CLASSIFICATION — five levels
     ============================================================ */

  function classifyTier(sig) {
    // Hard downgrades
    if (sig.isSoftwareGPU) return 0;
    if (!sig.caps.webgl2 && sig.isMobile && sig.cores <= 4) return 0;

    // Score-based
    var score = 0;

    // GPU generation proxies
    if (sig.caps.webgl2)            score += 3;
    if (sig.caps.highpFragment)     score += 1;
    if (sig.caps.floatTextures)     score += 2;
    if (sig.caps.halfFloatTextures) score += 1;

    // Texture and anisotropy budget
    if (sig.caps.maxTextureSize >= 16384) score += 3;
    else if (sig.caps.maxTextureSize >= 8192) score += 2;
    else if (sig.caps.maxTextureSize >= 4096) score += 1;

    if (sig.caps.maxAnisotropy >= 16) score += 2;
    else if (sig.caps.maxAnisotropy >= 8) score += 1;

    // Uniform budget — shader complexity ceiling
    if (sig.caps.maxFragmentUniforms >= 1024) score += 2;
    else if (sig.caps.maxFragmentUniforms >= 512) score += 1;

    // Hardware signals
    if (sig.cores >= 8) score += 2;
    else if (sig.cores >= 6) score += 1;

    if (sig.memoryGB >= 8)      score += 3;
    else if (sig.memoryGB >= 6) score += 2;
    else if (sig.memoryGB >= 4) score += 1;
    else if (sig.memoryAssumed) score += 1; // unknown but not terrible

    // Mobile penalty (battery + thermal headroom)
    if (sig.isMobile) score -= 3;
    if (sig.isIOS && sig.cores <= 4) score -= 2;

    // Screen size — a huge 4K monitor is harder than a 1080p laptop
    if (!sig.isMobile) {
      if (sig.longSide >= 2560) score -= 1;
      if (sig.longSide >= 3400) score -= 1;
    }

    // Map score → tier
    if (score >= 16) return 4; // ULTRA
    if (score >= 11) return 3; // HIGH
    if (score >= 7)  return 2; // MID
    if (score >= 3)  return 1; // LOW
    return 0;                  // MINIMAL
  }

  /* ============================================================
     3. QUALITY TABLE — one Q per tier
     Every number every other file will read.
     ============================================================ */

  function buildQ(tier, sig) {
    // Quality ladder — indices 0..4
    var LADDERS = {
      pixelRatio:    [0.75, 0.9, 1.0, 1.25, 1.5],       // multiplied by DPR cap
      dprCap:        [1.0,  1.0, 1.5, 1.75, 2.0],

      skySegW:       [12, 16, 24, 32, 48],
      skySegH:       [8,  10, 14, 20, 28],
      skyRadius:     [900, 1000, 1200, 1400, 1600],

      shadowMap:     [0, 1024, 1536, 2048, 2048],
      shadowType:    [0, 1, 2, 2, 2],                    // 0=off, 1=Basic, 2=PCFSoft

      bloom:         [false, false, true,  true,  true],
      bloomRes:      [0, 0, 256, 384, 512],

      dof:           [false, false, false, true,  true],
      grain:         [false, true,  true,  true,  true],
      chromatic:     [false, false, false, true,  true],
      godRays:       [false, false, true,  true,  true],

      // Building density
      buildingsNear: [40,  80,  180, 320, 520],
      buildingsMid:  [80,  160, 360, 620, 980],
      buildingsFar:  [120, 240, 520, 880, 1400],
      buildingDetail:[0,   1,   2,   3,   4],            // 0=box only .. 4=full kit

      // City ecosystem
      pedestrians:   [0,   20,  80,  200, 460],
      vehicles:      [0,   10,  40,  100, 220],
      transitUnits:  [0,   2,   6,   14,  26],
      trafficLights: [8,   16,  32,  60,  100],

      // Environment detail
      lamps:         [40,  90,  180, 320, 520],
      trees:         [20,  50,  120, 240, 400],
      props:         [0,   30,  90,  200, 400],

      // Effects
      particleMax:   [0,   200, 800, 2200, 5000],
      dataflowLines: [0,   4,   12,  28,  60],
      billboardsAnim:[0,   2,   6,   16,  32],

      // Rendering internals
      antialias:     [false, false, false, true, true],
      anisotropy:    [1,   Math.min(2,  sig.caps.maxAnisotropy),
                          Math.min(4,  sig.caps.maxAnisotropy),
                          Math.min(8,  sig.caps.maxAnisotropy),
                          Math.min(16, sig.caps.maxAnisotropy)],

      // Texture generation
      textureSize:   [16,  32,  64,  128, 256],

      // Camera path resolution
      pathSamples:   [40,  80,  160, 240, 360],

      // Scroll behavior
      scrollSmooth:  [0.0018, 0.0018, 0.0022, 0.0024, 0.0026],

      // Frame pacing
      fpsCap:        [24,  30,  45,  60,  60],

      // Adaptive tolerance
      minFps:        [22,  26,  40,  52,  54],           // below this → downshift
      maxFps:        [30,  38,  55,  62,  62],           // above this → upshift
    };

    var q = {};
    Object.keys(LADDERS).forEach(function (key) {
      q[key] = LADDERS[key][tier];
    });

    // Effective DPR — the actual multiplier we hand to the renderer
    q.effectivePixelRatio = Math.min(
      sig.dpr,
      q.dprCap,
      window.devicePixelRatio ? window.devicePixelRatio : 1
    ) * q.pixelRatio / Math.max(1, q.dprCap);
    // Sanity clamp — never below 0.5, never above real DPR
    q.effectivePixelRatio = Math.max(0.5, Math.min(q.effectivePixelRatio, sig.dpr));

    // Metadata
    q.tier = tier;
    q.tierName = ['MINIMAL', 'LOW', 'MID', 'HIGH', 'ULTRA'][tier];
    q.isMobile = sig.isMobile;
    q.isIOS = sig.isIOS;
    q.isAndroid = sig.isAndroid;
    q.isSoftwareGPU = sig.isSoftwareGPU;
    q.reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mobile hard caps — even a "HIGH" mobile can't afford desktop counts
    if (sig.isMobile) {
      q.buildingsNear = Math.min(q.buildingsNear, 180);
      q.buildingsMid  = Math.min(q.buildingsMid,  300);
      q.buildingsFar  = Math.min(q.buildingsFar,  400);
      q.pedestrians   = Math.min(q.pedestrians,   120);
      q.vehicles      = Math.min(q.vehicles,      60);
      q.particleMax   = Math.min(q.particleMax,   1400);
      q.lamps         = Math.min(q.lamps,         220);
      q.shadowMap     = Math.min(q.shadowMap,     1024);
      q.effectivePixelRatio = Math.min(q.effectivePixelRatio, 1.5);
    }

    // Reduced-motion: kill anything that pulses or moves without consent
    if (q.reduceMotion) {
      q.bloom     = false;
      q.dof       = false;
      q.chromatic = false;
      q.godRays   = false;
      q.grain     = false;
      q.particleMax = Math.min(q.particleMax, 200);
    }

    return q;
  }

  /* ============================================================
     4. INITIALIZE
     ============================================================ */

  var sig = readSignals();
  var initialTier = classifyTier(sig);
  var Q = buildQ(initialTier, sig);

  /* ============================================================
     5. FRAME BUDGET ENFORCEMENT
     Rolling FPS. Warmup grace. Silent downshift. Slow upshift.
     ============================================================ */

  var STATS = {
    frames: 0,
    fps: 60,
    fpsRolling: 60,
    lastSampleTime: performance.now(),
    samplesSinceChange: 0,
    consecutiveGood: 0,
    warmupFrames: 90,
    started: false
  };

  // Downshift ladder — order matters. Each step is a small loss.
  var DOWNSHIFT_ORDER = [
    'godRays',
    'chromatic',
    'grain',
    'dof',
    'bloom',
    'effectivePixelRatio',
    'particleMax',
    'pedestrians',
    'vehicles',
    'lamps',
    'shadowMap',
    'buildingsFar',
    'buildingsMid'
  ];

  // Upshift ladder — reverse direction, but conservative.
  var UPSHIFT_ORDER = [
    'buildingsMid',
    'buildingsFar',
    'shadowMap',
    'lamps',
    'vehicles',
    'pedestrians',
    'particleMax',
    'effectivePixelRatio'
  ];

  function downshift() {
    for (var i = 0; i < DOWNSHIFT_ORDER.length; i++) {
      var k = DOWNSHIFT_ORDER[i];
      var v = Q[k];
      if (typeof v === 'boolean' && v) { Q[k] = false; return k; }
      if (typeof v === 'number' && v > 0) {
        var nv;
        if (k === 'effectivePixelRatio') nv = Math.max(0.5, v * 0.85);
        else if (k === 'shadowMap')      nv = v >= 2048 ? 1536 : (v >= 1536 ? 1024 : (v >= 1024 ? 512 : 0));
        else                              nv = Math.floor(v * 0.7);
        if (nv !== v) { Q[k] = nv; return k; }
      }
    }
    return null;
  }

  function upshift() {
    for (var i = 0; i < UPSHIFT_ORDER.length; i++) {
      var k = UPSHIFT_ORDER[i];
      var v = Q[k];
      // Compare against the original tier's ideal
      var ideal = buildQ(initialTier, sig)[k];
      if (typeof v === 'number' && v < ideal) {
        var nv = (k === 'effectivePixelRatio')
          ? Math.min(ideal, v * 1.08)
          : Math.min(ideal, Math.ceil(v * 1.15 + 1));
        if (nv !== v) { Q[k] = nv; return k; }
      }
    }
    return null;
  }

  var tierChangeListeners = [];

  function onTierChange(fn) {
    if (typeof fn === 'function') tierChangeListeners.push(fn);
  }

  function emitTierChange(change, key) {
    for (var i = 0; i < tierChangeListeners.length; i++) {
      try { tierChangeListeners[i](change, key, Q); } catch (e) {}
    }
  }

  function measure() {
    var now = performance.now();
    STATS.frames++;

    // Sample FPS once per 500ms
    if (now - STATS.lastSampleTime < 500) return;
    var elapsed = (now - STATS.lastSampleTime) / 1000;
    STATS.fps = STATS.frames / elapsed;
    STATS.frames = 0;
    STATS.lastSampleTime = now;

    // Warmup grace — shader compilation and initial uploads always skew low
    if (!STATS.started) {
      STATS.warmupFrames--;
      if (STATS.warmupFrames <= 0) STATS.started = true;
      return;
    }

    // Exponential smoothing
    STATS.fpsRolling = STATS.fpsRolling * 0.7 + STATS.fps * 0.3;

    // Downshift if below minFps
    if (STATS.fpsRolling < Q.minFps) {
      STATS.consecutiveGood = 0;
      STATS.samplesSinceChange++;
      if (STATS.samplesSinceChange >= 3) {
        var changed = downshift();
        if (changed) {
          STATS.samplesSinceChange = 0;
          emitTierChange('down', changed);
        }
      }
    }
    // Upshift if above maxFps for a sustained period
    else if (STATS.fpsRolling > Q.maxFps) {
      STATS.consecutiveGood++;
      if (STATS.consecutiveGood >= 12) {
        var changedUp = upshift();
        if (changedUp) {
          STATS.consecutiveGood = 0;
          emitTierChange('up', changedUp);
        } else {
          STATS.consecutiveGood = 0;
        }
      }
    } else {
      STATS.consecutiveGood = 0;
      STATS.samplesSinceChange = 0;
    }
  }

  /* ============================================================
     6. SNAP TO TIER — allows environment.js to force a downgrade
     if it detects it can't build everything at once.
     ============================================================ */

  function snapToTier(newTier) {
    if (newTier < 0 || newTier > 4) return;
    if (newTier >= Q.tier) return;
    var oldTier = Q.tier;
    var rebuilt = buildQ(newTier, sig);
    // Preserve adaptive-tuned values for effects currently downgraded
    Object.keys(rebuilt).forEach(function (k) { Q[k] = rebuilt[k]; });
    emitTierChange('snap', oldTier + '→' + newTier);
  }

  /* ============================================================
     7. EXPOSE
     ============================================================ */

  S.performance = {
    Q: Q,
    signals: sig,
    tier: Q.tier,
    tierName: Q.tierName,
    measure: measure,
    snapToTier: snapToTier,
    onTierChange: onTierChange,
    stats: STATS,
    // Debug helper — call from console: SANTINOPOLE.performance.report()
    report: function () {
      var lines = [
        'TIER: ' + Q.tierName + ' (' + Q.tier + ')',
        'GPU: ' + (sig.caps.rendererString || 'unknown'),
        'WebGL2: ' + sig.caps.webgl2 + '  |  Cores: ' + sig.cores +
          '  |  Mem: ' + (sig.memoryAssumed ? 'assumed 4GB' : sig.memoryGB + 'GB'),
        'DPR: ' + sig.dpr.toFixed(2) + '  |  Effective: ' + Q.effectivePixelRatio.toFixed(2),
        'FPS rolling: ' + STATS.fpsRolling.toFixed(1) + '  |  Cap: ' + Q.fpsCap,
        'Buildings near/mid/far: ' + Q.buildingsNear + '/' + Q.buildingsMid + '/' + Q.buildingsFar,
        'Pedestrians: ' + Q.pedestrians + '  |  Vehicles: ' + Q.vehicles +
          '  |  Lamps: ' + Q.lamps,
        'Bloom: ' + Q.bloom + '  |  DOF: ' + Q.dof + '  |  Grain: ' + Q.grain +
          '  |  GodRays: ' + Q.godRays
      ];
      console.log('%cSANTINOPOLE · PERFORMANCE',
        'color:#d4a24a;letter-spacing:0.2em;font-weight:bold', '\n' + lines.join('\n'));
      return lines.join('\n');
    }
  };

  /* ---------- REPORT ---------- */
  S.log(
    'performance',
    true,
    Q.tierName + ' · ' + (sig.isMobile ? 'mobile' : 'desktop') +
    ' · dpr ' + Q.effectivePixelRatio.toFixed(2)
  );

  // Non-blocking warning if running on a weak/software GPU
  if (sig.isSoftwareGPU) {
    S.log('GPU warning', true, 'software renderer · MINIMAL tier');
  }

})();
