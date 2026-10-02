// Stage: renderer, scene, camera, loop, resize, visibility lifecycle.
import * as THREE from 'three';
export { THREE };

export class Stage {
  constructor(canvas, { antialias = true, dpr = 1 } = {}) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xd9a98a, 0.0013);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.5, 2600);
    this.clock = new THREE.Clock();
    this.callbacks = new Set();
    this.running = false;
    this._raf = 0;
    this._tick = this._tick.bind(this);
    this.resize = this.resize.bind(this);
    this._vis = () => (document.hidden ? this.stop() : this.start());
    addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this._vis);
    this.setPixelRatio(dpr);
  }
  setPixelRatio(r) { this.renderer.setPixelRatio(r); this.resize(); }
  onFrame(fn) { this.callbacks.add(fn); return () => this.callbacks.delete(fn); }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 64 : 48;
    this.camera.updateProjectionMatrix();
  }
  start() { if (this.running) return; this.running = true; this.clock.getDelta(); this._raf = requestAnimationFrame(this._tick); }
  stop() { this.running = false; cancelAnimationFrame(this._raf); }
  _tick() {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this._tick);
    const dt = Math.min(this.clock.getDelta(), 0.1), t = this.clock.elapsedTime;
    for (const fn of this.callbacks) fn(dt, t);
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.stop(); removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this._vis); this.renderer.dispose();
  }
}
