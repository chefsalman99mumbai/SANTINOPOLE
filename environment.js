/* ============================================================
   SANTINOPOLE — environment.js
   ------------------------------------------------------------
   Sunny Mediterranean palette. No night. All 8 acts are daylight.
   High-key. Warm. Clear.
   ============================================================ */

(function () {
  'use strict';

  var S = window.SANTINOPOLE;
  var THREE = window.THREE;

  if (!S || !S.buildings || !S.performance || !S.city || !THREE) {
    console.error('[environment.js] three.js, performance.js, buildings.js and city.js must load first.');
    return;
  }
  var Q = S.performance.Q;

  /* ---------- RENDERER ---------- */
  var canvas = document.getElementById('scene');
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: Q.antialias,
      powerPreference: Q.isMobile ? 'low-power' : 'high-performance',
      stencil: false,
      alpha: false,
      depth: true,
      precision: Q.isMobile ? 'mediump' : 'highp'
    });
  } catch (e) {
    S.fatal('WebGL renderer creation failed.');
    return;
  }
  renderer.setPixelRatio(Q.effectivePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = Q.shadowMap > 0;
  if (Q.shadowMap > 0) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;

  /* ---------- SCENE / CAMERA / FOG ---------- */
  var scene = new THREE.Scene();
  // Very light, warm haze — a clear day
  scene.fog = new THREE.FogExp2(0xdde6ea, 0.00075);

  var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.6, 4000);
  camera.position.set(0, 380, 900);
  camera.lookAt(0, 40, 0);

  /* ---------- SKY (bright summer day) ---------- */
  var skyUniforms = {
    uTop: { value: new THREE.Color('#3f86c9') },
    uHor: { value: new THREE.Color('#f2ecd8') },
    uBot: { value: new THREE.Color('#c8bc9c') }
  };
  var skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: [
      'varying vec3 vDir;',
      'void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uTop,uHor,uBot;',
      'varying vec3 vDir;',
      'void main(){',
      '  vec3 d=normalize(vDir); float h=d.y;',
      '  vec3 col=mix(uHor,uTop,smoothstep(-0.02,0.65,h));',
      '  col=mix(col,uBot,smoothstep(0.02,-0.30,h));',
      '  gl_FragColor=vec4(col,1.0);',
      '}'
    ].join('\n')
  });
  var skyRadius = Math.max(1600, Q.skyRadius);
  var sky = new THREE.Mesh(new THREE.SphereGeometry(skyRadius, Q.skySegW, Q.skySegH), skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  scene.add(sky);

  /* ---------- GROUND (warm stone earth) ---------- */
  var groundGeo = new THREE.PlaneGeometry(3600, 2600, 1, 1);
  groundGeo.rotateX(-Math.PI / 2);
  var groundMat = new THREE.MeshStandardMaterial({ color: 0xa89e88, roughness: 0.95, metalness: 0.02 });
  var ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(0, 0.05, 140);
  scene.add(ground);

  /* ---------- WATER (blue-green bay) ---------- */
  var waterUniforms = {
    uDeep:     { value: new THREE.Color('#1d4a5c') },
    uShallow:  { value: new THREE.Color('#5fa5b8') },
    uSunDir:   { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color('#fff4d8') },
    uTime:     { value: 0 }
  };
  var waterMat = new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    vertexShader: [
      'varying vec3 vWorldPos;',
      'void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vWorldPos=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uDeep,uShallow,uSunDir,uSunColor;',
      'uniform float uTime;',
      'varying vec3 vWorldPos;',
      'void main(){',
      '  vec3 vd=normalize(cameraPosition-vWorldPos);',
      '  float fres=pow(1.0-max(0.0,dot(vd,vec3(0.0,1.0,0.0))),2.5);',
      '  float r1=sin(vWorldPos.x*0.11+uTime*0.55)*0.5+0.5;',
      '  float r2=sin(vWorldPos.z*0.14-uTime*0.42)*0.5+0.5;',
      '  float r3=sin((vWorldPos.x+vWorldPos.z)*0.07+uTime*0.7)*0.5+0.5;',
      '  float rip=(r1*r2*0.6+r3*0.4);',
      '  vec3 col=mix(uDeep,uShallow,fres*0.85+rip*0.12);',
      '  float spec=pow(max(0.0,dot(vd,normalize(uSunDir))),64.0);',
      '  col+=uSunColor*spec*1.15;',
      '  gl_FragColor=vec4(col,1.0);',
      '}'
    ].join('\n')
  });
  var waterGeo = new THREE.PlaneGeometry(4400, 2200, 1, 1);
  waterGeo.rotateX(-Math.PI / 2);
  var water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(0, -0.15, -1500);
  scene.add(water);

  /* ---------- LIGHTS ---------- */
  var sunLight = new THREE.DirectionalLight(0xfff8ec, 3.4);
  sunLight.position.set(300, 500, 400);
  sunLight.target.position.set(0, 0, 0);
  if (Q.shadowMap > 0) {
    sunLight.castShadow = true;
    var smSize = Q.shadowMap;
    sunLight.shadow.mapSize.set(smSize, smSize);
    sunLight.shadow.camera.left = -520;
    sunLight.shadow.camera.right = 520;
    sunLight.shadow.camera.top = 520;
    sunLight.shadow.camera.bottom = -520;
    sunLight.shadow.camera.near = 100;
    sunLight.shadow.camera.far = 1800;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.35;
  }
  scene.add(sunLight);
  scene.add(sunLight.target);

  var hemi = new THREE.HemisphereLight(0xd6e8f4, 0xc8bca0, 1.15);
  scene.add(hemi);

  var ambient = new THREE.AmbientLight(0xc0c8cc, 0.55);
  scene.add(ambient);

  /* No stars — clear daylight */

  /* ---------- ADD BUILT WORLD ---------- */
  scene.add(S.buildings.group);

  /* ---------- DISTRICT BEACONS ---------- */
  var DISTRICT_COLORS = {
    financial:     new THREE.Color('#e8b44a'),
    creative:      new THREE.Color('#5ad0d8'),
    data:          new THREE.Color('#5ad8b0'),
    commercial:    new THREE.Color('#ffb860'),
    harbor:        new THREE.Color('#6a9ad8'),
    civic:         new THREE.Color('#f0e0c0'),
    residential:   new THREE.Color('#e8c0cc'),
    cultural:      new THREE.Color('#b890e0'),
    entertainment: new THREE.Color('#e870a0'),
    park:          new THREE.Color('#7ab868')
  };
  function colorForDistrict(d) {
    return DISTRICT_COLORS[d.character] || DISTRICT_COLORS.financial;
  }

  var districtGroup = new THREE.Group();
  districtGroup.name = 'district-identity';
  scene.add(districtGroup);
  var districtBeacons = [];

  function buildDistrictLayer() {
    var districts = S.city.districts;
    for (var i = 0; i < districts.length; i++) {
      var d = districts[i];
      var col = colorForDistrict(d);
      var cx = d.center[0], cz = d.center[1], R = d.radius;

      var beaconH = Math.min(240, R * 1.6);
      var beaconR = Math.max(3, R * 0.02);

      var beaconGeo = new THREE.CylinderGeometry(beaconR * 0.4, beaconR, beaconH, 10, 1, true);
      var beaconMat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0.30,
        blending: THREE.AdditiveBlending, depthWrite: false,
        side: THREE.DoubleSide, fog: false
      });
      var beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(cx, beaconH / 2, cz);
      beacon.renderOrder = 5;
      districtGroup.add(beacon);

      var coreGeo = new THREE.CylinderGeometry(beaconR * 0.25, beaconR * 0.35, beaconH, 8);
      var coreMat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      });
      var core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(cx, beaconH / 2, cz);
      core.renderOrder = 6;
      districtGroup.add(core);

      var ringGeo = new THREE.RingGeometry(R * 0.94, R * 0.98, 96);
      ringGeo.rotateX(-Math.PI / 2);
      var ringMat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0.30,
        blending: THREE.AdditiveBlending, depthWrite: false,
        side: THREE.DoubleSide, fog: false
      });
      var ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(cx, 0.55, cz);
      ring.renderOrder = 4;
      districtGroup.add(ring);

      var light = new THREE.PointLight(col, 0, R * 2.0, 2);
      light.position.set(cx, 40, cz);
      districtGroup.add(light);

      districtBeacons.push({
        district: d, color: col, beacon: beacon, core: core, ring: ring,
        light: light, baseRingOpacity: 0.30, pulsePhase: i * 0.83, worldRadius: R
      });
    }
  }
  buildDistrictLayer();

  var _camXZ = new THREE.Vector2();
  var _distXZ = new THREE.Vector2();

  function updateDistrictLayer(elapsed) {
    _camXZ.set(camera.position.x, camera.position.z);
    for (var i = 0; i < districtBeacons.length; i++) {
      var b = districtBeacons[i];
      _distXZ.set(b.district.center[0], b.district.center[1]);
      var distToCenter = _camXZ.distanceTo(_distXZ);
      var within = 1 - Math.min(1, distToCenter / (b.worldRadius * 1.6));
      var pulse = 0.82 + Math.sin(elapsed * 0.9 + b.pulsePhase) * 0.12;

      b.beacon.material.opacity = Math.min(0.55, (0.18 + within * 0.32) * pulse);
      b.core.material.opacity   = Math.min(0.85, (0.35 + within * 0.42) * pulse);
      b.ring.material.opacity   = b.baseRingOpacity * (0.35 + within * 1.0);
      b.light.intensity         = within * within * 28;
    }
  }

  /* ---------- ENVIRONMENT TIMELINE — all daylight ---------- */
  var ENV_KEYS = [
    // ACT I — early morning (sun low, long soft light)
    { p: 0.000, top:'#3f86c9', hor:'#f8f0dc', bot:'#d0c4a8',
      sunC:'#fff2d6', sunI: 2.8, az: 105, el: 22,
      hemiS:'#d8e8f4', hemiG:'#c0b498', hemiI: 1.05,
      ambI: 0.50, fogC:'#e0e8ec', fogD: 0.00085, exp: 1.10 },

    // ACT II — mid-morning
    { p: 0.125, top:'#3d84c8', hor:'#f4eed8', bot:'#c8bc9c',
      sunC:'#fff8e8', sunI: 3.2, az: 90, el: 38,
      hemiS:'#d6e8f6', hemiG:'#c8bca0', hemiI: 1.12,
      ambI: 0.52, fogC:'#dde6ea', fogD: 0.00075, exp: 1.10 },

    // ACT III — THE STREETS — morning full sun
    { p: 0.250, top:'#3d84c8', hor:'#f6f0d8', bot:'#ccc0a0',
      sunC:'#fff8ec', sunI: 3.5, az: 75, el: 52,
      hemiS:'#d8e8f6', hemiG:'#c8bca0', hemiI: 1.18,
      ambI: 0.54, fogC:'#dde6ea', fogD: 0.00070, exp: 1.10 },

    // ACT IV — FASHION DISTRICT — high noon
    { p: 0.375, top:'#3a82c6', hor:'#f8f2dc', bot:'#d0c4a4',
      sunC:'#fffaf0', sunI: 3.7, az: 55, el: 62,
      hemiS:'#daeaf8', hemiG:'#ccc0a4', hemiI: 1.22,
      ambI: 0.55, fogC:'#dee6ea', fogD: 0.00068, exp: 1.10 },

    // ACT V — SHOPPING STREETS — early afternoon
    { p: 0.500, top:'#3d86c8', hor:'#f8f2dc', bot:'#ccc0a0',
      sunC:'#fff8ec', sunI: 3.5, az: 35, el: 54,
      hemiS:'#d8e8f6', hemiG:'#c8bca0', hemiI: 1.16,
      ambI: 0.52, fogC:'#dde6ea', fogD: 0.00072, exp: 1.10 },

    // ACT VI — RESTAURANT LANE — afternoon
    { p: 0.625, top:'#3f88ca', hor:'#faeed4', bot:'#c8b898',
      sunC:'#fff4dc', sunI: 3.3, az: 15, el: 42,
      hemiS:'#d6e6f4', hemiG:'#c8b89c', hemiI: 1.12,
      ambI: 0.50, fogC:'#dce4e8', fogD: 0.00078, exp: 1.11 },

    // ACT VII — SANTINOPOLITANS — golden hour approaching
    { p: 0.750, top:'#3f86c8', hor:'#fbeac0', bot:'#c0b08c',
      sunC:'#ffeec4', sunI: 3.0, az: -8, el: 30,
      hemiS:'#d4e2f2', hemiG:'#c4b498', hemiI: 1.05,
      ambI: 0.48, fogC:'#dae0e4', fogD: 0.00085, exp: 1.12 },

    // ACT VIII — THE CITY REVEAL — warm golden afternoon (still day)
    { p: 0.875, top:'#4188c6', hor:'#fce4b0', bot:'#b8a884',
      sunC:'#ffe6ae', sunI: 2.8, az: -25, el: 20,
      hemiS:'#d0dcec', hemiG:'#c0b090', hemiI: 1.00,
      ambI: 0.46, fogC:'#d8dcdc', fogD: 0.00092, exp: 1.13 },

    { p: 1.000, top:'#4288c4', hor:'#fbe0a8', bot:'#b8a480',
      sunC:'#ffe2a8', sunI: 2.7, az: -35, el: 14,
      hemiS:'#ccd8e8', hemiG:'#bcac8c', hemiI: 0.98,
      ambI: 0.45, fogC:'#d6d8d8', fogD: 0.00095, exp: 1.14 }
  ];

  for (var ek = 0; ek < ENV_KEYS.length; ek++) {
    var k = ENV_KEYS[ek];
    k._top = new THREE.Color(k.top);
    k._hor = new THREE.Color(k.hor);
    k._bot = new THREE.Color(k.bot);
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
    var a = ENV_KEYS[i];
    var b = ENV_KEYS[i + 1];
    var span = b.p - a.p;
    var t = span > 0 ? Math.max(0, Math.min(1, (p - a.p) / span)) : 0;

    return {
      top:   _c.copy(a._top).lerp(b._top, t).clone(),
      hor:   _c.copy(a._hor).lerp(b._hor, t).clone(),
      bot:   _c.copy(a._bot).lerp(b._bot, t).clone(),
      sunC:  _c.copy(a._sunC).lerp(b._sunC, t).clone(),
      sunI:  a.sunI + (b.sunI - a.sunI) * t,
      az:    a.az + (b.az - a.az) * t,
      el:    a.el + (b.el - a.el) * t,
      hemiS: _c.copy(a._hemiS).lerp(b._hemiS, t).clone(),
      hemiG: _c.copy(a._hemiG).lerp(b._hemiG, t).clone(),
      hemiI: a.hemiI + (b.hemiI - a.hemiI) * t,
      ambI:  a.ambI + (b.ambI - a.ambI) * t,
      fogC:  _c.copy(a._fogC).lerp(b._fogC, t).clone(),
      fogD:  a.fogD + (b.fogD - a.fogD) * t,
      exp:   a.exp + (b.exp - a.exp) * t
    };
  }

  /* ---------- POST — subtle, high-key ---------- */
  var postEnabled = Q.bloom || Q.chromatic;

  var post = null;
  if (postEnabled) {
    var rtW = Math.floor(window.innerWidth * Q.effectivePixelRatio * 0.5);
    var rtH = Math.floor(window.innerHeight * Q.effectivePixelRatio * 0.5);
    var bloomW = Math.max(64, Math.floor(rtW * 0.5));
    var bloomH = Math.max(64, Math.floor(rtH * 0.5));

    var sceneRT = new THREE.WebGLRenderTarget(rtW * 2, rtH * 2, {
      type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: true, stencilBuffer: false
    });
    var brightRT = new THREE.WebGLRenderTarget(bloomW, bloomH, {
      type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false
    });
    var blurRT_A = new THREE.WebGLRenderTarget(bloomW, bloomH, {
      type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false
    });
    var blurRT_B = new THREE.WebGLRenderTarget(bloomW, bloomH, {
      type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false
    });

    var fsQuadGeo = new THREE.PlaneGeometry(2, 2);
    var fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    var brightMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, threshold: { value: 0.85 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform float threshold; varying vec2 vUv;',
        'void main(){',
        '  vec3 c=texture2D(tDiffuse,vUv).rgb;',
        '  float l=dot(c,vec3(0.2126,0.7152,0.0722));',
        '  float f=max(0.0,l-threshold)/max(0.0001,1.0-threshold);',
        '  gl_FragColor=vec4(c*f,1.0);',
        '}'
      ].join('\n'),
      depthTest: false, depthWrite: false
    });

    var blurMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, direction: { value: new THREE.Vector2() } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform vec2 direction; varying vec2 vUv;',
        'void main(){',
        '  vec4 s=texture2D(tDiffuse,vUv)*0.227;',
        '  s+=texture2D(tDiffuse,vUv+direction*1.3846)*0.3162;',
        '  s+=texture2D(tDiffuse,vUv-direction*1.3846)*0.3162;',
        '  s+=texture2D(tDiffuse,vUv+direction*3.2307)*0.0702;',
        '  s+=texture2D(tDiffuse,vUv-direction*3.2307)*0.0702;',
        '  gl_FragColor=s;',
        '}'
      ].join('\n'),
      depthTest: false, depthWrite: false
    });

    var compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene:       { value: null },
        tBloom:       { value: null },
        bloomStrength:{ value: Q.bloom ? 0.32 : 0.0 },
        chroma:       { value: Q.chromatic ? 0.0018 : 0.0 },
        vignette:     { value: 0.12 },
        grainAmount:  { value: 0.010 },
        time:         { value: 0 }
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      fragmentShader: [
        'uniform sampler2D tScene, tBloom;',
        'uniform float bloomStrength, chroma, vignette, grainAmount, time;',
        'varying vec2 vUv;',
        'float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }',
        'void main(){',
        '  vec2 dir=(vUv-0.5)*chroma;',
        '  vec3 col;',
        '  col.r=texture2D(tScene,vUv+dir).r;',
        '  col.g=texture2D(tScene,vUv).g;',
        '  col.b=texture2D(tScene,vUv-dir).b;',
        '  vec3 bloom=texture2D(tBloom,vUv).rgb;',
        '  col+=bloom*bloomStrength;',
        '  float d=distance(vUv,vec2(0.5));',
        '  float v=smoothstep(1.0,0.45,d);',
        '  col*=mix(1.0,v,vignette);',
        '  float n=hash(vUv*800.0+vec2(time*91.7,time*47.3));',
        '  col+=(n-0.5)*grainAmount;',
        '  gl_FragColor=vec4(col,1.0);',
        '}'
      ].join('\n'),
      depthTest: false, depthWrite: false
    });

    var fsQuad = new THREE.Mesh(fsQuadGeo, brightMat);
    fsQuad.frustumCulled = false;
    var fsScene = new THREE.Scene();
    fsScene.add(fsQuad);

    post = {
      sceneRT: sceneRT, brightRT: brightRT, blurRT_A: blurRT_A, blurRT_B: blurRT_B,
      fsQuad: fsQuad, fsScene: fsScene, fsCam: fsCam,
      brightMat: brightMat, blurMat: blurMat, compositeMat: compositeMat,
      bloomW: bloomW, bloomH: bloomH,
      resize: function (w, h, dpr) {
        var w2 = Math.max(64, Math.floor(w * dpr * 0.5));
        var h2 = Math.max(64, Math.floor(h * dpr * 0.5));
        sceneRT.setSize(w2 * 2, h2 * 2);
        var bw = Math.max(64, Math.floor(w2 * 0.5));
        var bh = Math.max(64, Math.floor(h2 * 0.5));
        brightRT.setSize(bw, bh); blurRT_A.setSize(bw, bh); blurRT_B.setSize(bw, bh);
        post.bloomW = bw; post.bloomH = bh;
      }
    };
  }

  /* ---------- UPDATE ---------- */
  var vpW = window.innerWidth;
  var vpH = window.innerHeight;

  function update(progress, dt, elapsed) {
    var env = sampleEnv(progress);

    skyUniforms.uTop.value.copy(env.top);
    skyUniforms.uHor.value.copy(env.hor);
    skyUniforms.uBot.value.copy(env.bot);
    sky.position.copy(camera.position);

    scene.fog.color.copy(env.fogC);
    scene.fog.density = env.fogD;

    var azRad = env.az * Math.PI / 180;
    var elRad = env.el * Math.PI / 180;
    _sunDir.set(
      Math.cos(elRad) * Math.sin(azRad),
      Math.sin(elRad),
      Math.cos(elRad) * Math.cos(azRad)
    ).normalize();

    sunLight.color.copy(env.sunC);
    sunLight.intensity = env.sunI;
    sunLight.position.copy(camera.position).addScaledVector(_sunDir, 1100);
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

    updateDistrictLayer(elapsed);

    // Windows stay off — daytime
    if (S.buildings.setNight) S.buildings.setNight(0);

    if (post) {
      compositeMat.uniforms.time.value = elapsed;

      renderer.setRenderTarget(post.sceneRT);
      renderer.clear();
      renderer.render(scene, camera);

      post.fsQuad.material = post.brightMat;
      post.brightMat.uniforms.tDiffuse.value = post.sceneRT.texture;
      renderer.setRenderTarget(post.brightRT);
      renderer.clear();
      renderer.render(post.fsScene, post.fsCam);

      post.fsQuad.material = post.blurMat;
      post.blurMat.uniforms.tDiffuse.value = post.brightRT.texture;
      post.blurMat.uniforms.direction.value.set(1 / post.bloomW, 0);
      renderer.setRenderTarget(post.blurRT_A);
      renderer.clear();
      renderer.render(post.fsScene, post.fsCam);

      post.blurMat.uniforms.tDiffuse.value = post.blurRT_A.texture;
      post.blurMat.uniforms.direction.value.set(0, 1 / post.bloomH);
      renderer.setRenderTarget(post.blurRT_B);
      renderer.clear();
      renderer.render(post.fsScene, post.fsCam);

      post.fsQuad.material = post.compositeMat;
      post.compositeMat.uniforms.tScene.value = post.sceneRT.texture;
      post.compositeMat.uniforms.tBloom.value = post.blurRT_B.texture;
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(post.fsScene, post.fsCam);
    } else {
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(scene, camera);
    }
  }

  function resize() {
    vpW = window.innerWidth;
    vpH = window.innerHeight;
    var dpr = Q.effectivePixelRatio;
    renderer.setPixelRatio(dpr);
    renderer.setSize(vpW, vpH);
    camera.aspect = vpW / vpH;
    camera.updateProjectionMatrix();
    if (post) post.resize(vpW, vpH, dpr);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 220); });

  S.performance.onTierChange(function (change, key) {
    if (key === 'effectivePixelRatio') resize();
  });

  S.environment = {
    scene: scene, camera: camera, renderer: renderer,
    sky: sky, water: water, sunLight: sunLight, hemi: hemi, ambient: ambient,
    districtGroup: districtGroup, districtBeacons: districtBeacons,
    update: update, resize: resize, sampleEnv: sampleEnv
  };

  S.log('environment', true,
    (postEnabled ? 'post ON' : 'post OFF') +
    ' · sunny day · sky · water · ' +
    (Q.shadowMap > 0 ? 'shadows ' + Q.shadowMap : 'no shadows') +
    ' · ' + districtBeacons.length + ' beacons');

})();
