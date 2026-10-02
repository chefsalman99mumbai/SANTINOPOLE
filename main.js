/* ============================================================
   SANTINOPOLE — main.js
   ------------------------------------------------------------
   Entry point. Boot orchestrator. Owns the frame-loop start,
   the loader-to-HUD handoff, the module recovery chain, and
   the top-level error surface.

   Depends on: everything (loads last).
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     0. THE MOST BASIC CHECK — did three.js itself load?
     ============================================================ */
  if (!window.SANTINOPOLE) {
    var errEl = document.getElementById('err');
    var errMsg = document.getElementById('errMsg');
    if (errMsg) {
      errMsg.innerHTML =
        'The three.js loader file did not load.<br>' +
        'Check that <b>three.js</b> exists in the repository root.';
    }
    if (errEl) errEl.classList.add('is-visible');
    var loader = document.getElementById('loader');
    if (loader) loader.classList.add('done');
    return;
  }

  var S = window.SANTINOPOLE;

  /* ============================================================
     1. GUARANTEE THE FRAMEWORK EXISTS
     ============================================================ */
  if (!S.threeReady) {
    // three.js file loaded but didn't set up its promise — this
    // means WebGL is unavailable or the file was corrupted.
    if (typeof S.fatal === 'function') {
      S.fatal('WebGL is not available on this device.');
    }
    return;
  }

  /* ============================================================
     2. SCRIPT LOADER — order-preserving dynamic injection
     ============================================================ */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      // Set async BEFORE src for the flag to take effect.
      s.async = false;
      s.src = src;
      s.onload = function () { resolve(src); };
      s.onerror = function () {
        reject(new Error('Failed to load ' + src));
      };
      document.head.appendChild(s);
    });
  }

  /* ============================================================
     3. MODULE PRESENCE CHECK
     ============================================================ */
  function has(mod) { return !!S[mod]; }

  /* ============================================================
     4. BOOT — the actual "go live" sequence
     ============================================================ */
  var booted = false;

  function boot() {
    if (booted) return;
    booted = true;
    window.__SANTINOPOLE_STARTED = true;

    // Let one frame settle so the first render happens before we
    // start hiding things. Two RAFs = guaranteed post-layout.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {

        // 1) Start the frame loop. This is what finally makes
        //    the camera move and the world come alive.
        try {
          S.scrollexperience.start();
        } catch (e) {
          if (typeof S.fatal === 'function') {
            S.fatal('Frame loop failed to start.<br>' +
              (e && e.message ? e.message : 'unknown error'));
          }
          return;
        }

        // 2) Fade the loader, reveal HUD + wayfinding.
        //    Small delay so the first rendered frame is visible
        //    behind the fading loader — no black flash.
        setTimeout(function () {
          try {
            S.interface.revealHUD();
          } catch (e) {
            // Interface failure is not fatal — the world still runs.
            console.error('[main] interface reveal failed', e);
            var loader = document.getElementById('loader');
            if (loader) loader.classList.add('done');
          }

          // 3) Confirm live.
          if (typeof S.log === 'function') {
            S.log(
              'main',
              true,
              'world running · ' +
              (S.performance && S.performance.Q ?
                S.performance.Q.tierName : '—') +
              ' · ' +
              (S.scrollexperience.ACTS.length) + ' acts'
            );
          }
        }, 260);
      });
    });
  }

  /* ============================================================
     5. RECOVERY CHAIN
     If modules failed on first pass (because THREE wasn't ready),
     reload them now — in dependency order — then boot.
     ============================================================ */
  S.threeReady
    .then(function (THREE) {

      // We only reload modules that failed. If index.html is later
      // simplified (main.js loads everything), this becomes a no-op
      // because everything is already present.
      var chain = Promise.resolve();

      if (!has('buildings')) {
        chain = chain.then(function () { return loadScript('buildings.js'); });
      }
      if (!has('environment')) {
        chain = chain.then(function () { return loadScript('environment.js'); });
      }
      if (!has('scrollexperience')) {
        chain = chain.then(function () { return loadScript('scrollexperience.js'); });
      }
      if (!has('interface')) {
        chain = chain.then(function () { return loadScript('interface.js'); });
      }

      return chain;
    })
    .then(function () {

      // ---- VERIFY EVERYTHING IS PRESENT ----
      var required = [
        'performance',
        'city',
        'buildings',
        'environment',
        'scrollexperience',
        'interface'
      ];
      var missing = [];
      for (var i = 0; i < required.length; i++) {
        if (!has(required[i])) missing.push(required[i] + '.js');
      }

      if (missing.length > 0) {
        var msg = 'Boot sequence incomplete.<br>Missing or failed:<br>';
        for (var j = 0; j < missing.length; j++) {
          msg += '&nbsp;&nbsp;·&nbsp;&nbsp;' + missing[j] + '<br>';
        }
        msg += '<span style="opacity:.55;font-size:11px;display:block;margin-top:14px">';
        msg += 'Check the boot log and confirm each file is present in the repo root.</span>';
        if (typeof S.fatal === 'function') S.fatal(msg);
        throw new Error('Missing modules: ' + missing.join(', '));
      }

      // ---- EVERYTHING PRESENT → BOOT ----
      boot();
    })
    .catch(function (err) {
      // The catch is a safety net. Most failure paths have already
      // called S.fatal() above; we log for the console only.
      console.error('[main] boot chain failed:', err);
      if (!window.__SANTINOPOLE_STARTED && typeof S.fatal === 'function') {
        // Only escalate if nothing has shown an error yet.
        var loaderEl = document.getElementById('loader');
        var errEl2 = document.getElementById('err');
        if (loaderEl && errEl2 && !errEl2.classList.contains('is-visible')) {
          S.fatal(
            'Santinopole failed to boot.<br>' +
            '<span style="opacity:.55;font-size:11px">' +
            (err && err.message ? err.message : 'unknown error') +
            '</span>'
          );
        }
      }
    });

  /* ============================================================
     6. TOP-LEVEL ERROR TRAP
     Catch uncaught errors that would otherwise vanish silently.
     ============================================================ */
  window.addEventListener('error', function (e) {
    // Do not raise the fatal screen for benign errors — only log.
    // Fatal paths are already handled by the boot chain.
    if (e && e.message) {
      console.error('[global error]', e.message, e.filename, e.lineno);
    }
  });

  window.addEventListener('unhandledrejection', function (e) {
    if (e && e.reason) {
      console.error('[unhandled rejection]', e.reason);
    }
  });

  /* ============================================================
     7. BOOT TIMEOUT GUARD
     If after 25 seconds nothing has booted, show the error screen
     with the boot log visible so the user knows which file stalled.
     ============================================================ */
  setTimeout(function () {
    if (!window.__SANTINOPOLE_STARTED) {
      var errEl = document.getElementById('err');
      var errMsg = document.getElementById('errMsg');
      var loaderEl = document.getElementById('loader');

      // Only show if the error screen isn't already visible.
      if (errEl && !errEl.classList.contains('is-visible')) {
        if (errMsg) {
          errMsg.innerHTML =
            'Santinopole did not finish booting within 25 seconds.<br>' +
            'The boot log above shows which file stalled.';
        }
        errEl.classList.add('is-visible');
        if (loaderEl) loaderEl.classList.add('done');
      }
    }
  }, 25000);

  /* ============================================================
     8. PAGE LIFECYCLE
     Pause the renderer when the tab is hidden. The scrollexperience
     loop already checks document.hidden; this is a belt-and-braces
     courtesy for slower devices.
     ============================================================ */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      // scrollexperience handles this internally, but we nudge
      // the renderer to skip its RAF work immediately.
      if (S.scrollexperience) S.scrollexperience.state.paused = true;
    } else {
      if (S.scrollexperience) {
        S.scrollexperience.state.paused = false;
        S.scrollexperience.state._prevNow = 0;
      }
    }
  });

  /* ============================================================
     9. DEBUG SURFACE
     Call from browser console:
       SANTINOPOLE.status()   → full boot report
     ============================================================ */
  S.status = function () {
    var lines = [];
    lines.push('SANTINOPOLE — status');
    lines.push('  started:      ' + (window.__SANTINOPOLE_STARTED ? 'yes' : 'no'));
    lines.push('  booted:       ' + (booted ? 'yes' : 'no'));
    lines.push('  tier:         ' + (S.performance ? S.performance.Q.tierName : '—'));
    lines.push('  act:          ' + (S.scrollexperience ?
      S.scrollexperience.ACTS[S.scrollexperience.getActIndex()].name : '—'));
    lines.push('  progress:     ' + (S.scrollexperience ?
      (S.scrollexperience.getProgress() * 100).toFixed(1) + '%' : '—'));
    lines.push('  districts:    ' + (S.city ? S.city.districts.length : 0));
    lines.push('  lots:         ' + (S.city ? S.city.lots.length : 0));
    lines.push('  buildings:    ' + (S.buildings ? S.buildings.count + ' meshes' : '—'));
    lines.push('  modules:      ' + [
      has('performance')    ? 'perf' : '—',
      has('city')           ? 'city' : '—',
      has('buildings')      ? 'bldg' : '—',
      has('environment')    ? 'env'  : '—',
      has('scrollexperience') ? 'scroll' : '—',
      has('interface')      ? 'ui'   : '—'
    ].join(' · '));
    console.log('%c' + lines.join('\n'),
      'color:#d4a24a;font-family:monospace;line-height:1.6');
    return lines.join('\n');
  };

  /* ============================================================
     10. WHEN main.js IS THE ONLY SCRIPT IN index.html
     (future optimization — leave as designed for now)
     ============================================================ */
  // Not needed yet — index.html currently includes all 8 files.

})();
