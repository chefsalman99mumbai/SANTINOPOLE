/* ============================================================
   SANTINOPOLE — environment.js — MARINE DRIVE
   Arabian Sea. Dawn → midday → golden hour → sunset.
   ============================================================ */

(function () {
  'use strict';
  var S = window.SANTINOPOLE;
  var THREE = window.THREE;
  if (!S || !S.buildings || !S.performance || !THREE) { console.error('deps missing'); return; }
  var Q = S.performance.Q;

  var canvas = document.getElementById('scene');
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: Q.antialias,
      powerPreference: Q.isMobile ? 'low-power' : 'high-performance',
      stencil: false, alpha: false, depth: true, precision: 'highp'
    });
  } catch (e) { S.fatal('WebGL failed'); return; }
  renderer.setPixelRatio(Q.effectivePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.10;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xe8e0d0, 0.0009);

  var camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.6, 6000);
  camera.position.set(500, 700, 900);
  camera.lookAt(450, 30, -150);

  /* ============================================================
     SKY — atmospheric gradient + procedural clouds
     ============================================================ */
  var skyUniforms = {
    uTop:  { value: new THREE.Color('#3a78be') },
    uMid:  { value: new THREE.Color('#8fb8dc') },
    uHor:  { value: new THREE.Color('#f4e2bc') },
    uSun:  { value: new THREE.Vector3(0, 0.5, 0.8) },
    uSunColor: { value: new THREE.Color('#ffe0a8') },
    uTime: { value: 0 }
  };
  var skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform vec3 uTop, uMid, uHor, uSunColor, uSun;',
      'uniform float uTime;',
      'varying vec3 vDir;',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float noise(vec2 p){',
      '  vec2 i = floor(p); vec2 f = fract(p);',
      '  float a = hash(i); float b = hash(i + vec2(1.0, 0.0));',
      '  float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));',
      '  vec2 u = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
      '}',
      'float fbm(vec2 p){',
      '  float v = 0.0; float a = 0.5;',
      '  for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.05; a *= 0.5; }',
      '  return v;',
      '}',
      'void main(){',
      '  vec3 d = normalize(vDir);',
      '  float h = d.y;',
      '  vec3 col = mix(uHor, uMid, smoothstep(-0.05, 0.32, h));',
      '  col = mix(col, uTop, smoothstep(0.22, 0.85, h));',
      '  float sunDot = max(0.0, dot(d, normalize(uSun)));',
      '  float glow = pow(sunDot, 14.0) * 0.55 + pow(sunDot, 3.0) * 0.14;',
      '  col += uSunColor * glow;',
      '  col += vec3(1.0, 0.94, 0.82) * pow(sunDot, 800.0) * 1.6;',
      '  if (h > 0.02){',
      '    vec2 uv = d.xz / max(h + 0.12, 0.15);',
      '    uv *= 1.2;',
      '    float t = uTime * 0.008;',
      '    float n = fbm(uv + vec2(t, t*0.5));',
      '    float n2 = fbm(uv * 1.7 + vec2(-t*0.7, t*0.3) + 5.0);',
      '    float cloud = smoothstep(0.52, 0.78, n*0.7 + n2*0.4);',
      '    cloud *= smoothstep(0.30, 1.0, h);',
      '    vec3 cCol = mix(vec3(0.94,0.92,0.88), vec3(1.0,0.98,0.94), cloud);',
      '    cCol = mix(cCol, vec3(1.0,0.92,0.78), glow*0.6);',
      '    col = mix(col, cCol, cloud * 0.85);',
      '  }',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  });
  var sky = new THREE.Mesh(new THREE.SphereGeometry(4200, 48, 32), skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  scene.add(sky);

  /* ============================================================
     REMOVE ANYTHING FROM BUILDINGS.JS THAT DUPLICATES SEA
     ============================================================ */
  if (S.buildings && S.buildings.group) {
    var oldSea = S.buildings.group.getObjectByName('sea');
    if (oldSea) S.buildings.group.remove(oldSea);
  }

  /* ============================================================
     SEA — custom water shader, Arabian Sea
     ============================================================ */
  var seaUniforms = {
    uDeep:     { value: new THREE.Color('#1a3a52') },
    uShallow:  { value: new THREE.Color('#5fa0b8') },
    uSunDir:   { value: new THREE.Vector3(0, 0.5, 0.8) },
    uSunColor: { value: new THREE.Color('#ffe0a8') },
    uTime:     { value: 0 }
  };
  var seaMat = new THREE.ShaderMaterial({
    uniforms: seaUniforms,
    vertexShader: 'varying vec3 vWorldPos; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: [
      'uniform vec3 uDeep, uShallow, uSunDir, uSunColor;',
      'uniform float uTime;',
      'varying vec3 vWorldPos;',
      'void main(){',
      '  vec3 vd = normalize(cameraPosition - vWorldPos);',
      '  float fres = pow(1.0 - max(0.0, dot(vd, vec3(0.0, 1.0, 0.0))), 2.5);',
      '  float r1 = sin(vWorldPos.x * 0.11 + uTime * 0.55) * 0.5 + 0.5;',
      '  float r2 = sin(vWorldPos.z * 0.14 - uTime * 0.42) * 0.5 + 0.5;',
      '  float r3 = sin((vWorldPos.x + vWorldPos.z) * 0.07 + uTime * 0.7) * 0.5 + 0.5;',
      '  float rip = r1*r2*0.6 + r3*0.4;',
      '  vec3 col = mix(uDeep, uShallow, fres * 0.82 + rip * 0.14);',
      '  float spec = pow(max(0.0, dot(vd, normalize(uSunDir))), 90.0);',
      '  col += uSunColor * spec * 1.3;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  });
  var seaGeo = new THREE.PlaneGeometry(5000, 2400, 1, 1);
  seaGeo.rotateX(-Math.PI / 2);
  var sea = new THREE.Mesh(seaGeo, seaMat);
  sea.position.set(450, -0.6, 500);
  sea.renderOrder = -1;
  scene.add(sea);

  /* ============================================================
     GROUND (the land under the buildings — mostly hidden)
     ============================================================ */
  var groundGeo = new THREE.PlaneGeometry(2500, 2500);
  groundGeo.rotateX(-Math.PI / 2);
  var ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.95 }));
  ground.position.set(450, 0.01, -300);
  scene.add(ground);

  /* ============================================================
     DISTANT MOUNTAINS — hazy silhouettes on the horizon
     ============================================================ */
  (function () {
    var geo = new THREE.BufferGeometry();
    var N = 96, verts = [], idx = [];
    for (var i = 0; i <= N; i++) {
      var t = i / N;
      var ang = (t - 0.5) * Math.PI * 1.4;
      var r = 3600;
      var x = Math.sin(ang) * r;
      var z = -Math.cos(ang) * r + 400;
      var h = 200 * (0.35 + 0.65 * Math.abs(Math.sin(t * 7.3) * 0.5 + 0.5));
      verts.push(x, -20, z, x, h, z);
      if (i < N) {
        var a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0xa8b4c0, transparent: true, opacity: 0.45, side: THREE.DoubleSide, fog: false
    }));
    m.renderOrder = -900;
    scene.add(m);
  })();

  /* ============================================================
     LIGHTS
     ============================================================ */
  var sunLight = new THREE.DirectionalLight(0xfff0d0, 3.2);
  sunLight.position.set(400, 500, 600);
  sunLight.target.position.set(450, 0, -150);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(Math.min(Q.shadowMap || 2048, 2048), Math.min(Q.shadowMap || 2048, 2048));
  sunLight.shadow.camera.left = -500;
  sunLight.shadow.camera.right = 500;
  sunLight.shadow.camera.top = 500;
  sunLight.shadow.camera.bottom = -500;
  sunLight.shadow.camera.near = 100;
  sunLight.shadow.camera.far = 2500;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.4;
  scene.add(sunLight);
  scene.add(sunLight.target);

  var hemi = new THREE.HemisphereLight(0xd4e6f8, 0xb0a480, 1.05);
  scene.add(hemi);

  var ambient = new THREE.AmbientLight(0xc8ccd0, 0.5);
  scene.add(ambient);

  /* ============================================================
     ADD THE CITY (Marine Drive)
     ============================================================ */
  scene.add(S.buildings.group);

  /* ============================================================
     ENVIRONMENT TIMELINE — dawn → sunrise → day → sunset
     Sun rises behind buildings (−Z), sets over the sea (+Z).
     ============================================================ */
  var ENV_KEYS = [
    // ACT I — dawn
    { p: 0.00, top:'#2a4a7a', mid:'#8a96a8', hor:'#f0b088',
      sunC:'#ffd0a0', sunI: 1.9, az: 170, el: 6,
      hemiS:'#b8c8dc', hemiG:'#8a8070', hemiI: 0.85, ambI: 0.42,
      fogC:'#d8c0a8', fogD: 0.00120, exp: 1.05 },

    // ACT II — sunrise
    { p: 0.13, top:'#3a6ab0', mid:'#98b0cc', hor:'#f4c898',
      sunC:'#ffe0b0', sunI: 2.6, az: 140, el: 18,
      hemiS:'#c8dce8', hemiG:'#a89c88', hemiI: 1.00, ambI: 0.48,
      fogC:'#e0d0b8', fogD: 0.00110, exp: 1.08 },

    // ACT III — morning
    { p: 0.25, top:'#4a8ecc', mid:'#a8c4e0', hor:'#f6e4c0',
      sunC:'#fff4d8', sunI: 3.2, az: 110, el: 32,
      hemiS:'#d0e4f4', hemiG:'#b8ac94', hemiI: 1.12, ambI: 0.55,
      fogC:'#e8dcc4', fogD: 0.00095, exp: 1.12 },

    // ACT IV — midday
    { p: 0.40, top:'#3a80c8', mid:'#9cc0e0', hor:'#f8ecc8',
      sunC:'#ffffff', sunI: 3.7, az: 85, el: 68,
      hemiS:'#d8e8f8', hemiG:'#c0b498', hemiI: 1.20, ambI: 0.62,
      fogC:'#e4dcc8', fogD: 0.00085, exp: 1.12 },

    // ACT V — afternoon
    { p: 0.55, top:'#3d82cc', mid:'#a0c4e0', hor:'#f6e4bc',
      sunC:'#fff0c8', sunI: 3.5, az: 45, el: 48,
      hemiS:'#d4e4f4', hemiG:'#bcb094', hemiI: 1.16, ambI: 0.58,
      fogC:'#e4dcc4', fogD: 0.00090, exp: 1.12 },

    // ACT VI — late afternoon
    { p: 0.72, top:'#3d7ac8', mid:'#a0bcd8', hor:'#f6dcb0',
      sunC:'#ffe8b0', sunI: 3.0, az: 20, el: 26,
      hemiS:'#d0dcec', hemiG:'#b8ac90', hemiI: 1.08, ambI: 0.54,
      fogC:'#e2d4b8', fogD: 0.00100, exp: 1.13 },

    // ACT VII — golden hour
    { p: 0.88, top:'#3a6cb0', mid:'#c0988c', hor:'#ffb070',
      sunC:'#ffb060', sunI: 2.4, az: 5, el: 10,
      hemiS:'#c8c0cc', hemiG:'#a89080', hemiI: 0.92, ambI: 0.50,
      fogC:'#e8b890', fogD: 0.00115, exp: 1.15 },

    // ACT VIII — sunset over the sea
    { p: 1.00, top:'#2a4a80', mid:'#8a5870', hor:'#ff8040',
      sunC:'#ff7030', sunI: 1.9, az: 0, el: 3,
      hemiS:'#b0a0b8', hemiG:'#8a7068', hemiI: 0.78, ambI: 0.46,
      fogC:'#d89060', fogD: 0.00128, exp: 1.18 }
  ];

  for (var ek = 0; ek < ENV_KEYS.length; ek++) {
    var k = ENV_KEYS[ek];
    k._top = new THREE.Color(k.top);
    k._mid = new THREE.Color(k.mid);
    k._hor = new THREE.Color(k.hor);
    k._sunC = new THREE.Color(k.sunC);
    k._hemiS = new THREE.Color(k.hemiS);
    k._hemiG = new THREE.Color(k.hemiG);
    k._fogC = new THREE.Color(k.fogC);
  }
  var _c = new THREE.Color();
  var _sunDir = new THREE.Vector3();

  function sampleEnv(p) {
    var i = 0;
    while (i < ENV_KEYS.length - 2 && p > ENV_KEYS[i + 1].p) i++;
    var a = ENV_KEYS[i], b = ENV_KEYS[i + 1];
    var span = b.p - a.p;
    var t = span > 0 ? Math.max(0, Math.min(1, (p - a.p) / span)) : 0;
    return {
      top: _c.copy(a._top).lerp(b._top, t).clone(),
      mid: _c.copy(a._mid).lerp(b._mid, t).clone(),
      hor: _c.copy(a._hor).lerp(b._hor, t).clone(),
      sunC: _c.copy(a._sunC).lerp(b._sunC, t).clone(),
      sunI: a.sunI + (b.sunI - a.sunI) * t,
      az: a.az + (b.az - a.az) * t,
      el: a.el + (b.el - a.el) * t,
      hemiS: _c.copy(a._hemiS).lerp(b._hemiS, t).clone(),
      hemiG: _c.copy(a._hemiG).lerp(b._hemiG, t).clone(),
      hemiI: a.hemiI + (b.hemiI - a.hemiI) * t,
      ambI: a.ambI + (b.ambI - a.ambI) * t,
      fogC: _c.copy(a._fogC).lerp(b._fogC, t).clone(),
      fogD: a.fogD + (b.fogD - a.fogD) * t,
      exp: a.exp + (b.exp - a.exp) * t
    };
  }

  /* ============================================================
     POST — bloom + god rays + film grade
     ============================================================ */
  var post = null;
  if (Q.tier >= 1) {
    var W = Math.floor(window.innerWidth * Q.effectivePixelRatio);
    var H = Math.floor(window.innerHeight * Q.effectivePixelRatio);
    var qw = Math.max(64, Math.floor(W / 4));
    var qh = Math.max(64, Math.floor(H / 4));

    var rtScene = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: true });
    var rtBright = new THREE.WebGLRenderTarget(qw, qh, { type: THREE.HalfFloatType, depthBuffer: false });
    var rtBlurA = new THREE.WebGLRenderTarget(qw, qh, { type: THREE.HalfFloatType, depthBuffer: false });
    var rtBlurB = new THREE.WebGLRenderTarget(qw, qh, { type: THREE.HalfFloatType, depthBuffer: false });
    var rtRays = new THREE.WebGLRenderTarget(qw, qh, { type: THREE.HalfFloatType, depthBuffer: false });

    var quadGeo = new THREE.PlaneGeometry(2, 2);
    var quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    var brightMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, threshold: { value: 0.80 }, soft: { value: 0.35 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform float threshold, soft;',
        'varying vec2 vUv;',
        'void main(){',
        '  vec3 c = texture2D(tDiffuse, vUv).rgb;',
        '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
        '  float f = smoothstep(threshold - soft, threshold + soft, l);',
        '  gl_FragColor = vec4(c * f, 1.0);',
        '}'
      ].join('\n'),
      depthTest: false, depthWrite: false
    });

    var blurMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, direction: { value: new THREE.Vector2() } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform vec2 direction;',
        'varying vec2 vUv;',
        'void main(){',
        '  vec4 s = texture2D(tDiffuse, vUv) * 0.227;',
        '  s += texture2D(tDiffuse, vUv + direction * 1.3846) * 0.3162;',
        '  s += texture2D(tDiffuse, vUv - direction * 1.3846) * 0.3162;',
        '  s += texture2D(tDiffuse, vUv + direction * 3.2307) * 0.0702;',
        '  s += texture2D(tDiffuse, vUv - direction * 3.2307) * 0.0702;',
        '  gl_FragColor = s;',
        '}'
      ].join('\n'),
      depthTest: false, depthWrite: false
    });

    var raysMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uSunPos: { value: new THREE.Vector2(0.5, 0.5) },
        uIntensity: { value: 0.55 }
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform vec2 uSunPos; uniform float uIntensity;',
        'varying vec2 vUv;',
        'void main(){',
        '  vec2 dir = (vUv - uSunPos) * 0.10;',
        '  vec3 sum = vec3(0.0);',
        '  float w = 0.0;',
        '  for (int i = 0; i < 22; i++){',
        '    float fi = float(i);',
        '    vec2 uv = vUv - dir * fi;',
        '    float wi = 1.0 - fi / 22.0;',
        '    sum += texture2D(tDiffuse, uv).rgb * wi;',
        '    w += wi;',
        '  }',
        '  sum /= max(w, 0.001);',
        '  gl_FragColor = vec4(sum * uIntensity, 1.0);',
        '}'
      ].join('\n'),
      depthTest: false, depthWrite: false
    });

    var compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null }, tBloom: { value: null }, tRays: { value: null },
        uBloom: { value: 0.65 }, uRays: { value: 0.55 },
        uChroma: { value: 0.0018 }, uVignette: { value: 0.38 },
        uGrain: { value: 0.024 }, uTime: { value: 0 }, uWarmth: { value: 0.40 }
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tScene, tBloom, tRays;',
        'uniform float uBloom, uRays, uChroma, uVignette, uGrain, uTime, uWarmth;',
        'varying vec2 vUv;',
        'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
        'void main(){',
        '  vec2 dir = (vUv - 0.5) * uChroma;',
        '  vec3 col;',
        '  col.r = texture2D(tScene, vUv + dir).r;',
        '  col.g = texture2D(tScene, vUv).g;',
        '  col.b = texture2D(tScene, vUv - dir).b;',
        '  col += texture2D(tBloom, vUv).rgb * uBloom;',
        '  col += texture2D(tRays,  vUv).rgb * uRays;',
        '  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));',
        '  vec3 warm = vec3(1.06, 1.0, 0.94);',
        '  vec3 cool = vec3(0.94, 0.98, 1.05);',
        '  vec3 grade = mix(cool, warm, smoothstep(0.2, 0.8, lum));',
        '  col = mix(col, col * grade, uWarmth);',
        '  float d = distance(vUv, vec2(0.5));',
        '  col *= mix(1.0, smoothstep(0.85, 0.30, d), uVignette);',
        '  col += (hash(vUv * 1200.0 + vec2(uTime * 91.7, uTime * 47.3)) - 0.5) * uGrain;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n'),
      depthTest: false, depthWrite: false
    });

    var quad = new THREE.Mesh(quadGeo, brightMat);
    quad.frustumCulled = false;
    var quadScene = new THREE.Scene();
    quadScene.add(quad);

    post = {
      rtScene: rtScene, rtBright: rtBright, rtBlurA: rtBlurA, rtBlurB: rtBlurB, rtRays: rtRays,
      quad: quad, quadScene: quadScene, quadCam: quadCam,
      brightMat: brightMat, blurMat: blurMat, raysMat: raysMat, compositeMat: compositeMat,
      qw: qw, qh: qh,
      resize: function () {
        var w = Math.floor(window.innerWidth * Q.effectivePixelRatio);
        var h = Math.floor(window.innerHeight * Q.effectivePixelRatio);
        rtScene.setSize(w, h);
        var qw2 = Math.max(64, Math.floor(w / 4));
        var qh2 = Math.max(64, Math.floor(h / 4));
        rtBright.setSize(qw2, qh2); rtBlurA.setSize(qw2, qh2);
        rtBlurB.setSize(qw2, qh2); rtRays.setSize(qw2, qh2);
        post.qw = qw2; post.qh = qh2;
      }
    };
  }

  var _sunScreen = new THREE.Vector3();

  function update(progress, dt, elapsed) {
    var env = sampleEnv(progress);

    skyUniforms.uTop.value.copy(env.top);
    skyUniforms.uMid.value.copy(env.mid);
    skyUniforms.uHor.value.copy(env.hor);
    skyUniforms.uSunColor.value.copy(env.sunC);
    skyUniforms.uTime.value = elapsed;
    sky.position.copy(camera.position);

    scene.fog.color.copy(env.fogC);
    scene.fog.density = env.fogD;

    var azRad = env.az * Math.PI / 180;
    var elRad = env.el * Math.PI / 180;
    _sunDir.set(Math.cos(elRad) * Math.sin(azRad), Math.sin(elRad), Math.cos(elRad) * Math.cos(azRad)).normalize();
    skyUniforms.uSun.value.copy(_sunDir);

    sunLight.color.copy(env.sunC);
    sunLight.intensity = env.sunI;
    sunLight.position.copy(camera.position).addScaledVector(_sunDir, 1400);
    sunLight.target.position.set(camera.position.x + 200, 0, camera.position.z - 200);
    sunLight.target.updateMatrixWorld();

    hemi.color.copy(env.hemiS);
    hemi.groundColor.copy(env.hemiG);
    hemi.intensity = env.hemiI;
    ambient.intensity = env.ambI;
    renderer.toneMappingExposure = env.exp;

    seaUniforms.uSunDir.value.copy(_sunDir);
    seaUniforms.uSunColor.value.copy(env.sunC);
    seaUniforms.uTime.value = elapsed;

    if (post) {
      renderer.setRenderTarget(post.rtScene);
      renderer.clear();
      renderer.render(scene, camera);

      post.quad.material = post.brightMat;
      post.brightMat.uniforms.tDiffuse.value = post.rtScene.texture;
      renderer.setRenderTarget(post.rtBright);
      renderer.clear();
      renderer.render(post.quadScene, post.quadCam);

      post.quad.material = post.blurMat;
      post.blurMat.uniforms.tDiffuse.value = post.rtBright.texture;
      post.blurMat.uniforms.direction.value.set(1 / post.qw, 0);
      renderer.setRenderTarget(post.rtBlurA);
      renderer.clear();
      renderer.render(post.quadScene, post.quadCam);

      post.blurMat.uniforms.tDiffuse.value = post.rtBlurA.texture;
      post.blurMat.uniforms.direction.value.set(0, 1 / post.qh);
      renderer.setRenderTarget(post.rtBlurB);
      renderer.clear();
      renderer.render(post.quadScene, post.quadCam);

      _sunScreen.copy(camera.position).addScaledVector(_sunDir, 2000).project(camera);
      post.quad.material = post.raysMat;
      post.raysMat.uniforms.tDiffuse.value = post.rtBright.texture;
      post.raysMat.uniforms.uSunPos.value.set((_sunScreen.x + 1) * 0.5, (_sunScreen.y + 1) * 0.5);
      renderer.setRenderTarget(post.rtRays);
      renderer.clear();
      renderer.render(post.quadScene, post.quadCam);

      post.quad.material = post.compositeMat;
      post.compositeMat.uniforms.tScene.value = post.rtScene.texture;
      post.compositeMat.uniforms.tBloom.value = post.rtBlurB.texture;
      post.compositeMat.uniforms.tRays.value = post.rtRays.texture;
      post.compositeMat.uniforms.uTime.value = elapsed;
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(post.quadScene, post.quadCam);
    } else {
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(scene, camera);
    }
  }

  function resize() {
    renderer.setPixelRatio(Q.effectivePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (post) post.resize();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 220); });

  S.environment = {
    scene: scene, camera: camera, renderer: renderer,
    sky: sky, sea: sea, sunLight: sunLight, hemi: hemi, ambient: ambient,
    update: update, resize: resize, sampleEnv: sampleEnv
  };

  S.log('environment', true, post ? 'sea · sky · dawn→sunset · film grade' : 'sea · sky');

})();
