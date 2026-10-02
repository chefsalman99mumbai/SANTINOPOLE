/* ============================================================
   SANTINOPOLE — environment.js — FINAL EDITION
   Cinematic Sunday morning. Film-grade post-processing.
   ============================================================ */

(function () {
  'use strict';
  var S = window.SANTINOPOLE;
  var THREE = window.THREE;
  if (!S || !S.buildings || !S.performance || !S.city || !THREE) { console.error('deps missing'); return; }
  var Q = S.performance.Q;

  var canvas = document.getElementById('scene');
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: Q.antialias,
      powerPreference: Q.isMobile ? 'low-power' : 'high-performance',
      stencil: false, alpha: false, depth: true,
      precision: 'highp'
    });
  } catch (e) { S.fatal('WebGL failed'); return; }
  renderer.setPixelRatio(Q.effectivePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xe8e0d0, 0.0011);

  var camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.6, 6000);
  camera.position.set(0, 380, 900);
  camera.lookAt(0, 40, 0);

  /* ============================================================
     SKY — gradient + procedural clouds
     ============================================================ */
  var skyUniforms = {
    uTop:  { value: new THREE.Color('#3d7fc4') },
    uMid:  { value: new THREE.Color('#8fb8dc') },
    uHor:  { value: new THREE.Color('#f6e8c8') },
    uSun:  { value: new THREE.Vector3(0.4, 0.6, 0.7) },
    uSunColor: { value: new THREE.Color('#ffe4b0') },
    uTime: { value: 0 }
  };
  var skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: [
      'varying vec3 vDir;',
      'void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uTop, uMid, uHor, uSunColor;',
      'uniform vec3 uSun;',
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
      '  vec3 col = mix(uHor, uMid, smoothstep(-0.05, 0.35, h));',
      '  col = mix(col, uTop, smoothstep(0.25, 0.85, h));',
      // sun disc + glow
      '  float sunDot = max(0.0, dot(d, normalize(uSun)));',
      '  float sunGlow = pow(sunDot, 12.0) * 0.55 + pow(sunDot, 3.0) * 0.15;',
      '  col += uSunColor * sunGlow;',
      '  float sunDisc = pow(sunDot, 800.0);',
      '  col += vec3(1.0, 0.94, 0.82) * sunDisc * 1.6;',
      // clouds — only in upper hemisphere
      '  if (h > 0.02) {',
      '    vec2 uv = d.xz / max(h + 0.12, 0.15);',
      '    uv *= 1.2;',
      '    float t = uTime * 0.008;',
      '    float n = fbm(uv + vec2(t, t * 0.5));',
      '    float n2 = fbm(uv * 1.7 + vec2(-t * 0.7, t * 0.3) + 5.0);',
      '    float cloud = smoothstep(0.52, 0.78, n * 0.7 + n2 * 0.4);',
      '    float cloudFar = smoothstep(0.30, 1.0, h);',
      '    cloud *= cloudFar;',
      '    vec3 cloudCol = mix(vec3(0.94, 0.92, 0.88), vec3(1.0, 0.98, 0.94), cloud);',
      // sun behind cloud gets warm rim
      '    cloudCol = mix(cloudCol, vec3(1.0, 0.92, 0.78), sunGlow * 0.6);',
      '    col = mix(col, cloudCol, cloud * 0.85);',
      '  }',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  });
  var skyRadius = 3800;
  var sky = new THREE.Mesh(new THREE.SphereGeometry(skyRadius, 48, 32), skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  scene.add(sky);

  /* ============================================================
     GROUND
     ============================================================ */
  var groundGeo = new THREE.PlaneGeometry(7000, 5000, 1, 1);
  groundGeo.rotateX(-Math.PI / 2);
  var groundMat = new THREE.MeshStandardMaterial({ color: 0x9a8c72, roughness: 0.95 });
  var ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(0, 0.05, 140);
  ground.receiveShadow = true;
  scene.add(ground);

  /* ============================================================
     WATER
     ============================================================ */
  var waterUniforms = {
    uDeep: { value: new THREE.Color('#1d4458') },
    uShallow: { value: new THREE.Color('#6aa8c0') },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color('#fff0d0') },
    uTime: { value: 0 }
  };
  var waterMat = new THREE.ShaderMaterial({
    uniforms: waterUniforms,
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
      '  vec3 col = mix(uDeep, uShallow, fres * 0.85 + rip * 0.12);',
      '  float spec = pow(max(0.0, dot(vd, normalize(uSunDir))), 80.0);',
      '  col += uSunColor * spec * 1.2;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  });
  var waterGeo = new THREE.PlaneGeometry(6000, 3000, 1, 1);
  waterGeo.rotateX(-Math.PI / 2);
  var water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(0, -0.15, -1800);
  scene.add(water);

  /* ============================================================
     LIGHTS
     ============================================================ */
  var sunLight = new THREE.DirectionalLight(0xfff0d0, 3.6);
  sunLight.position.set(300, 380, 200);
  sunLight.target.position.set(0, 0, 0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(Math.min(Q.shadowMap || 2048, 2048), Math.min(Q.shadowMap || 2048, 2048));
  sunLight.shadow.camera.left = -700;
  sunLight.shadow.camera.right = 700;
  sunLight.shadow.camera.top = 700;
  sunLight.shadow.camera.bottom = -700;
  sunLight.shadow.camera.near = 100;
  sunLight.shadow.camera.far = 2400;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.4;
  scene.add(sunLight);
  scene.add(sunLight.target);

  var hemi = new THREE.HemisphereLight(0xd0e4f4, 0xb0a480, 1.15);
  scene.add(hemi);

  var ambient = new THREE.AmbientLight(0xc8ccd0, 0.62);
  scene.add(ambient);

  /* ============================================================
     DISTANT MOUNTAINS — atmospheric silhouettes on horizon
     ============================================================ */
  (function () {
    var geo = new THREE.BufferGeometry();
    var N = 96;
    var verts = [], idx = [];
    var baseY = -20, maxY = 180;
    for (var i = 0; i <= N; i++) {
      var t = i / N;
      var ang = (t - 0.5) * Math.PI * 1.4;
      var r = 3200;
      var x = Math.sin(ang) * r;
      var z = -Math.cos(ang) * r;
      var h = maxY * (0.35 + 0.65 * Math.abs(Math.sin(t * 7.3) * 0.5 + 0.5));
      verts.push(x, baseY, z);
      verts.push(x, h, z);
      if (i < N) {
        var a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    var mat = new THREE.MeshBasicMaterial({
      color: 0xa8b4c0,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      fog: false
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = -900;
    scene.add(mesh);
  })();

  scene.add(S.buildings.group);

  /* ============================================================
     ENVIRONMENT TIMELINE
     ============================================================ */
  var ENV_KEYS = [
    { p: 0.00, top:'#3a78be', mid:'#88b4dc', hor:'#f4e2bc', sunC:'#ffdca0', sunI: 3.2, az: 115, el: 18, hemiS:'#d0e4f6', hemiG:'#b8ac90', hemiI: 1.12, ambI: 0.58, fogC:'#e8dcc4', fogD: 0.00105, exp: 1.14 },
    { p: 0.25, top:'#3a78be', mid:'#8ab6dc', hor:'#f6e6bc', sunC:'#ffe0a8', sunI: 3.5, az: 85, el: 32, hemiS:'#d0e4f6', hemiG:'#bcb094', hemiI: 1.16, ambI: 0.60, fogC:'#e8dcc4', fogD: 0.00098, exp: 1.14 },
    { p: 0.50, top:'#3d7fc4', mid:'#8fb8dc', hor:'#f6e8c8', sunC:'#ffecb8', sunI: 3.6, az: 55, el: 45, hemiS:'#d4e6f8', hemiG:'#bcb094', hemiI: 1.18, ambI: 0.62, fogC:'#e6dcc4', fogD: 0.00092, exp: 1.14 },
    { p: 0.75, top:'#3d7fc4', mid:'#92bad8', hor:'#f8e8c0', sunC:'#ffeab0', sunI: 3.5, az: 25, el: 38, hemiS:'#d4e6f8', hemiG:'#bcb094', hemiI: 1.16, ambI: 0.60, fogC:'#e6dcc4', fogD: 0.00096, exp: 1.14 },
    { p: 1.00, top:'#3d7fc4', mid:'#90b8d8', hor:'#f8e2b0', sunC:'#ffe4a0', sunI: 3.3, az: -5, el: 22, hemiS:'#d0e2f4', hemiG:'#b8ac90', hemiI: 1.10, ambI: 0.58, fogC:'#e6d8bc', fogD: 0.00108, exp: 1.15 }
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
     POST-PROCESSING — FILM STOCK PIPELINE
     ============================================================ */
  var post = null;
  (function buildPost() {
    if (Q.tier < 1) return;

    var W = Math.floor(window.innerWidth * Q.effectivePixelRatio);
    var H = Math.floor(window.innerHeight * Q.effectivePixelRatio);
    var halfW = Math.floor(W / 2);
    var halfH = Math.floor(H / 2);
    var quartW = Math.max(64, Math.floor(halfW / 2));
    var quartH = Math.max(64, Math.floor(halfH / 2));

    var rtScene = new THREE.WebGLRenderTarget(W, H, {
      type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: true, stencilBuffer: false
    });
    var rtBright = new THREE.WebGLRenderTarget(quartW, quartH, { type: THREE.HalfFloatType, depthBuffer: false });
    var rtBlurA = new THREE.WebGLRenderTarget(quartW, quartH, { type: THREE.HalfFloatType, depthBuffer: false });
    var rtBlurB = new THREE.WebGLRenderTarget(quartW, quartH, { type: THREE.HalfFloatType, depthBuffer: false });
    var rtRays = new THREE.WebGLRenderTarget(quartW, quartH, { type: THREE.HalfFloatType, depthBuffer: false });
    var rtRays2 = new THREE.WebGLRenderTarget(quartW, quartH, { type: THREE.HalfFloatType, depthBuffer: false });

    var quadGeo = new THREE.PlaneGeometry(2, 2);
    var quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    var brightMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, threshold: { value: 0.78 }, soft: { value: 0.4 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform float threshold; uniform float soft;',
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

    // God rays — radial blur from sun screen position
    var raysMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uSunPos: { value: new THREE.Vector2(0.5, 0.5) },
        uIntensity: { value: 0.6 }
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform vec2 uSunPos; uniform float uIntensity;',
        'varying vec2 vUv;',
        'void main(){',
        '  vec2 dir = (vUv - uSunPos) * 0.10;',
        '  vec3 sum = vec3(0.0);',
        '  float w = 0.0;',
        '  for (int i = 0; i < 24; i++){',
        '    float fi = float(i);',
        '    vec2 uv = vUv - dir * fi;',
        '    float wi = 1.0 - fi / 24.0;',
        '    sum += texture2D(tDiffuse, uv).rgb * wi;',
        '    w += wi;',
        '  }',
        '  sum /= max(w, 0.001);',
        '  gl_FragColor = vec4(sum * uIntensity, 1.0);',
        '}'
      ].join('\n'),
      depthTest: false, depthWrite: false
    });

    // Final composite — bloom + god rays + chromatic + film grade + grain + vignette
    var compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tBloom: { value: null },
        tRays:  { value: null },
        uBloom:  { value: 0.7 },
        uRays:   { value: 0.55 },
        uChroma: { value: 0.0018 },
        uVignette: { value: 0.42 },
        uGrain:  { value: 0.028 },
        uTime:   { value: 0 },
        uWarmth: { value: 0.35 }
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
        '  vec3 bloom = texture2D(tBloom, vUv).rgb;',
        '  vec3 rays  = texture2D(tRays,  vUv).rgb;',
        '  col += bloom * uBloom;',
        '  col += rays  * uRays;',
        // warm-cool split tone (film grade)
        '  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));',
        '  vec3 warm = vec3(1.06, 1.0, 0.94);',
        '  vec3 cool = vec3(0.94, 0.98, 1.05);',
        '  vec3 grade = mix(cool, warm, smoothstep(0.2, 0.8, lum));',
        '  col = mix(col, col * grade, uWarmth);',
        // vignette
        '  float d = distance(vUv, vec2(0.5));',
        '  float v = smoothstep(0.85, 0.30, d);',
        '  col *= mix(1.0, v, uVignette);',
        // grain
        '  float n = hash(vUv * 1200.0 + vec2(uTime * 91.7, uTime * 47.3));',
        '  col += (n - 0.5) * uGrain;',
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
      rtScene: rtScene, rtBright: rtBright, rtBlurA: rtBlurA, rtBlurB: rtBlurB,
      rtRays: rtRays, rtRays2: rtRays2,
      quad: quad, quadScene: quadScene, quadCam: quadCam,
      brightMat: brightMat, blurMat: blurMat, raysMat: raysMat, compositeMat: compositeMat,
      quartW: quartW, quartH: quartH,
      resize: function () {
        var w = Math.floor(window.innerWidth * Q.effectivePixelRatio);
        var h = Math.floor(window.innerHeight * Q.effectivePixelRatio);
        rtScene.setSize(w, h);
        var qw = Math.max(64, Math.floor(w / 4));
        var qh = Math.max(64, Math.floor(h / 4));
        rtBright.setSize(qw, qh);
        rtBlurA.setSize(qw, qh);
        rtBlurB.setSize(qw, qh);
        rtRays.setSize(qw, qh);
        rtRays2.setSize(qw, qh);
        post.quartW = qw; post.quartH = qh;
      }
    };
  })();

  /* ============================================================
     UPDATE
     ============================================================ */
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
    sunLight.target.position.copy(camera.position);
    sunLight.target.updateMatrixWorld();

    hemi.color.copy(env.hemiS);
    hemi.groundColor.copy(env.hemiG);
    hemi.intensity = env.hemiI;
    ambient.intensity = env.ambI;
    renderer.toneMappingExposure = env.exp;

    waterUniforms.uSunDir.value.copy(_sunDir);
    waterUniforms.uSunColor.value.copy(env.sunC);
    waterUniforms.uTime.value = elapsed;

    // Render path
    if (post) {
      // 1. Scene → rtScene
      renderer.setRenderTarget(post.rtScene);
      renderer.clear();
      renderer.render(scene, camera);

      // 2. Bright pass
      post.quad.material = post.brightMat;
      post.brightMat.uniforms.tDiffuse.value = post.rtScene.texture;
      renderer.setRenderTarget(post.rtBright);
      renderer.clear();
      renderer.render(post.quadScene, post.quadCam);

      // 3. Blur H
      post.quad.material = post.blurMat;
      post.blurMat.uniforms.tDiffuse.value = post.rtBright.texture;
      post.blurMat.uniforms.direction.value.set(1 / post.quartW, 0);
      renderer.setRenderTarget(post.rtBlurA);
      renderer.clear();
      renderer.render(post.quadScene, post.quadCam);

      // 4. Blur V
      post.blurMat.uniforms.tDiffuse.value = post.rtBlurA.texture;
      post.blurMat.uniforms.direction.value.set(0, 1 / post.quartH);
      renderer.setRenderTarget(post.rtBlurB);
      renderer.clear();
      renderer.render(post.quadScene, post.quadCam);

      // 5. God rays from bright pass
      _sunScreen.copy(camera.position).addScaledVector(_sunDir, 2000);
      _sunScreen.project(camera);
      var sx = (_sunScreen.x + 1) * 0.5;
      var sy = (_sunScreen.y + 1) * 0.5;
      post.quad.material = post.raysMat;
      post.raysMat.uniforms.tDiffuse.value = post.rtBright.texture;
      post.raysMat.uniforms.uSunPos.value.set(sx, sy);
      renderer.setRenderTarget(post.rtRays);
      renderer.clear();
      renderer.render(post.quadScene, post.quadCam);

      // 6. Final composite
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
    sky: sky, water: water, sunLight: sunLight, hemi: hemi, ambient: ambient,
    update: update, resize: resize, sampleEnv: sampleEnv
  };

  S.log('environment', true, post ? 'film grade · god rays · clouds · sunday morning' : 'basic');

})();
