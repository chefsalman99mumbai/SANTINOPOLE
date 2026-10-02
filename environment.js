/* ============================================================
   SANTINOPOLE — environment.js — clean daylight, no beacons
   ============================================================ */

(function () {
  'use strict';

  var S = window.SANTINOPOLE;
  var THREE = window.THREE;

  if (!S || !S.buildings || !S.performance || !S.city || !THREE) {
    console.error('[environment.js] dependencies missing.');
    return;
  }
  var Q = S.performance.Q;

  var canvas = document.getElementById('scene');
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: Q.antialias,
      powerPreference: Q.isMobile ? 'low-power' : 'high-performance',
      stencil: false, alpha: false, depth: true,
      precision: Q.isMobile ? 'mediump' : 'highp'
    });
  } catch (e) { S.fatal('WebGL failed.'); return; }
  renderer.setPixelRatio(Q.effectivePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = Q.shadowMap > 0;
  if (Q.shadowMap > 0) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xe6e4dc, 0.0009);

  var camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.6, 5000);
  camera.position.set(0, 380, 900);
  camera.lookAt(0, 40, 0);

  var skyUniforms = {
    uTop: { value: new THREE.Color('#4a94d4') },
    uHor: { value: new THREE.Color('#f4ecda') },
    uBot: { value: new THREE.Color('#c8bca0') }
  };
  var skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
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
  var skyRadius = Math.max(2600, Q.skyRadius);
  var sky = new THREE.Mesh(new THREE.SphereGeometry(skyRadius, Q.skySegW, Q.skySegH), skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  scene.add(sky);

  var groundGeo = new THREE.PlaneGeometry(6000, 5000, 1, 1);
  groundGeo.rotateX(-Math.PI / 2);
  var groundMat = new THREE.MeshStandardMaterial({ color: 0xa89678, roughness: 0.95 });
  var ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(0, 0.05, 140);
  scene.add(ground);

  var waterUniforms = {
    uDeep: { value: new THREE.Color('#1d4a5c') },
    uShallow: { value: new THREE.Color('#5fa5b8') },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color('#fff4d8') },
    uTime: { value: 0 }
  };
  var waterMat = new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    vertexShader: 'varying vec3 vWorldPos; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vWorldPos=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }',
    fragmentShader: [
      'uniform vec3 uDeep,uShallow,uSunDir,uSunColor;',
      'uniform float uTime;',
      'varying vec3 vWorldPos;',
      'void main(){',
      '  vec3 vd=normalize(cameraPosition-vWorldPos);',
      '  float fres=pow(1.0-max(0.0,dot(vd,vec3(0.0,1.0,0.0))),2.5);',
      '  float r1=sin(vWorldPos.x*0.11+uTime*0.55)*0.5+0.5;',
      '  float r2=sin(vWorldPos.z*0.14-uTime*0.42)*0.5+0.5;',
      '  float rip=(r1*r2*0.6 + (sin((vWorldPos.x+vWorldPos.z)*0.07+uTime*0.7)*0.5+0.5)*0.4);',
      '  vec3 col=mix(uDeep,uShallow,fres*0.85+rip*0.12);',
      '  float spec=pow(max(0.0,dot(vd,normalize(uSunDir))),64.0);',
      '  col+=uSunColor*spec*1.15;',
      '  gl_FragColor=vec4(col,1.0);',
      '}'
    ].join('\n')
  });
  var waterGeo = new THREE.PlaneGeometry(5200, 2600, 1, 1);
  waterGeo.rotateX(-Math.PI / 2);
  var water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(0, -0.15, -1800);
  scene.add(water);

  var sunLight = new THREE.DirectionalLight(0xfff4dc, 3.5);
  sunLight.position.set(300, 500, 400);
  sunLight.target.position.set(0, 0, 0);
  if (Q.shadowMap > 0) {
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(Q.shadowMap, Q.shadowMap);
    sunLight.shadow.camera.left = -600;
    sunLight.shadow.camera.right = 600;
    sunLight.shadow.camera.top = 600;
    sunLight.shadow.camera.bottom = -600;
    sunLight.shadow.camera.near = 100;
    sunLight.shadow.camera.far = 2200;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.35;
  }
  scene.add(sunLight);
  scene.add(sunLight.target);

  var hemi = new THREE.HemisphereLight(0xd6e8f4, 0xc8bca0, 1.18);
  scene.add(hemi);

  var ambient = new THREE.AmbientLight(0xc8ccd0, 0.6);
  scene.add(ambient);

  scene.add(S.buildings.group);

  var ENV_KEYS = [
    { p: 0.000, top:'#4a94d4', hor:'#f8f0dc', bot:'#d8ccb0', sunC:'#fff2d6', sunI: 3.0, az: 105, el: 26, hemiS:'#d8e8f4', hemiG:'#c8bca0', hemiI: 1.10, ambI: 0.55, fogC:'#e6e4dc', fogD: 0.00090, exp: 1.12 },
    { p: 0.125, top:'#4a94d4', hor:'#f4eed8', bot:'#ccc0a0', sunC:'#fff8e8', sunI: 3.3, az: 90, el: 42, hemiS:'#d6e8f6', hemiG:'#c8bca0', hemiI: 1.15, ambI: 0.56, fogC:'#e4e4dc', fogD: 0.00082, exp: 1.12 },
    { p: 0.250, top:'#4a94d4', hor:'#f6f0d8', bot:'#ccc0a0', sunC:'#fff8ec', sunI: 3.6, az: 75, el: 55, hemiS:'#d8e8f6', hemiG:'#c8bca0', hemiI: 1.20, ambI: 0.58, fogC:'#e4e2da', fogD: 0.00078, exp: 1.12 },
    { p: 0.375, top:'#4892d2', hor:'#f8f2dc', bot:'#d0c4a4', sunC:'#fffaf0', sunI: 3.8, az: 55, el: 65, hemiS:'#daeaf8', hemiG:'#ccc0a4', hemiI: 1.24, ambI: 0.58, fogC:'#e4e2da', fogD: 0.00075, exp: 1.12 },
    { p: 0.500, top:'#4a94d4', hor:'#f8f2dc', bot:'#ccc0a0', sunC:'#fff8ec', sunI: 3.6, az: 35, el: 55, hemiS:'#d8e8f6', hemiG:'#c8bca0', hemiI: 1.18, ambI: 0.56, fogC:'#e4e2da', fogD: 0.00080, exp: 1.12 },
    { p: 0.625, top:'#4a94d4', hor:'#faeed4', bot:'#c8b898', sunC:'#fff4dc', sunI: 3.4, az: 15, el: 44, hemiS:'#d6e6f4', hemiG:'#c8b89c', hemiI: 1.15, ambI: 0.55, fogC:'#e2e0d8', fogD: 0.00085, exp: 1.12 },
    { p: 0.750, top:'#4a94d4', hor:'#fbeac0', bot:'#c0b08c', sunC:'#ffeec4', sunI: 3.1, az: -8, el: 32, hemiS:'#d4e2f2', hemiG:'#c4b498', hemiI: 1.08, ambI: 0.53, fogC:'#e0ded6', fogD: 0.00090, exp: 1.13 },
    { p: 0.875, top:'#4a94d4', hor:'#fce4b0', bot:'#b8a884', sunC:'#ffe6ae', sunI: 2.9, az: -25, el: 24, hemiS:'#d0dcec', hemiG:'#c0b090', hemiI: 1.04, ambI: 0.52, fogC:'#dedcd4', fogD: 0.00095, exp: 1.13 },
    { p: 1.000, top:'#4a94d4', hor:'#fbe0a8', bot:'#b8a480', sunC:'#ffe2a8', sunI: 2.8, az: -35, el: 18, hemiS:'#ccd8e8', hemiG:'#bcac8c', hemiI: 1.00, ambI: 0.51, fogC:'#dcdad2', fogD: 0.00100, exp: 1.14 }
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
    var a = ENV_KEYS[i], b = ENV_KEYS[i + 1];
    var span = b.p - a.p;
    var t = span > 0 ? Math.max(0, Math.min(1, (p - a.p) / span)) : 0;
    return {
      top: _c.copy(a._top).lerp(b._top, t).clone(),
      hor: _c.copy(a._hor).lerp(b._hor, t).clone(),
      bot: _c.copy(a._bot).lerp(b._bot, t).clone(),
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
    _sunDir.set(Math.cos(elRad)*Math.sin(azRad), Math.sin(elRad), Math.cos(elRad)*Math.cos(azRad)).normalize();

    sunLight.color.copy(env.sunC);
    sunLight.intensity = env.sunI;
    sunLight.position.copy(camera.position).addScaledVector(_sunDir, 1200);
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

    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(scene, camera);
  }

  function resize() {
    vpW = window.innerWidth;
    vpH = window.innerHeight;
    renderer.setPixelRatio(Q.effectivePixelRatio);
    renderer.setSize(vpW, vpH);
    camera.aspect = vpW / vpH;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 220); });

  S.environment = {
    scene: scene, camera: camera, renderer: renderer,
    sky: sky, water: water, sunLight: sunLight, hemi: hemi, ambient: ambient,
    update: update, resize: resize, sampleEnv: sampleEnv
  };

  S.log('environment', true, 'daylight · no beacons · clean milan');

})();
