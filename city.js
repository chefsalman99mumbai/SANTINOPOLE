// Living city: ground, water, traffic, buses, pedestrians, street lights, SEO pathways, growth billboards.
import { THREE } from './three.js';
import { P, STREET_X } from './buildings.js';

const COUNTS = { high: { cars: 520, buses: 14, peds: 280 }, medium: { cars: 320, buses: 10, peds: 170 }, low: { cars: 170, buses: 6, peds: 80 } };
const MAXC = COUNTS.high;
const wrap = (v, L) => ((v % L) + L) % L;

export class City {
  constructor(scene, buildings, env, tier) {
    this.scene = scene; this.buildings = buildings; this.env = env; this.o = new THREE.Object3D(); this.acc = 0;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1000), new THREE.MeshLambertMaterial({ color: 0x15171c }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -70);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(2600, 1400), new THREE.MeshLambertMaterial({ color: 0x1f3a52 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, -0.5, 870);
    scene.add(ground, water);
    this.rand = ((a) => () => { a |= 0; a = a + 0x9E3779B9 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); return ((t ^ t >>> 7) >>> 0) / 4294967296; })(7);
    this._cars(); this._peds(); this._lamps(); this._seo(); this._billboards();
    this.setQuality(tier);
  }
  _fleet(geo, max, colors) {
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), max), r = this.rand, data = [];
    for (let i = 0; i < max; i++) {
      const axis = r() < 0.62 ? 0 : 1;                                       // 0: along z, 1: along x
      data.push({ axis, road: axis ? Math.floor(r() * 15) - 7 : Math.floor(r() * 29) - 14, dir: r() < 0.5 ? 1 : -1, ph: r() * 1000, sp: 5 + r() * 7 });
      mesh.setColorAt(i, new THREE.Color(colors[Math.floor(r() * colors.length)]));
    }
    mesh.frustumCulled = false; this.scene.add(mesh); return { mesh, data };
  }
  _cars() {
    this.cars = this._fleet(new THREE.BoxGeometry(1.8, 1.2, 4), MAXC.cars, [0xe8e4da, 0x6b7280, 0x2c3340, 0xb8412f, 0xe8e4da, 0xffc233]);
    this.buses = this._fleet(new THREE.BoxGeometry(2.6, 3.2, 11), MAXC.buses, [0x2f8f83, 0xd9a441]);
  }
  _peds() {
    const r = this.rand, g = new THREE.CylinderGeometry(0.25, 0.25, 1.7, 6); g.translate(0, 0.85, 0);
    this.peds = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff }), MAXC.peds);
    this.pedData = [];
    const pal = [0x1b1b20, 0xb8412f, 0xe8d9b5, 0x3d5a80, 0x6b705c, 0xd1a054];
    for (let i = 0; i < MAXC.peds; i++) {
      this.pedData.push({ x: [-1, 0, 1][Math.floor(r() * 3)] * P + STREET_X, side: r() < 0.5 ? -1 : 1, off: 4.4 + r() * 0.8, dir: r() < 0.5 ? 1 : -1, ph: r() * 500, sp: 0.8 + r() * 0.6 });
      this.peds.setColorAt(i, new THREE.Color(pal[Math.floor(r() * pal.length)]));
    }
    this.peds.frustumCulled = false; this.scene.add(this.peds);
  }
  _lamps() {
    const pts = [];
    for (const rx of [-1, 0, 1]) for (let z = -150; z <= 150; z += 11) for (const s of [-1, 1]) pts.push([STREET_X + rx * P + s * 5.4, z]);
    const poles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 6, 0.2), new THREE.MeshBasicMaterial({ color: 0x14161a }), pts.length);
    this.lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), pts.length);
    pts.forEach(([x, z], i) => { this.o.position.set(x, 3, z); this.o.updateMatrix(); poles.setMatrixAt(i, this.o.matrix); this.o.position.set(x, 6.2, z); this.o.updateMatrix(); this.lamps.setMatrixAt(i, this.o.matrix); });
    poles.frustumCulled = this.lamps.frustumCulled = false; this.scene.add(poles, this.lamps);
  }
  _seo() {                                                                  // discovery pathways between SEO towers
    const a = this.buildings.getAnchors('SEO'), v = [];
    for (let i = 0; i < a.length; i++) {
      let best = [];
      for (let j = 0; j < a.length; j++) if (j !== i) best.push([a[i].distanceToSquared(a[j]), j]);
      best.sort((p, q) => p[0] - q[0]);
      for (const [, j] of best.slice(0, 2)) v.push(a[i].x, a[i].y, a[i].z, a[j].x, a[j].y, a[j].z);
    }
    const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    this.seoLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xb6e4ff, transparent: true, opacity: 0.3, depthWrite: false }));
    this.seoLines.frustumCulled = false; this.scene.add(this.seoLines);
  }
  _billboards() {                                                           // digital signage over the GROWTH boulevard
    const n = 16; this.bills = new THREE.InstancedMesh(new THREE.PlaneGeometry(6, 9), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), n);
    this.hues = [0xffb347, 0xff6f59, 0xf7e3a1, 0x8fd3ff];
    for (let i = 0; i < n; i++) {
      const s = i % 2 ? 1 : -1; this.o.position.set(STREET_X + s * 9, 11 + (i % 3) * 3, -82 - Math.floor(i / 2) * 7);
      this.o.rotation.set(0, s * Math.PI / 2, 0); this.o.updateMatrix(); this.bills.setMatrixAt(i, this.o.matrix);
      this.bills.setColorAt(i, new THREE.Color(this.hues[i % 4]));
    }
    this.o.rotation.set(0, 0, 0); this.bills.frustumCulled = false; this.scene.add(this.bills);
  }
  setQuality(tier) {
    const c = COUNTS[tier] || COUNTS.medium;
    this.cars.mesh.count = c.cars; this.buses.mesh.count = c.buses; this.peds.count = c.peds;
  }
  _moveFleet(f, t, y, laneW) {
    const o = this.o, n = f.mesh.count;
    for (let i = 0; i < n; i++) {
      const d = f.data[i], s = d.ph + d.dir * d.sp * t;
      if (d.axis === 0) { o.position.set((d.road + 0.5) * P + d.dir * laneW, y, wrap(s, 340) - 170); o.rotation.y = 0; }
      else { o.position.set(wrap(s, 660) - 330, y, (d.road + 0.5) * P + d.dir * laneW); o.rotation.y = Math.PI / 2; }
      o.updateMatrix(); f.mesh.setMatrixAt(i, o.matrix);
    }
    f.mesh.instanceMatrix.needsUpdate = true;
  }
  update(t, dt) {
    const o = this.o, night = this.env.uniforms.uNight.value;
    this._moveFleet(this.cars, t, 0.9, 1.9); this._moveFleet(this.buses, t, 1.7, 1.9);
    o.rotation.set(0, 0, 0);
    for (let i = 0; i < this.peds.count; i++) {
      const d = this.pedData[i];
      o.position.set(d.x + d.side * d.off, 0.5 + Math.abs(Math.sin(t * 7 + d.ph)) * 0.06, wrap(d.ph + d.dir * d.sp * t, 340) - 170);
      o.updateMatrix(); this.peds.setMatrixAt(i, o.matrix);
    }
    this.peds.instanceMatrix.needsUpdate = true;
    this.seoLines.material.opacity = (0.12 + 0.3 * night) * (0.75 + 0.25 * Math.sin(t * 1.3));
    this.lamps.material.color.setRGB(1, 0.85 - 0.1 * night, 0.62).multiplyScalar(0.6 + 1.2 * night);
    this.acc += dt;
    if (this.acc > 0.45) {                                                  // micro-motion: signage rotates content
      this.acc = 0; const k = Math.floor(t / 0.45);
      for (let i = 0; i < 16; i++) this.bills.setColorAt(i, new THREE.Color(this.hues[(i + k) % 4]).multiplyScalar(0.6 + 0.8 * night));
      this.bills.instanceColor.needsUpdate = true;
    }
  }
}
