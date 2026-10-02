/* ============================================================
   SANTINOPOLE — environment.js
   ------------------------------------------------------------
   Renderer, scene, camera, sky, water, lights, stars,
   eight-act color grade, post-processing pipeline,
   AND district identity layer (beacons + rings + ambient tint).

   Depends on: three.js, performance.js, buildings.js, city.js
   Exposes:    window.SANTINOPOLE.environment
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

  /* ============================================================
     RENDERER
     ============================================================ */
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
    S.fatal('WebGL renderer creation failed.<br>' + (e && e.message ? e.message : ''));
    return;
  }
  renderer.setPixelRatio(Q.effectivePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = Q.shadowMap > 0;
  if (Q.shadowMap > 0) renderer.shadowMap.type = Q.shadowType === 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.autoClear = false;

  /* ============================================================
     SCENE + CAMERA + FOG
     ============================================================ */
  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x8a9cb4, 0.0012);

  var camera = new THREE.PerspectiveCamera(
    60, window.innerWidth / window.innerHeight, 0.6, 3200
  );
  camera.position.set(0, 380, 900);
  camera.lookAt(0, 40, 0);

  /* ============================================================
     SKY
     ============================================================ */
  var skyUniforms = {
    uTop: { value: new THREE.Color('#3a72c8') },
    uHor: { value: new THREE.Color('#bcd8f0') },
    uBot: { value: new THREE.Color('#4a4a48') }
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
      '  vec3 col=mix(uHor,uTop,smoothstep(0.0,0.55,h));',
      '  col=mix(col,uBot,smoothstep(0.02,-0.35,h));',
      '  gl_FragColor=vec4(col,1.0);',
      '}'
    ].join('\n')
  });
  var skyRadius = Math.max(1600, Q.skyRadius);
  var sky = new THREE.Mesh(new THREE.SphereGeometry(skyRadius, Q.skySegW, Q.skySegH), skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  scene.add(sky);

  /* ============================================================
     GROUND
     ============================================================ */
  var groundGeo = new THREE.PlaneGeometry(2400, 1720, 1, 1);
  groundGeo.rotateX(-Math.PI / 2);
  var groundMat = new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 0.95, metalness: 0.02 });
  var ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(0, 0.05, 140);
  scene.add(ground);

  /* ============================================================
     WATER
     ============================================================ */
  var waterUniforms = {
    uDeep:     { value: new THREE.Color('#050a12') },
    uShallow:  { value: new THREE.Color('#1a3a5a') },
    uSunDir:   { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color('#ffe2b0') },
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
      '  float fres=pow(1.0-max(0.0,dot(vd,vec3(0.0,1.0,0.0))),3.0);',
      '  float r1=sin(vWorldPos.x*0.11+uTime*0.55)*0.5+0.5;',
      '  float r2=sin(vWorldPos.z*0.14-uTime*0.42)*0.5+0.5;',
      '  float r3=sin((vWorldPos.x+vWorldPos.z)*0.07+uTime*0.7)*0.5+0.5;',
      '  float rip=(r1*r2*0.6+r3*0.4);',
      '  vec3 col=mix(uDeep,uShallow,fres*0.72+rip*0.14);',
      '  float spec=pow(max(0.0,dot(vd,normalize(uSunDir))),42.0);',
      '  col+=uSunColor*spec*0.85;',
      '  gl_FragColor=vec4(col,1.0);',
      '}'
    ].join('\n')
  });
  var waterGeo = new THREE.PlaneGeometry(3600, 1600, 1, 1);
  waterGeo.rotateX(-Math.PI / 2);
  var water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(0, -0.15, -1400);
  scene.add(water);

  /* ============================================================
     LIGHTS
     ============================================================ */
  var sunLight = new THREE.DirectionalLight(0xfff2dd, 2.6);
  sunLight.position.set(200, 400, 300);
  sunLight.target.position.set(0, 0, 0);
  if (Q.shadowMap > 0) {
    sunLight.castShadow = true;
    var smSize = Q.shadowMap;
    sunLight.shadow.mapSize.set(smSize, smSize);
    sunLight.shadow.camera.left = -420;
    sunLight.shadow.camera.right = 420;
    sunLight.shadow.camera.top = 420;
    sunLight.shadow.camera.bottom = -420;
    sunLight.shadow.camera.near = 100;
    sunLight.shadow.camera.far = 1400;
    sunLight.shadow.bias = -0.0006;
    sunLight.shadow.normalBias = 0.4;
  }
  scene.add(sunLight);
  scene.add(sunLight.target);

  var hemi = new THREE.HemisphereLight(0xcfe4ff, 0x7a7260, 1.0);
  scene.add(hemi);

  var ambient = new THREE.AmbientLight(0x405060, 0.35);
  scene.add(ambient);

  /* ============================================================
     STARS
     ============================================================ */
  var starCount = Q.tier >= 2 ? 900 : (Q.tier >= 1 ? 400 : 0);
  var stars = null, starMat = null;
  if (starCount > 0) {
    var sg = new THREE.BufferGeometry();
    var pos = new Float32Array(starCount * 3);
    for (var i = 0; i < starCount; i++) {
      var u = Math.random() * 2 - 1;
      var theta = Math.random() * Math.PI * 2;
      var r = Math.sqrt(1 - u * u);
      pos[i*3]     = Math.cos(theta) * r * skyRadius * 0.92;
      pos[i*3 + 1] = Math.abs(u) * skyRadius * 0.92 + 60;
      pos[i*3 + 2] = Math.sin(theta) * r * skyRadius * 0.92;
    }
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starMat = new THREE.PointsMaterial({
      color: 0xf0e8d8, size: 1.6, sizeAttenuation: false,
      transparent: true, opacity: 0, depthWrite: false, fog: false
    });
    stars = new THREE.Points(sg, starMat);
    stars.frustumCulled = false;
    stars.renderOrder = -900;
    scene.add(stars);
  }

  /* ============================================================
     ADD THE BUILT WORLD
     ============================================================ */
  scene.add(S.buildings.group);

  /* ============================================================
     DISTRICT IDENTITY LAYER
     11 beacons + 11 ground rings + 11 proximity lights.
     ============================================================ */

  var DISTRICT_COLORS = {
    financial:     new THREE.Color('#d4a24a'),
    creative:      new THREE.Color('#5ac8d4'),
    data:          new THREE.Color('#4ad4a2'),
    commercial:    new THREE.Color('#ffa858'),
    harbor:        new THREE.Color('#5a8ac8'),
    civic:         new THREE.Color('#e8d8b8'),
    residential:   new THREE.Color('#d4a8b8'),
    cultural:      new THREE.Color('#a878d4'),
    entertainment: new THREE.Color('#d45a8a'),
    park:          new THREE.Color('#6aa85a')
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
      var cx = d.center[0];
      var cz = d.center[1];
      var R  = d.radius;

      var beaconH = Math.min(240, R * 1.6);
      var beaconR = Math.max(3, R * 0.02);
      var beaconGeo = new THREE.CylinderGeometry(beaconR * 0.4, beaconR, beaconH, 10, 1, true);
      var beaconMat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false,
        side: THREE.DoubleSide, fog: false
      });
      var beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(cx, beaconH / 2, cz);
      beacon.renderOrder = 5;
      districtGroup.add(beacon);

      var coreGeo = new THREE.CylinderGeometry(beaconR * 0.25, beaconR * 0.35, beaconH, 8);
      var coreMat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      });
      var core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(cx, beaconH / 2, cz);
      core.renderOrder = 6;
      districtGroup.add(core);

      var ringGeo = new THREE.RingGeometry(R * 0.94, R * 0.98, 96);
      ringGeo.rotateX(-Math.PI / 2);
      var ringMat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0.42,
        blending: THREE.AdditiveBlending, depthWrite: false,
        side: THREE.DoubleSide, fog: false
      });
      var ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(cx, 0.55, cz);
      ring.renderOrder = 4;
      districtGroup.add(ring);

      var light = new THREE.PointLight(col, 0, R * 2.4, 2);
      light.position.set(cx, 40, cz);
      districtGroup.add(light);

      districtBeacons.push({
        district: d,
        color: col,
        beacon: beacon,
        core: core,
        ring: ring,
        light: light,
        baseRingOpacity: 0.42,
        pulsePhase: i * 0.83,
        worldRadius: R
      });
    }
  }
  buildDistrictLayer();

  var _camXZ = new THREE.Vector2();
  var _distXZ = new THREE.Vector2();

  function updateDistrictLayer(elapsed, night) {
    _camXZ.set(camera.position.x, camera.position.z);

    for (var i = 0; i < districtBeacons.length; i++) {
      var b = districtBeacons[i];
      _distXZ.set(b.district.center[0], b.district.center[1]);
      var distToCenter = _camXZ.distanceTo(_distXZ);
      var within = 1 - Math.min(1, distToCenter / (b.worldRadius * 1.6));

      var pulse = 0.72 + Math.sin(elapsed * 0.9 + b.pulsePhase) * 0.14;

      var beaconOpacity = (0.30 + within * 0.55) * pulse;
      var coreOpacity   = (0.62 + within * 0.35) * pulse;

      var nightBoost = 1 + night * 0.7;
      beaconOpacity = Math.min(1, beaconOpacity * nightBoost);
      coreOpacity   = Math.min(1, coreOpacity   * nightBoost);

      b.beacon.material.opacity = beaconOpacity;
      b.core.material.opacity   = coreOpacity;

      b.ring.material.opacity = b.baseRingOpacity * (0.25 + within * 1.1);

      b.light.intensity = within * within * 55 * (1 + night * 0.8);
    }
  }

  /* ============================================================
     ENVIRONMENT TIMELINE — 8 acts
     ============================================================ */
  var ENV_KEYS = [
    { p: 0.000, top:'#2a4a80', hor:'#f0b088', bot:'#3a3230',
      sunC:'#ffd0a0', sunI: 2.2, az: 110, el: 12,
      hemiS:'#b0c8e0', hemiG:'#5a5048', hemiI: 0.85,
      ambI: 0.28, fogC:'#c8a890', fogD: 0.0016, exp: 1.05, night: 0.10 },

    { p: 0.125, top:'#3a72c8', hor:'#c8dce8', bot:'#585048',
      sunC:'#fff0d0', sunI: 2.8, az: 90, el: 32,
      hemiS:'#cfe4ff', hemiG:'#7a7260', hemiI: 1.00,
      ambI: 0.32, fogC:'#b8c8d8', fogD: 0.0013, exp: 1.02, night: 0.00 },

    { p: 0.250, top:'#2c66c0', hor:'#d8e4ec', bot:'#5a5652',
      sunC:'#fff8e8', sunI: 3.2, az: 60, el: 58,
      hemiS:'#d8e8ff', hemiG:'#8a8270', hemiI: 1.05,
      ambI: 0.34, fogC:'#c0d0dc', fogD: 0.0011, exp: 1.00, night: 0.00 },

    { p: 0.375, top:'#3a6ab8', hor:'#f0cc98', bot:'#5a4a40',
      sunC:'#ffdca8', sunI: 2.9, az: 30, el: 28,
      hemiS:'#d0d0e0', hemiG:'#8a7060', hemiI: 0.95,
      ambI: 0.32, fogC:'#d0b8a0', fogD: 0.0012, exp: 1.04, night: 0.00 },

    { p: 0.500, top:'#2a4878', hor:'#ffb070', bot:'#4a3a3a',
      sunC:'#ff9448', sunI: 2.2, az: 5, el: 6,
      hemiS:'#b098c0', hemiG:'#6a4a34', hemiI: 0.78,
      ambI: 0.30, fogC:'#c08458', fogD: 0.0016, exp: 1.12, night: 0.18 },

    { p: 0.625, top:'#1a2c58', hor:'#ff7048', bot:'#282038',
      sunC:'#ff6028', sunI: 1.5, az: -18, el: 1,
      hemiS:'#7a78c0', hemiG:'#46384a', hemiI: 0.58,
      ambI: 0.28, fogC:'#88584a', fogD: 0.0018, exp: 1.18, night: 0.45 },

    { p: 0.750, top:'#0a1630', hor:'#5a2c48', bot:'#0e0a18',
      sunC:'#3a2850', sunI: 0.85, az: -42, el: -8,
      hemiS:'#4a4a80', hemiG:'#18181e', hemiI: 0.44,
      ambI: 0.26, fogC:'#2a1c30', fogD: 0.0016, exp: 1.26, night: 0.78 },

    { p: 0.875, top:'#04081c', hor:'#1a2444', bot:'#06080f',
      sunC:'#243460', sunI: 0.5, az: -60, el: -22,
      hemiS:'#283a68', hemiG:'#0a0a12', hemiI: 0.32,
      ambI: 0.24, fogC:'#0c1424', fogD: 0.0014, exp: 1.32, night: 1.00 },

    { p: 1.000, top:'#02050e', hor:'#0a1220', bot:'#03050a',
      sunC:'#1e2a50', sunI: 0.4, az: -75, el: -30,
      hemiS:'#1c2650', hemiG:'#0a0a12', hemiI: 0.28,
      ambI: 0.22, fogC:'#060c18', fogD: 0.0013, exp: 1.34, night: 1.00 }
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
      exp:   a.exp + (b.exp - a.exp) * t,
      night: a.night + (b.night - a.night) * t
    };
  }

  /* ============================================================
     POST-PROCESSING
     ============================================================ */
  var postEnabled = Q.bloom || Q.dof || Q.grain || Q.chromatic;

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
      uniforms: { tDiffuse: { value: null }, threshold: { value: 0.72 } },
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
        bloomStrength:{ value: Q.bloom ? 0.85 : 0.0 },
        chroma:       { value: Q.chromatic ? 0.0035 : 0.0 },
        vignette:     { value: Q.grain ? 0.55 : 0.35 },
        grainAmount:  { value: Q.grain ? 0.035 : 0.0 },
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
        '  float v=smoothstep(0.85,0.32,d);',
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
      sceneRT: sceneRT, brightRT: brightRT,
      blurRT_A: blurRT_A, blurRT_B: blurRT_B,
      fsQuad: fsQuad, fsScene: fsScene, fsCam: fsCam,
      brightMat: brightMat, blurMat: blurMat, compositeMat: compositeMat,
      bloomW: bloomW, bloomH: bloomH,
      resize: function (w, h, dpr) {
        var w2 = Math.max(64, Math.floor(w * dpr * 0.5));
        var h2 = Math.max(64, Math.floor(h * dpr * 0.5));
        sceneRT.setSize(w2 * 2, h2 * 2);
        var bw = Math.max(64, Math.floor(w2 * 0.5));
        var bh = Math.max(64, Math.floor(h2 * 0.5));
        brightRT.setSize(bw, bh);
        blurRT_A.setSize(bw, bh);
        blurRT_B.setSize(bw, bh);
        post.bloomW = bw; post.bloomH = bh;
      }
    };
  }

  /* ============================================================
     STATE + UPDATE
     ============================================================ */
  var lastNight = -1;
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
    sunLight.position.copy(camera.position).addScaledVector(_sunDir, 900);
    sunLight.target.position.copy(camera.position);
    sunLight.target.updateMatrixWorld();

    hemi.color.copy(env.hemiS);
    hemi.groundColor.copy(env.hemiG);
    hemi.intensity = env.hemiI;
    ambient.intensity = env.ambI;

    renderer.toneMappingExposure = env.exp;

    if (starMat) starMat.opacity = Math.pow(env.night, 1.6) * 0.85;

    waterUniforms.uSunDir.value.copy(_sunDir);
    waterUniforms.uSunColor.value.copy(env.sunC);
    waterUniforms.uTime.value = elapsed;

    updateDistrictLayer(elapsed, env.night);

    if (Math.abs(env.night - lastNight) > 0.01 || lastNight < 0) {
      lastNight = env.night;
      S.buildings.setNight(env.night);
    }

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

  /* ============================================================
     RESIZE
     ============================================================ */
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
    if (post && (key === 'bloom' || key === 'grain' || key === 'chromatic')) {
      post.compositeMat.uniforms.bloomStrength.value = Q.bloom ? 0.85 : 0.0;
      post.compositeMat.uniforms.grainAmount.value  = Q.grain ? 0.035 : 0.0;
      post.compositeMat.uniforms.chroma.value       = Q.chromatic ? 0.0035 : 0.0;
    }
  });

  /* ============================================================
     EXPORT
     ============================================================ */
  S.environment = {
    scene: scene,
    camera: camera,
    renderer: renderer,
    sky: sky,
    water: water,
    sunLight: sunLight,
    hemi: hemi,
    ambient: ambient,
    stars: stars,
    districtGroup: districtGroup,
    districtBeacons: districtBeacons,
    update: update,
    resize: resize,
    sampleEnv: sampleEnv
  };

  S.log(
    'environment',
    true,
    (postEnabled ? 'post ON' : 'post OFF') +
    ' · sky · water · ' +
    (Q.shadowMap > 0 ? 'shadows ' + Q.shadowMap : 'no shadows') +
    ' · ' + districtBeacons.length + ' district beacons'
  );

})();
