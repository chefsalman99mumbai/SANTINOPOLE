
/* ============================================================
   SANTINOPOLE — three.js
   ------------------------------------------------------------
   Multi-CDN loader for three.js + real GPU capability probe.
   Exposes window.THREE and window.SANTINOPOLE namespace.
   Reports to the boot log. Self-diagnoses on failure.

   Downstream files must await: window.SANTINOPOLE.threeReady
   ============================================================ */

(function () {
  'use strict';

  /* ---------- GLOBAL NAMESPACE ---------- */
  var S = window.SANTINOPOLE || (window.SANTINOPOLE = {});

  /* ---------- BOOT LOG CONTRACT ----------
     Every file from here on reports via S.log(name, ok, detail).
     Prints to #loaderLog in the DOM. Updates the loader bar.
     Maintains S.bootLog array for post-mortem inspection. */
  S.bootLog = S.bootLog || [];
  S.log = function (name, ok, detail) {
    S.bootLog.push({ name: name, ok: !!ok, detail: detail || '' });
    var el = document.getElementById('loaderLog');
    if (el) {
      var line = document.createElement('div');
      line.className = ok ? 'ok' : 'bad';
      line.textContent = (ok ? '✓ ' : '✗ ') + name + (detail ? '  ·  ' + detail : '');
      el.appendChild(line);
      // Keep the log tidy — never more than 9 lines on screen
      while (el.children.length > 9) el.removeChild(el.firstChild);
    }
    var bar = document.getElementById('loaderBar');
    if (bar) {
      var pct = Math.min(96, (S.bootLog.filter(function (e) { return e.ok; }).length / 10) * 100);
      bar.style.width = pct + '%';
    }
  };

  /* ---------- FATAL ERROR SCREEN ---------- */
  S.fatal = function (html) {
    var errEl = document.getElementById('err');
    var msgEl = document.getElementById('errMsg');
    if (msgEl) msgEl.innerHTML = html;
    if (errEl) errEl.classList.add('is-visible');
    var loader = document.getElementById('loader');
    if (loader) loader.classList.add('done');
  };

  /* ---------- CDN CHAIN WITH SESSION MEMORY ----------
     Order: jsdelivr → unpkg → esm.sh
     On repeat visits, the previously-successful CDN is moved to front.
     This is the "self-healing" behavior — the chain gets faster over time. */
  var CDNS = [
    'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js',
    'https://unpkg.com/three@0.161.0/build/three.module.js',
    'https://esm.sh/three@0.161.0'
  ];

  try {
    var preferred = sessionStorage.getItem('santinopole.cdn');
    if (preferred) {
      for (var i = 0; i < CDNS.length; i++) {
        if (CDNS[i].indexOf(preferred) !== -1 && i > 0) {
          CDNS.unshift(CDNS.splice(i, 1)[0]);
          break;
        }
      }
    }
  } catch (e) { /* sessionStorage may be blocked — proceed with default order */ }

  /* ---------- TIMEOUT WRAPPER ----------
     A CDN that hangs must not hang the whole experience.
     Reject after N ms and let the next CDN try. */
  function withTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
      var to = setTimeout(function () {
        reject(new Error(label + ' timeout (' + ms + 'ms)'));
      }, ms);
      promise.then(
        function (v) { clearTimeout(to); resolve(v); },
        function (e) { clearTimeout(to); reject(e); }
      );
    });
  }

  /* ---------- GPU CAPABILITY PROBE ----------
     We ask the GPU directly, not the user agent.
     Every number here informs adaptive quality in performance.js. */
  function probeCapabilities() {
    var caps = {
      webgl2: false,
      webgl1: false,
      webgpu: false,
      maxTextureSize: 0,
      maxVertexUniforms: 0,
      maxFragmentUniforms: 0,
      maxTextureUnits: 0,
      maxAnisotropy: 0,
      floatTextures: false,
      halfFloatTextures: false,
      highpFragment: false,
      rendererVendor: 'unknown',
      rendererString: 'unknown'
    };

    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return caps;

      caps.webgl2 = (typeof WebGL2RenderingContext !== 'undefined') && (gl instanceof WebGL2RenderingContext);
      caps.webgl1 = true;

      caps.maxTextureSize       = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
      caps.maxVertexUniforms    = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) || 0;
      caps.maxFragmentUniforms  = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) || 0;
      caps.maxTextureUnits      = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) || 0;

      var aniso = gl.getExtension('EXT_texture_filter_anisotropic')
               || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
               || gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
      if (aniso) caps.maxAnisotropy = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1;

      caps.floatTextures     = !!(gl.getExtension('OES_texture_float')     || caps.webgl2);
      caps.halfFloatTextures = !!(gl.getExtension('OES_texture_half_float') || caps.webgl2);

      var pf = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      caps.highpFragment = !!(pf && pf.precision > 0);

      var dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        caps.rendererVendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)   || 'unknown';
        caps.rendererString = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || 'unknown';
      }

      // Explicitly release the probe context
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (e) { /* any failure → default caps returned */ }

    caps.webgpu = (typeof navigator !== 'undefined' && 'gpu' in navigator);
    return caps;
  }

  /* ---------- LOAD WITH FALLBACK CHAIN ---------- */
  var CDN_TIMEOUT_MS = 8000;
  var startedAt = performance.now();

  function loadThree() {
    var lastError = null;

    function attempt(index) {
      if (index >= CDNS.length) {
        return Promise.reject(lastError || new Error('All CDNs exhausted'));
      }
      var url = CDNS[index];
      var host = url.split('/')[2];

      return withTimeout(import(/* @vite-ignore */ url), CDN_TIMEOUT_MS, host)
        .then(function (mod) {
          if (!mod || !mod.Scene) throw new Error('module loaded but Scene is missing');
          var dt = (performance.now() - startedAt).toFixed(0);
          try { sessionStorage.setItem('santinopole.cdn', host); } catch (e) {}
          S.log('three.js', true, 'rev ' + (mod.REVISION || '?') + ' · ' + host + ' · ' + dt + 'ms');
          return mod;
        })
        .catch(function (err) {
          lastError = err;
          S.log('three.js', false, host + ' · ' + (err && err.message ? err.message : 'failed'));
          return attempt(index + 1);
        });
    }

    return attempt(0);
  }

  /* ---------- EXECUTE ---------- */

  // 1. Probe capabilities FIRST — this never blocks, always reports.
  var caps = probeCapabilities();
  S.capabilities = caps;

  if (!caps.webgl1 && !caps.webgl2) {
    S.log('WebGL', false, 'no context available');
    S.fatal(
      'This device does not support WebGL.<br>' +
      'Santinopole requires WebGL to enter.'
    );
    S.threeReady = Promise.reject(new Error('No WebGL'));
    return;
  }

  // Log the tier-relevant facts (short form — the full caps object lives on S.capabilities)
  S.log(
    'GPU',
    true,
    (caps.webgl2 ? 'WebGL2' : 'WebGL1') +
    ' · tex ' + caps.maxTextureSize +
    ' · aniso ' + caps.maxAnisotropy
  );

  // 2. Kick off three.js load. Expose a promise main.js will await.
  S.threeReady = loadThree()
    .then(function (THREE) {
      window.THREE = THREE;
      S.THREE = THREE;
      S.log('three.ready', true, (performance.now() - startedAt).toFixed(0) + 'ms total');
      return THREE;
    })
    .catch(function (err) {
      S.log('three.ready', false, 'all CDNs failed');
      S.fatal(
        'Could not load three.js from any CDN.<br>' +
        'Check your connection and reload.<br>' +
        '<span style="opacity:.5;font-size:10px">' +
        (err && err.message ? err.message : 'unknown error') +
        '</span>'
      );
      throw err;
    });

})();
