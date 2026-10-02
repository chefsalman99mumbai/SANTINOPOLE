// Sky dome, stars, fog, light rig. Owns shared uniforms (uNight, uSun, uTime) used by buildings.
import { THREE } from './three.js';

const C = (h) => new THREE.Color(h);
const SKY = { topDay: C(0x3f6aa8), horDay: C(0xf0b58a), topNight: C(0x04060f), horNight: C(0x1b2440) };
const sm = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };

export class Environment {
  constructor(stage) {
    this.stage = stage; this.scene = stage.scene;
    this.uniforms = { uNight: { value: 0 }, uSun: { value: new THREE.Vector3(0.5, 0.35, 0.4) }, uTime: { value: 0 } };
    this.skyU = { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uNight: this.uniforms.uNight };
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1800, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
        vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: `uniform vec3 uTop,uHor; uniform float uNight; varying vec3 vD;
          float h(vec3 p){ return fract(sin(dot(p,vec3(12.9,78.2,37.7)))*43758.5); }
          void main(){ float t=pow(clamp(vD.y,0.,1.),.55); vec3 c=mix(uHor,uTop,t);
            vec3 g=floor(vD*260.); float s=step(.9975,h(g))*smoothstep(.15,.5,vD.y)*uNight;
            gl_FragColor=vec4(c+s*.9,1.); }`
      })
    );
    this.sky.renderOrder = -1; this.sky.frustumCulled = false;
    this.hemi = new THREE.HemisphereLight(0xbcd0ff, 0x241c18, 0.9);
    this.sun = new THREE.DirectionalLight(0xffd2a0, 1.6);
    this.sun.position.set(300, 200, 200);
    this.scene.add(this.sky, this.hemi, this.sun);
    this.tier = 'high';
  }
  setQuality(tier) { this.tier = tier; }
  update(t, p) {
    const night = sm(0.18, 0.42, p) * (1 - 0.45 * sm(0.86, 1, p));       // golden hour → night → blue hour
    const u = this.uniforms; u.uNight.value = night; u.uTime.value = t;
    u.uSun.value.set(0.5, 0.45 - 0.3 * night, 0.4).normalize();
    this.skyU.uTop.value.copy(SKY.topDay).lerp(SKY.topNight, night);
    this.skyU.uHor.value.copy(SKY.horDay).lerp(SKY.horNight, night);
    this.scene.fog.color.copy(this.skyU.uHor.value);
    this.scene.fog.density = 0.0013 + 0.0004 * night;
    this.hemi.intensity = 0.9 - 0.6 * night;
    this.sun.intensity = 1.6 - 1.35 * night;
    this.sun.color.setHex(0xffd2a0).lerp(C(0x7f9bff), night);
    this.sky.position.copy(this.stage.camera.position);
  }
}
