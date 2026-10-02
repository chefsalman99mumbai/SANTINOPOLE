// Boot order: performance → interface → stage → environment → buildings → city → scroll → loop.
import { Stage } from './three.js';
import { Performance } from './performance.js';
import { Environment } from './environment.js';
import { Buildings } from './buildings.js';
import { City } from './city.js';
import { ScrollExperience } from './scrollexperience.js';
import { Interface } from './interface.js';

const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

function fail(system, err) {
  console.error(`[SANTINOPOLE] ${system} failed:`, err);
  const f = document.getElementById('fallback'); if (!f) return;
  f.hidden = false; f.querySelector('[data-msg]').textContent = `${system}: ${err && err.message ? err.message : err}`;
  const l = document.getElementById('loader'); if (l) l.style.display = 'none';
}

async function boot() {
  let system = 'performance';
  try {
    const perf = new Performance();
    if (!perf.webgl) throw new Error('WebGL is unavailable');
    system = 'interface'; let scroll;
    const ui = new Interface({ reduced: perf.reduced, onPointer: (x, y) => scroll && scroll.setPointer(x, y) });
    ui.setLoader(0.1, 'Starting engine'); await frame();
    system = 'stage'; const stage = new Stage(document.getElementById('stage'), { antialias: perf.tier !== 'low', dpr: perf.dpr });
    system = 'environment'; const env = new Environment(stage); ui.setLoader(0.3, 'Painting the sky'); await frame();
    system = 'buildings'; const buildings = new Buildings(stage.scene, env); buildings.build(perf.tier); ui.setLoader(0.6, 'Raising districts'); await frame();
    system = 'city'; const city = new City(stage.scene, buildings, env, perf.tier); ui.setLoader(0.85, 'Starting traffic'); await frame();
    system = 'scroll'; scroll = new ScrollExperience(stage.camera, { reduced: perf.reduced, onProgress: (p) => ui.setProgress(p) });
    addEventListener('santinopole:quality', (e) => { stage.setPixelRatio(e.detail.dpr); city.setQuality(e.detail.tier); env.setQuality(e.detail.tier); });
    stage.onFrame((dt, t) => { perf.update(dt); scroll.update(dt); env.update(t, scroll.progress); city.update(t, dt); });
    system = 'render'; scroll.update(0.016); env.update(0, 0); stage.start(); ui.setLoader(1, 'Welcome'); ui.hideLoader();
    stage.renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail('webgl', 'Graphics context lost. Reload to re-enter.'); });
  } catch (err) { fail(system, err); }
}
boot();
