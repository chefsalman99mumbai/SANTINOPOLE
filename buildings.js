// Procedural architecture: deterministic, instanced, one shared window shader.
import { THREE } from './three.js';

export const P = 22;                       // block pitch; roads run at (i+0.5)*P
export const STREET_X = P / 2;             // the hero boulevard
export const DISTRICTS = {
  DOWNTOWN:   { h: [45, 120], pal: [0x7f93a8, 0x9aa7b4, 0x667789], plate: 0x2a2c33 },
  COMMERCIAL: { h: [16, 38],  pal: [0xd8c3a0, 0xc9a27a, 0xe0d2b8], plate: 0x30302f },
  WEB:        { h: [28, 78],  pal: [0x5d7d96, 0x4f6a84, 0x8aa2b5], plate: 0x24282f },
  SEO:        { h: [22, 58],  pal: [0xa9b7a8, 0x8fa39a, 0xc7cfc2], plate: 0x262b2a },
  GROWTH:     { h: [34, 90],  pal: [0xc79a62, 0xd9b27a, 0xa8794a], plate: 0x31291f },
  HISTORIC:   { h: [8, 17],   pal: [0xc98f5e, 0xb9774e, 0xd8b389], plate: 0x2f2b27 },
  RESIDENTIAL:{ h: [8, 22],   pal: [0xe2d4bf, 0xcfa98c, 0xb8b3a6], plate: 0x2c2d2a },
  WATERFRONT: { h: [7, 20],   pal: [0xb7c3c9, 0x93a3ad, 0xd0d6d6], plate: 0x2a2f33 },
};
export function districtAt(x, z) {
  if (z > 120) return 'WATERFRONT';
  if (x < -110) return 'HISTORIC';
  if (x > 110) return 'RESIDENTIAL';
  if (z > 40) return Math.abs(x) > 44 ? 'COMMERCIAL' : 'DOWNTOWN';
  if (z > -20) return 'WEB';
  if (z > -80) return 'SEO';
  return 'GROWTH';
}
const rng = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const VS = `#include <fog_pars_vertex>
varying vec3 vW; varying vec3 vN; varying vec3 vC;
void main(){ mat4 m=modelMatrix*instanceMatrix; vec4 wp=m*vec4(position,1.);
  vW=wp.xyz; vN=normalize(mat3(m)*normal); vC=instanceColor;
  vec4 mvPosition=viewMatrix*wp; gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
}`;
const FS = `uniform float uNight; uniform vec3 uSun; uniform float uTime;
varying vec3 vW; varying vec3 vN; varying vec3 vC;
#include <fog_pars_fragment>
float hs(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
void main(){
  float diff=.32+.68*max(dot(normalize(vN),normalize(uSun)),0.);
  vec3 c=vC*diff*mix(1.,.3,uNight);
  float side=1.-step(.5,abs(vN.y));
  vec2 g=vec2((vW.x+vW.z)*.5,vW.y*.34); vec2 f=fract(g), id=floor(g);
  float w=step(.22,f.x)*step(f.x,.78)*step(.28,f.y)*step(f.y,.78);
  float r=hs(id); float on=step(.62-.4*uNight,r);
  float flick=step(.985,hs(id+floor(uTime*.15)));
  float lit=side*w*max(on,flick)*(1.-step(vW.y,1.));
  vec3 warm=mix(vec3(1.,.82,.55),vec3(.7,.85,1.),step(.8,r));
  c=mix(c,c*.55+vec3(.05,.07,.1),side*w*(1.-uNight*.5));
  c+=lit*warm*(.15+1.1*uNight);
  c+=pow(1.-abs(vN.y),2.)*smoothstep(0.,60.,vW.y)*.04*uNight;
  gl_FragColor=vec4(c,1.);
  #include <fog_fragment>
}`;

export class Buildings {
  constructor(scene, env) {
    this.scene = scene; this.env = env; this.group = new THREE.Group(); this.anchors = {};
    this.geo = new THREE.BoxGeometry(1, 1, 1); this.geo.translate(0, 0.5, 0);   // base on ground, shared
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, fog: true,
      uniforms: Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog]),
        { uNight: env.uniforms.uNight, uSun: env.uniforms.uSun, uTime: env.uniforms.uTime }),
    });
    scene.add(this.group);
  }
  build(tier) {
    const rand = rng(1969), towers = [], plates = [], parks = [];
    for (const k in DISTRICTS) this.anchors[k] = [];
    for (let i = -14; i <= 14; i++) for (let j = -7; j <= 7; j++) {
      const cx = i * P, cz = j * P, name = districtAt(cx, cz), d = DISTRICTS[name], far = Math.abs(i) > 8;
      const r0 = rand();
      if (tier === 'low' && far && r0 > 0.7) continue;
      const park = (name === 'RESIDENTIAL' || name === 'HISTORIC' || name === 'COMMERCIAL') && r0 < 0.1;
      plates.push({ x: cx, z: cz, c: park ? 0x2f5a34 : d.plate });
      if (park) { parks.push({ x: cx, z: cz }); continue; }
      const lots = rand() < 0.45 ? [[0, 0, 13]] : [[-3.7, -3.7, 6.2], [3.7, -3.7, 6.2], [-3.7, 3.7, 6.2], [3.7, 3.7, 6.2]];
      for (const [ox, oz, s] of lots) {
        if (lots.length === 4 && rand() < 0.18) continue;
        const centre = 1 - Math.min(1, Math.hypot(cx - STREET_X, cz) / 260);          // density gradient toward the core
        const h = d.h[0] + (d.h[1] - d.h[0]) * Math.pow(rand(), 1.6) * (0.55 + 0.7 * centre);
        const col = new THREE.Color(d.pal[Math.floor(rand() * d.pal.length)]).multiplyScalar(0.85 + rand() * 0.3);
        const x = cx + ox, z = cz + oz;
        towers.push({ x, z, sx: s, sz: s, h, col });
        if (h > 48) {                                                                    // setback crown
          towers.push({ x, z, sx: s * 0.6, sz: s * 0.6, h: h * 1.22, col: col.clone().multiplyScalar(1.08), y: 0 });
          this.anchors[name].push(new THREE.Vector3(x, h * 1.22, z));
        } else if (h > 24) this.anchors[name].push(new THREE.Vector3(x, h, z));
      }
    }
    const m = new THREE.InstancedMesh(this.geo, this.mat, towers.length), o = new THREE.Object3D();
    towers.forEach((t, n) => { o.position.set(t.x, 0, t.z); o.scale.set(t.sx, t.h, t.sz); o.updateMatrix(); m.setMatrixAt(n, o.matrix); m.setColorAt(n, t.col); });
    m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.frustumCulled = false;
    const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(P - 7, 0.5, P - 7), new THREE.MeshLambertMaterial({ color: 0xffffff }), plates.length);
    plates.forEach((p, n) => { o.position.set(p.x, 0.25, p.z); o.scale.set(1, 1, 1); o.updateMatrix(); pm.setMatrixAt(n, o.matrix); pm.setColorAt(n, new THREE.Color(p.c)); });
    pm.frustumCulled = false;
    this.group.add(pm, m); this.towers = m; this.count = towers.length;
  }
  getAnchors(name) { return this.anchors[name] || []; }
  dispose() { this.geo.dispose(); this.mat.dispose(); this.scene.remove(this.group); }
}
