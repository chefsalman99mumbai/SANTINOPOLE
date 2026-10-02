// GSAP/ScrollTrigger-driven cinematic camera along authored spline paths.
import { THREE } from './three.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const POS = [V(70, 330, 360), V(36, 175, 235), V(14, 62, 158), V(11, 4.2, 112), V(11, 4.4, 42),
  V(11, 5.4, -28), V(11, 6, -92), V(30, 46, -96), V(-10, 150, 30), V(-60, 330, 210)];
const LOOK = [V(0, 0, 0), V(11, 0, 90), V(11, 12, 92), V(11, 6, 62), V(11, 8, 0),
  V(11, 10, -62), V(11, 10, -150), V(11, 6, -40), V(0, 0, -30), V(0, 0, -10)];

export class ScrollExperience {
  constructor(camera, { onProgress, reduced = false } = {}) {
    if (!window.gsap || !window.ScrollTrigger) throw new Error('GSAP / ScrollTrigger failed to load');
    gsap.registerPlugin(ScrollTrigger);
    this.camera = camera; this.onProgress = onProgress; this.state = { p: 0 };
    this.posCurve = new THREE.CatmullRomCurve3(POS, false, 'centripetal');
    this.lookCurve = new THREE.CatmullRomCurve3(LOOK, false, 'centripetal');
    this.pos = new THREE.Vector3(); this.look = new THREE.Vector3(); this.tan = new THREE.Vector3();
    this.pointer = { x: 0, y: 0, sx: 0, sy: 0 }; this.bank = 0; this.yaw = 0; this.time = 0; this.last = -1; this.progress = 0;
    this.tween = gsap.to(this.state, {
      p: 1, ease: 'none',
      scrollTrigger: { trigger: '#scroll', start: 'top top', end: 'bottom bottom', scrub: reduced ? true : 1.4 },
    });
  }
  setPointer(x, y) { this.pointer.x = x; this.pointer.y = y; }
  update(dt) {
    const p = this.progress = THREE.MathUtils.clamp(this.state.p, 0, 1); this.time += dt;
    this.posCurve.getPoint(p, this.pos); this.lookCurve.getPoint(p, this.look); this.posCurve.getTangent(p, this.tan);
    const k = 1 - Math.exp(-dt * 4), pt = this.pointer;
    pt.sx += (pt.x - pt.sx) * k; pt.sy += (pt.y - pt.sy) * k;
    const street = 1 - THREE.MathUtils.smoothstep(this.pos.y, 6, 30);        // handheld feel only near the ground
    const yaw = Math.atan2(this.tan.x, this.tan.z); let dy = yaw - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw = yaw;
    const target = THREE.MathUtils.clamp(-dy / Math.max(dt, 1e-3) * 0.5, -0.1, 0.1);
    this.bank += (target - this.bank) * k;
    const c = this.camera;
    c.position.set(this.pos.x + pt.sx * (0.6 + 3 * (1 - street)), this.pos.y + Math.sin(this.time * 1.6) * 0.08 * street - pt.sy * 0.4, this.pos.z);
    this.look.x += pt.sx * 2.2; this.look.y += pt.sy * 1.4;
    c.lookAt(this.look); c.rotateZ(this.bank + Math.sin(this.time * 0.7) * 0.004 * street);
    if (Math.abs(p - this.last) > 1e-4) { this.last = p; this.onProgress && this.onProgress(p); }
  }
  destroy() { this.tween.scrollTrigger && this.tween.scrollTrigger.kill(); this.tween.kill(); }
}
