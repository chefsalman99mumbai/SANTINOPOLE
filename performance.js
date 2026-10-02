// Device detection, FPS monitoring, quality tiers. Dispatches 'santinopole:quality' {tier,dpr,fps}.
const TIERS = ['low', 'medium', 'high'];
const DPR_CAP = { high: 2, medium: 1.5, low: 1.25 };

export class Performance {
  constructor() {
    const mobile = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent) || innerWidth < 700;
    const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
    this.mobile = mobile;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.webgl = Performance.hasWebGL();
    this.tier = mobile ? 'low' : (cores <= 4 || mem <= 2 ? 'medium' : 'high');
    this.dprScale = 1; this._acc = 0; this._frames = 0; this._warm = 90; this.fps = 60;
  }
  static hasWebGL() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch { return false; }
  }
  get dpr() { return Math.max(0.75, Math.min(devicePixelRatio || 1, DPR_CAP[this.tier]) * this.dprScale); }
  update(dt) {
    if (this._warm > 0) { this._warm--; return; }          // ignore shader-compile hitching
    this._acc += dt; this._frames++;
    if (this._frames < 90) return;
    this.fps = this._frames / this._acc; this._acc = 0; this._frames = 0;
    if (this.fps < 42) {
      if (this.dprScale > 0.7) this.dprScale -= 0.15;
      else if (this.tier !== 'low') { this.tier = TIERS[TIERS.indexOf(this.tier) - 1]; this.dprScale = 1; }
      else return;
      this._warm = 60; this.emit();
    }
  }
  emit() {
    dispatchEvent(new CustomEvent('santinopole:quality', { detail: { tier: this.tier, dpr: this.dpr, fps: this.fps } }));
  }
}
