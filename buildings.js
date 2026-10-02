/* ============================================================
   SANTINOPOLE — buildings.js
   ------------------------------------------------------------
   LOD 0 (near) — full archetypes + street walls + courtyards
   LOD 1 (mid)  — instanced simplified boxes (materials shared)
   LOD 2 (far)  — instanced silhouette boxes (single instanced mesh)
   Plus: pedestrians, vehicles, trams, billboards, data highways,
   signal bands.
   ============================================================ */

(function () {
  'use strict';

  var S = window.SANTINOPOLE;
  var THREE = window.THREE;
  if (!S || !S.city || !S.performance || !THREE) {
    console.error('[buildings.js] three.js, performance.js and city.js must load first.');
    return;
  }
  var Q = S.performance.Q;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var RNG = mulberry32(77123);

  var TEX_SIZE = Math.max(32, Q.textureSize);
  var TEX_H = Math.floor(TEX_SIZE * 1.6);

  function makeCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function makeTex(canvas, rx, ry) {
    var t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rx !== undefined) t.repeat.set(rx, ry === undefined ? rx : ry);
    t.anisotropy = Q.anisotropy;
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }

  function makeFacade(cfg) {
    var W = TEX_SIZE, H = TEX_H;
    var c = makeCanvas(W, H), e = makeCanvas(W, H);
    var g = c.getContext('2d'), ge = e.getContext('2d');
    g.fillStyle = cfg.base; g.fillRect(0, 0, W, H);
    ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
    if (cfg.cornice) { g.fillStyle = cfg.cornice; g.fillRect(0, 0, W, 2); }
    var rows = cfg.rows, cols = cfg.cols;
    var pw = W/cols, ph = H/rows;
    var ww = pw * cfg.wRatio, wh = ph * cfg.hRatio;
    var wx0 = (pw - ww) / 2, wy0 = (ph - wh) / 2;
    for (var ry = 0; ry < rows; ry++) {
      for (var rx = 0; rx < cols; rx++) {
        var wx = rx*pw + wx0, wy = ry*ph + wy0;
        if (cfg.frame) { g.fillStyle = cfg.frame; g.fillRect(wx-1, wy-1, ww+2, wh+2); }
        var gg = g.createLinearGradient(wx, wy, wx, wy+wh);
        gg.addColorStop(0, cfg.glassTop); gg.addColorStop(1, cfg.glassBot);
        g.fillStyle = gg; g.fillRect(wx, wy, ww, wh);
        var noise = (Math.sin(rx*12.9898 + ry*78.233)*43758.5453) % 1;
        noise = noise - Math.floor(noise);
        if (noise > cfg.litThreshold) {
          var eg = ge.createLinearGradient(wx, wy, wx, wy+wh);
          eg.addColorStop(0, cfg.litTop); eg.addColorStop(1, cfg.litBot);
          ge.fillStyle = eg; ge.fillRect(wx, wy, ww, wh);
        }
      }
    }
    return { map: makeTex(c), emi: makeTex(e) };
  }

  var FACADE_CFG = {
    tower:     { base:'#d8cbb0', cornice:'#b8a890', frame:'#c8b898', glassTop:'#5a6878', glassBot:'#2a3444', litTop:'#ffe0b0', litBot:'#b08040', rows:3, cols:2, wRatio:0.75, hRatio:0.62, litThreshold:0.75 },
    office:    { base:'#e0d4b8', cornice:'#b8a890', frame:'#c8b898', glassTop:'#4a5868', glassBot:'#2a3442', litTop:'#ffe0b0', litBot:'#b08040', rows:3, cols:2, wRatio:0.62, hRatio:0.55, litThreshold:0.78 },
    block:     { base:'#d8c4a0', cornice:'#a88a68', frame:'#c0a888', glassTop:'#3a4658', glassBot:'#1a2432', litTop:'#ffd8a0', litBot:'#a87840', rows:3, cols:2, wRatio:0.55, hRatio:0.55, litThreshold:0.75 },
    creative:  { base:'#d4c4a8', cornice:'#f0e2c8', frame:'#c8b898', glassTop:'#5a6a7c', glassBot:'#2a3444', litTop:'#f0d8b0', litBot:'#a080c0', rows:2, cols:2, wRatio:0.78, hRatio:0.7, litThreshold:0.72 },
    data:      { base:'#c8bca0', cornice:'#988876', frame:'#b8a890', glassTop:'#4a7a9a', glassBot:'#1a2a3a', litTop:'#80e0ff', litBot:'#3a7abc', rows:4, cols:3, wRatio:0.65, hRatio:0.5, litThreshold:0.78 },
    commercial:{ base:'#e2d0b0', cornice:'#b08860', frame:'#c8b090', glassTop:'#5a5a62', glassBot:'#2a2a32', litTop:'#ffe8b0', litBot:'#b08048', rows:2, cols:2, wRatio:0.7, hRatio:0.6, litThreshold:0.72 },
    warehouse: { base:'#c8b898', cornice:'#8a7a60', frame:'#a89880', glassTop:'#3a4048', glassBot:'#1a1e24', litTop:'#ffdda0', litBot:'#9a7448', rows:2, cols:4, wRatio:0.32, hRatio:0.42, litThreshold:0.85 },
    rowhouse:  { base:'#ddc9a4', cornice:'#a88868', frame:'#c8ae88', glassTop:'#4a5668', glassBot:'#222a36', litTop:'#ffe0a8', litBot:'#a87840', rows:3, cols:2, wRatio:0.48, hRatio:0.6, litThreshold:0.72 },
    pavilion:  { base:'#f0e8d4', cornice:'#c8bca0', frame:'#b8a890', glassTop:'#4a5a68', glassBot:'#242e38', litTop:'#ffe8b8', litBot:'#b09050', rows:1, cols:2, wRatio:0.6, hRatio:0.7, litThreshold:0.72 },
    landmark:  { base:'#e8d8b8', cornice:'#b8a890', frame:'#c8b898', glassTop:'#4a5668', glassBot:'#1a2432', litTop:'#ffe8b8', litBot:'#b08848', rows:4, cols:2, wRatio:0.55, hRatio:0.55, litThreshold:0.70 }
  };

  var FACADE = {};
  Object.keys(FACADE_CFG).forEach(function (k) { FACADE[k] = makeFacade(FACADE_CFG[k]); });

  function makeCobble() {
    var S0 = TEX_SIZE;
    var c = makeCanvas(S0, S0);
    var g = c.getContext('2d');
    g.fillStyle = '#a89880'; g.fillRect(0, 0, S0, S0);
    var rows = 5, cell = S0 / rows;
    for (var r = 0; r < rows; r++) {
      var off = (r & 1) ? cell * 0.5 : 0;
      for (var i = -1; i < rows + 1; i++) {
        var l = 0.65 + RNG() * 0.3;
        g.fillStyle = 'rgb(' + Math.floor(190*l) + ',' + Math.floor(170*l) + ',' + Math.floor(148*l) + ')';
        g.fillRect(i*cell + off + 0.5, r*cell + 0.5, cell - 1, cell - 1);
      }
    }
    return makeTex(c, 6, 6);
  }
  var COBBLE_TEX = makeCobble();

  function makeMarble() {
    var S0 = TEX_SIZE, c = makeCanvas(S0, S0), g = c.getContext('2d');
    g.fillStyle = '#f2eadc'; g.fillRect(0, 0, S0, S0);
    for (var i = 0; i < 30; i++) {
      g.strokeStyle = 'rgba(190,180,160,' + (0.05 + RNG()*0.08) + ')';
      g.lineWidth = 1; g.beginPath();
      var x0 = RNG()*S0, y0 = RNG()*S0;
      g.moveTo(x0, y0);
      g.bezierCurveTo(x0+RNG()*20-10, y0+RNG()*20-10, x0+RNG()*20-10, y0+RNG()*20-10, x0+RNG()*20-10, y0+RNG()*20-10);
      g.stroke();
    }
    return makeTex(c, 1, 1);
  }
  var MARBLE_TEX = makeMarble();

  var MATS = {
    asphalt: new THREE.MeshStandardMaterial({ color: 0x5a544a, roughness: 0.95, metalness: 0.02 }),
    sidewalk: new THREE.MeshStandardMaterial({ map: COBBLE_TEX, color: 0xd8ccb4, roughness: 0.92 }),
    marble:   new THREE.MeshStandardMaterial({ map: MARBLE_TEX, color: 0xf5ede0, roughness: 0.42 }),
    lawn:     new THREE.MeshStandardMaterial({ color: 0x6a9050, roughness: 0.95 }),
    roof:     new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.85 }),
    metal:    new THREE.MeshStandardMaterial({ color: 0x4a4e52, roughness: 0.4, metalness: 0.85 }),
    stone:    new THREE.MeshStandardMaterial({ color: 0xd8c8a8, roughness: 0.88 }),
    pedestrian: new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.9 }),
    vehicle:    new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.4, metalness: 0.6 }),
    train:      new THREE.MeshStandardMaterial({ color: 0xd4a24a, roughness: 0.5, metalness: 0.4, emissive: 0x806030, emissiveIntensity: 0.2 })
  };

  function facadeMat(kind) {
    var f = FACADE[kind] || FACADE.office;
    return new THREE.MeshStandardMaterial({
      map: f.map, emissiveMap: f.emi,
      emissive: 0xffffff, emissiveIntensity: 0,
      roughness: kind === 'tower' || kind === 'data' ? 0.42 : 0.88,
      metalness: kind === 'tower' || kind === 'data' ? 0.42 : 0.05
    });
  }
  var FACADE_MATS = {};
  Object.keys(FACADE).forEach(function (k) { FACADE_MATS[k] = facadeMat(k); });

  // Instanced palette (LOD 1 + 2)
  var INSTANCED_MATS = [
    new THREE.MeshLambertMaterial({ color: 0xd8c8a8 }),
    new THREE.MeshLambertMaterial({ color: 0xc8b898 }),
    new THREE.MeshLambertMaterial({ color: 0xbaa888 }),
    new THREE.MeshLambertMaterial({ color: 0xa89878 })
  ];

  function boxUV(w, h, d, tw, th) {
    var g = new THREE.BoxGeometry(w, h, d);
    var uv = g.attributes.uv, nrm = g.attributes.normal;
    for (var i = 0; i < uv.count; i++) {
      var nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
      var su, sv;
      if (ny > 0.5) { su = w/tw; sv = d/tw; }
      else if (nx > 0.5) { su = d/tw; sv = h/th; }
      else { su = w/tw; sv = h/th; }
      uv.setXY(i, uv.getX(i)*su, uv.getY(i)*sv);
    }
    uv.needsUpdate = true;
    return g;
  }

  function gableRoof(w, d, rh) {
    var hw = w/2, hd = d/2;
    var pos = [
      -hw,0,hd, hw,0,hd, hw,rh,0, -hw,0,hd, hw,rh,0, -hw,rh,0,
       hw,0,-hd, -hw,0,-hd, -hw,rh,0, hw,0,-hd, -hw,rh,0, hw,rh,0,
      -hw,0,-hd, -hw,0,hd, -hw,rh,0, hw,0,hd, hw,0,-hd, hw,rh,0
    ];
    var uv = [];
    for (var i = 0; i < pos.length / 3; i++) uv.push(pos[i*3]/4, pos[i*3+2]/4);
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }
  function pyramidRoof(w, d, rh) {
    var hw = w/2, hd = d/2;
    var pos = [
      -hw,0,hd, hw,0,hd, 0,rh,0, hw,0,hd, hw,0,-hd, 0,rh,0,
       hw,0,-hd, -hw,0,-hd, 0,rh,0, -hw,0,-hd, -hw,0,hd, 0,rh,0
    ];
    var uv = [];
    for (var i = 0; i < pos.length / 3; i++) uv.push(pos[i*3]/4, pos[i*3+2]/4);
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }
  function mergeGeoms(geos) {
    if (!geos || geos.length === 0) return null;
    if (geos.length === 1) return geos[0];
    var allIdx = true, anyIdx = false;
    for (var i = 0; i < geos.length; i++) { if (geos[i].index) anyIdx = true; else allIdx = false; }
    var arr = geos;
    if (!allIdx && anyIdx) {
      arr = [];
      for (var i = 0; i < geos.length; i++) arr.push(geos[i].index ? geos[i].toNonIndexed() : geos[i]);
    }
    var first = arr[0];
    var names = Object.keys(first.attributes);
    var hasIdx = !!first.index;
    var total = 0;
    for (var i = 0; i < arr.length; i++) total += arr[i].attributes.position.count;
    var merged = new THREE.BufferGeometry();
    for (var a = 0; a < names.length; a++) {
      var name = names[a];
      var itemSize = first.attributes[name].itemSize;
      var buf = new Float32Array(total * itemSize);
      var off = 0;
      for (var i = 0; i < arr.length; i++) {
        var at = arr[i].attributes[name];
        if (!at) continue;
        var s = at.array;
        for (var j = 0; j < s.length; j++) buf[off++] = s[j];
      }
      merged.setAttribute(name, new THREE.BufferAttribute(buf, itemSize));
    }
    if (hasIdx) {
      var totalIdx = 0;
      for (var i = 0; i < arr.length; i++) if (arr[i].index) totalIdx += arr[i].index.count;
      var idxBuf = new Uint32Array(totalIdx);
      var iOff = 0, vOff = 0;
      for (var i = 0; i < arr.length; i++) {
        var idx = arr[i].index;
        if (idx) for (var j = 0; j < idx.count; j++) idxBuf[iOff++] = idx.getX(j) + vOff;
        vOff += arr[i].attributes.position.count;
      }
      merged.setIndex(new THREE.BufferAttribute(idxBuf, 1));
    }
    return merged;
  }

  var BATCH = new Map();
  function pushGeo(mat, geo) {
    var arr = BATCH.get(mat);
    if (!arr) { arr = []; BATCH.set(mat, arr); }
    arr.push(geo);
  }
  function flushBatches(parent) {
    BATCH.forEach(function (arr, mat) {
      if (!arr.length) return;
      var merged = null;
      try { merged = mergeGeoms(arr); } catch (e) { merged = null; }
      if (!merged) {
        for (var i = 0; i < arr.length; i++) parent.add(new THREE.Mesh(arr[i], mat));
      } else {
        merged.computeBoundingSphere();
        merged.computeBoundingBox();
        parent.add(new THREE.Mesh(merged, mat));
      }
    });
    BATCH.clear();
  }

  function ribbonFromPolyline(points, width, y) {
    if (points.length < 2) return null;
    var verts = [], idx = [], uvs = [];
    var halfW = width / 2;
    for (var i = 0; i < points.length; i++) {
      var px = points[i][0], pz = points[i][1];
      var nx, nz;
      if (i === 0) { nx = points[1][0] - px; nz = points[1][1] - pz; }
      else if (i === points.length - 1) { nx = px - points[i-1][0]; nz = pz - points[i-1][1]; }
      else { nx = points[i+1][0] - points[i-1][0]; nz = points[i+1][1] - points[i-1][1]; }
      var len = Math.sqrt(nx*nx + nz*nz) || 1;
      nx /= len; nz /= len;
      var pxn = -nz, pzn = nx;
      verts.push(px + pxn*halfW, y, pz + pzn*halfW);
      verts.push(px - pxn*halfW, y, pz - pzn*halfW);
      uvs.push(0, i*0.5, 1, i*0.5);
    }
    for (var s = 0; s < points.length - 1; s++) {
      var a = s*2, b = s*2+1, c = s*2+2, d = s*2+3;
      idx.push(a,b,c, b,d,c);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function buildRoads() {
    var yR = 0.15, yW = 0.30;
    for (var i = 0; i < S.city.streets.length; i++) {
      var st = S.city.streets[i];
      var r = ribbonFromPolyline(st.points, st.width, yR);
      if (r) pushGeo(MATS.asphalt, r);
      var w = ribbonFromPolyline(st.points, st.width + 4.5, yW);
      if (w) pushGeo(MATS.sidewalk, w);
    }
  }

  /* ============================================================
     LOD 0 — archetypes
     ============================================================ */
  function buildTower(lot) {
    var w=lot.w, d=lot.d, h=lot.h;
    var gh=4.5, uh=Math.max(1, h-gh);
    var w4 = new THREE.Matrix4().makeRotationY(lot.rot).setPosition(lot.x, 0, lot.z);
    pushGeo(FACADE_MATS.office, boxUV(w, gh, d, 7, gh).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gh/2, 0))));
    pushGeo(FACADE_MATS.tower, boxUV(w, uh, d, 5, 4.6).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gh + uh/2, 0))));
    pushGeo(MATS.stone, new THREE.BoxGeometry(w+1, 0.7, d+1).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h+0.35, 0))));
    var mh = 3 + RNG()*3;
    pushGeo(MATS.metal, new THREE.BoxGeometry(w*0.55, mh, d*0.55).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h+0.7+mh/2, 0))));
    if (RNG() < 0.3) {
      var sh = 8 + RNG()*14;
      pushGeo(MATS.metal, new THREE.CylinderGeometry(0.25, 0.4, sh, 5).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h+mh+sh/2+0.7, 0))));
    }
  }
  function buildOffice(lot) {
    var w=lot.w, d=lot.d, h=lot.h;
    var gh=4.0, uh=Math.max(1, h-gh);
    var w4 = new THREE.Matrix4().makeRotationY(lot.rot).setPosition(lot.x, 0, lot.z);
    pushGeo(MATS.sidewalk, boxUV(w, gh, d, 6, gh).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gh/2, 0))));
    pushGeo(FACADE_MATS.office, boxUV(w, uh, d, 4, 3.4).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gh+uh/2, 0))));
    pushGeo(MATS.stone, new THREE.BoxGeometry(w+1, 0.6, d+1).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h+0.3, 0))));
    pushGeo(MATS.roof, new THREE.BoxGeometry(w+0.6, 0.4, d+0.6).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h+0.8, 0))));
  }
  function buildBlock(lot) {
    var w=lot.w, d=lot.d, h=lot.h;
    var w4 = new THREE.Matrix4().makeRotationY(lot.rot).setPosition(lot.x, 0, lot.z);
    var useGable = RNG() > 0.4;
    pushGeo(FACADE_MATS.block, boxUV(w, h, d, 4, 3.6).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h/2, 0))));
    pushGeo(MATS.stone, new THREE.BoxGeometry(w+0.7, 0.5, d+0.7).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h+0.25, 0))));
    if (useGable) {
      var rh = Math.min(w, d)*0.22 + 0.6;
      pushGeo(MATS.roof, gableRoof(w+0.8, d+0.8, rh).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h+0.5, 0))));
    } else {
      pushGeo(MATS.roof, new THREE.BoxGeometry(w+0.5, 0.5, d+0.5).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h+0.5, 0))));
    }
  }
  function buildCreative(lot) {
    var w=lot.w, d=lot.d, h=lot.h;
    var w4 = new THREE.Matrix4().makeRotationY(lot.rot).setPosition(lot.x, 0, lot.z);
    var groundH=5.5;
    pushGeo(FACADE_MATS.commercial, boxUV(w, groundH, d, 6, groundH).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, groundH/2, 0))));
    var mainH = h - groundH;
    pushGeo(FACADE_MATS.creative, boxUV(w, mainH, d, 4, 4).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, groundH+mainH/2, 0))));
    if (RNG() < 0.6) {
      var ow=w*0.6, od=d*0.6, oh=4+RNG()*8;
      pushGeo(FACADE_MATS.creative, boxUV(ow, oh, od, 3, 3).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(w*0.15, h+oh/2, d*0.1))));
    }
    pushGeo(MATS.metal, new THREE.BoxGeometry(w+0.3, 0.4, d+0.3).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h+0.2, 0))));
  }
  function buildData(lot) {
    var w=lot.w, d=lot.d, h=lot.h;
    var w4 = new THREE.Matrix4().makeRotationY(lot.rot).setPosition(lot.x, 0, lot.z);
    pushGeo(FACADE_MATS.data, boxUV(w, h, d, 3, 3).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h/2, 0))));
    pushGeo(MATS.metal, new THREE.BoxGeometry(w+1.2, 0.6, d+1.2).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h+0.3, 0))));
    var mastH = 6 + RNG()*10;
    pushGeo(MATS.metal, new THREE.CylinderGeometry(0.18, 0.25, mastH, 5).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h+mastH/2+0.6, 0))));
  }
  function buildCommercial(lot) {
    var w=lot.w, d=lot.d, h=lot.h;
    var w4 = new THREE.Matrix4().makeRotationY(lot.rot).setPosition(lot.x, 0, lot.z);
    pushGeo(FACADE_MATS.commercial, boxUV(w, h, d, 4, 3.4).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h/2, 0))));
    pushGeo(MATS.roof, new THREE.BoxGeometry(w+1.5, 0.3, d+1.5).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h*0.35, 0))));
    pushGeo(MATS.roof, new THREE.BoxGeometry(w+0.6, 0.5, d+0.6).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h+0.5, 0))));
  }
  function buildWarehouse(lot) {
    var w=lot.w, d=lot.d, h=lot.h;
    var w4 = new THREE.Matrix4().makeRotationY(lot.rot).setPosition(lot.x, 0, lot.z);
    pushGeo(FACADE_MATS.warehouse, boxUV(w, h, d, 5, 4).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h/2, 0))));
    var rh = 3 + RNG()*2;
    pushGeo(MATS.metal, pyramidRoof(w+0.5, d+0.5, rh).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h, 0))));
  }
  function buildRowhouse(lot) {
    var w=lot.w, d=lot.d, h=lot.h;
    var w4 = new THREE.Matrix4().makeRotationY(lot.rot).setPosition(lot.x, 0, lot.z);
    pushGeo(FACADE_MATS.rowhouse, boxUV(w, h, d, 2.5, 3).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h/2, 0))));
    var rh = Math.min(w, d)*0.3 + 0.5;
    pushGeo(MATS.roof, gableRoof(w+0.6, d+0.6, rh).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h, 0))));
  }
  function buildPavilion(lot) {
    var w=lot.w, d=lot.d, h=lot.h;
    var w4 = new THREE.Matrix4().makeRotationY(lot.rot).setPosition(lot.x, 0, lot.z);
    pushGeo(MATS.marble, new THREE.BoxGeometry(w+6, 0.6, d+6).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.3, 0))));
    pushGeo(FACADE_MATS.pavilion, boxUV(w, h, d, 4, 3).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h/2+0.6, 0))));
    pushGeo(MATS.stone, new THREE.BoxGeometry(w+2, 0.8, d+2).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h+1.0, 0))));
  }

  var BUILDERS = {
    tower: buildTower, office: buildOffice, block: buildBlock,
    creative: buildCreative, data: buildData, commercial: buildCommercial,
    warehouse: buildWarehouse, rowhouse: buildRowhouse, pavilion: buildPavilion
  };

  function buildNearLots(lots) {
    for (var i = 0; i < lots.length; i++) {
      var lot = lots[i];
      var fn = BUILDERS[lot.type] || buildBlock;
      fn(lot);
    }
  }

  /* ============================================================
     LOD 1 + LOD 2 — INSTANCED
     4 buckets by height class. ~37,000 boxes → 4 draw calls.
     ============================================================ */
  function buildInstancedCity(lots) {
    var buckets = [[], [], [], []];
    for (var i = 0; i < lots.length; i++) {
      var h = lots[i].h;
      if (h < 25) buckets[0].push(lots[i]);
      else if (h < 55) buckets[1].push(lots[i]);
      else if (h < 95) buckets[2].push(lots[i]);
      else buckets[3].push(lots[i]);
    }
    // Base unit box, scaled per instance
    var baseGeo = new THREE.BoxGeometry(1, 1, 1);
    baseGeo.translate(0, 0.5, 0);

    var dummy = new THREE.Object3D();

    for (var c = 0; c < buckets.length; c++) {
      var bucket = buckets[c];
      if (bucket.length === 0) continue;

      var mesh = new THREE.InstancedMesh(baseGeo, INSTANCED_MATS[c], bucket.length);
      mesh.frustumCulled = false;

      for (var k = 0; k < bucket.length; k++) {
        var lot = bucket[k];
        dummy.position.set(lot.x, 0, lot.z);
        dummy.rotation.set(0, lot.rot || 0, 0);
        dummy.scale.set(lot.w, lot.h, lot.d);
        dummy.updateMatrix();
        mesh.setMatrixAt(k, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      scene_group.add(mesh);
    }
  }

  /* ============================================================
     LANDMARKS
     ============================================================ */
  function buildSpire(lm) {
    var r=8, h=lm.h;
    pushGeo(MATS.stone, new THREE.BoxGeometry(r*2.4, 8, r*2.4).translate(lm.x, 4, lm.z));
    pushGeo(FACADE_MATS.tower, new THREE.CylinderGeometry(r*0.5, r, h-40, 8).translate(lm.x, 4+(h-40)/2, lm.z));
    pushGeo(MATS.metal, new THREE.CylinderGeometry(0.6, 1.4, h*0.35, 6).translate(lm.x, h-40+4+h*0.175, lm.z));
    pushGeo(MATS.metal, new THREE.SphereGeometry(1.6, 12, 8).translate(lm.x, h+6, lm.z));
  }
  function buildCivicDome(lm) {
    var w=44, d=40, bodyH=lm.h*0.55;
    pushGeo(MATS.marble, new THREE.BoxGeometry(w+8, 1.0, d+8).translate(lm.x, 0.5, lm.z));
    pushGeo(FACADE_MATS.pavilion, boxUV(w, bodyH, d, 4, 3).translate(lm.x, bodyH/2+1, lm.z));
    pushGeo(MATS.stone, new THREE.BoxGeometry(w+2, 1.4, d+2).translate(lm.x, bodyH+1.7, lm.z));
    pushGeo(MATS.marble, new THREE.CylinderGeometry(8, 8.6, 6, 12).translate(lm.x, bodyH+5.4, lm.z));
    pushGeo(MATS.roof, new THREE.SphereGeometry(9, 16, 10, 0, Math.PI*2, 0, Math.PI*0.55).translate(lm.x, bodyH+8.4, lm.z));
    pushGeo(MATS.metal, new THREE.ConeGeometry(0.8, 4, 6).translate(lm.x, bodyH+18, lm.z));
  }
  function buildSlab(lm) {
    var w=44, d=26, h=lm.h;
    pushGeo(FACADE_MATS.office, boxUV(w, h, d, 5, 3.6).translate(lm.x, h/2, lm.z));
    pushGeo(MATS.metal, new THREE.BoxGeometry(w+3, 0.6, d+3).translate(lm.x, h+0.4, lm.z));
    pushGeo(MATS.metal, new THREE.BoxGeometry(w*0.6, 4, d*0.6).translate(lm.x, h+2.6, lm.z));
  }
  function buildPavilionLandmark(lm) {
    var w=26, d=22, h=lm.h;
    pushGeo(MATS.marble, new THREE.BoxGeometry(w+8, 0.8, d+8).translate(lm.x, 0.4, lm.z));
    pushGeo(FACADE_MATS.pavilion, boxUV(w, h, d, 4, 3).translate(lm.x, h/2+0.8, lm.z));
    pushGeo(MATS.stone, new THREE.BoxGeometry(w+2, 1, d+2).translate(lm.x, h+1.3, lm.z));
    pushGeo(MATS.roof, gableRoof(w+1, d+1, 3).translate(lm.x, h+1.8, lm.z));
  }
  function buildLandmarkTower(lm) {
    var w=18, d=18, h=lm.h;
    pushGeo(FACADE_MATS.landmark, boxUV(w, h, d, 4, 4).translate(lm.x, h/2, lm.z));
    pushGeo(MATS.stone, new THREE.BoxGeometry(w+3, 1, d+3).translate(lm.x, h+0.5, lm.z));
    pushGeo(MATS.metal, new THREE.CylinderGeometry(0.3, 0.6, 6, 6).translate(lm.x, h+3.5, lm.z));
  }
  function buildLandmarks() {
    for (var i = 0; i < S.city.landmarks.length; i++) {
      var lm = S.city.landmarks[i];
      switch (lm.id) {
        case 'spire': buildSpire(lm); break;
        case 'cathedral':
        case 'exchange':
        case 'piazza': buildCivicDome(lm); break;
        case 'index':
        case 'signal': buildSlab({ x: lm.x, z: lm.z, h: lm.h }); break;
        case 'webhub':
        case 'glassworks':
        case 'observat': buildLandmarkTower(lm); break;
        default: buildPavilionLandmark(lm);
      }
    }
  }

  function buildPublicSpaces() {
    for (var i = 0; i < S.city.publicSpaces.length; i++) {
      var p = S.city.publicSpaces[i];
      if (p.kind === 'plaza') {
        var g = new THREE.CircleGeometry(p.radius, 32); g.rotateX(-Math.PI/2);
        pushGeo(MATS.marble, g.translate(p.x, 0.35, p.z));
      } else {
        var gg = new THREE.CircleGeometry(p.radius, 32); gg.rotateX(-Math.PI/2);
        pushGeo(MATS.lawn, gg.translate(p.x, 0.32, p.z));
      }
    }
  }

  /* ============================================================
     LIVING LAYER
     ============================================================ */
  function preparePolyline(points) {
    var pts = [], cum = [0], total = 0;
    for (var i = 0; i < points.length; i++) pts.push(new THREE.Vector2(points[i][0], points[i][1]));
    for (var j = 1; j < pts.length; j++) {
      var dx = pts[j].x - pts[j-1].x, dy = pts[j].y - pts[j-1].y;
      total += Math.sqrt(dx*dx + dy*dy);
      cum.push(total);
    }
    return { pts: pts, cum: cum, total: total };
  }
  function samplePolyline(poly, t, outPos, outDir) {
    if (!poly || poly.total <= 0) { outPos.set(0,0,0); outDir.set(0,0,1); return; }
    var u = ((t % poly.total) + poly.total) % poly.total;
    var lo = 0, hi = poly.cum.length - 1;
    while (lo < hi - 1) { var mid = (lo+hi)>>1; if (poly.cum[mid] <= u) lo = mid; else hi = mid; }
    var a = poly.pts[lo], b = poly.pts[hi];
    var segLen = poly.cum[hi] - poly.cum[lo] || 1;
    var f = (u - poly.cum[lo]) / segLen;
    outPos.set(a.x + (b.x-a.x)*f, 0, a.y + (b.y-a.y)*f);
    var dx = b.x-a.x, dy = b.y-a.y;
    var len = Math.sqrt(dx*dx + dy*dy) || 1;
    outDir.set(dx/len, 0, dy/len);
  }

  var walkPaths = [], drivePaths = [], rails = [];
  function buildPathCaches() {
    var s = S.city.streets;
    for (var i = 0; i < s.length; i++) {
      if (s[i].points.length < 2) continue;
      if (s[i].points.length > 200) continue; // skip giant rings for paths
      var poly = preparePolyline(s[i].points);
      if (poly.total < 30) continue;
      walkPaths.push(poly);
      if (s[i].width >= 14 && poly.total > 60) drivePaths.push(poly);
    }
    var lines = S.city.transit.lines;
    for (var j = 0; j < lines.length; j++) {
      rails.push({ poly: preparePolyline(lines[j].points), color: lines[j].color });
    }
  }
  buildPathCaches();

  var pedMesh = null, pedData = [];
  function buildPedestrians() {
    var count = Q.pedestrians;
    if (count <= 0 || walkPaths.length === 0) return;
    var geo = new THREE.BoxGeometry(0.5, 1.65, 0.35);
    geo.translate(0, 0.825, 0);
    pedMesh = new THREE.InstancedMesh(geo, MATS.pedestrian, count);
    pedMesh.frustumCulled = false;
    for (var i = 0; i < count; i++) {
      var path = walkPaths[Math.floor(RNG() * walkPaths.length)];
      pedData.push({ path: path, t: RNG()*path.total, speed: 1.1 + RNG()*0.9, bobPhase: RNG()*Math.PI*2 });
    }
  }
  var vehMesh = null, vehData = [];
  function buildVehicles() {
    var count = Q.vehicles;
    if (count <= 0 || drivePaths.length === 0) return;
    var geo = new THREE.BoxGeometry(1.85, 1.35, 4.2);
    geo.translate(0, 0.675, 0);
    vehMesh = new THREE.InstancedMesh(geo, MATS.vehicle, count);
    vehMesh.frustumCulled = false;
    for (var i = 0; i < count; i++) {
      var path = drivePaths[Math.floor(RNG() * drivePaths.length)];
      var dir = RNG() < 0.5 ? 1 : -1;
      vehData.push({ path: path, t: RNG()*path.total, speed: 7 + RNG()*7, dir: dir, laneOffset: dir*3.2 });
    }
  }
  var trains = [];
  function buildTransit() {
    var count = Q.transitUnits;
    if (count <= 0 || rails.length === 0) return;
    var geo = new THREE.BoxGeometry(2.4, 2.8, 9.5);
    geo.translate(0, 1.4, 0);
    for (var i = 0; i < count; i++) {
      var rail = rails[i % rails.length];
      var m = new THREE.Mesh(geo, MATS.train);
      m.frustumCulled = false;
      trains.push({ mesh: m, rail: rail, t: RNG()*rail.poly.total, speed: 14 + RNG()*8 });
    }
  }

  /* ============================================================
     BILLBOARDS
     ============================================================ */
  var billboards = [];
  function makeBillboardCanvas(character, colHex) {
    var W = 512, H = 256;
    var c = makeCanvas(W, H);
    var g = c.getContext('2d');
    g.fillStyle = 'rgba(250, 244, 232, 0.96)'; g.fillRect(0, 0, W, H);
    g.strokeStyle = colHex; g.lineWidth = 3; g.strokeRect(2, 2, W-4, H-4);
    var col = colHex;
    g.fillStyle = '#2a2620';
    if (character === 'creative' || character === 'web') {
      g.fillStyle = col; g.font = 'bold 22px serif'; g.fillText('Torre Nuova', 20, 40);
      g.font = '15px monospace'; g.fillStyle = '#4a4640';
      var lines = ['const city = await build({','  districts: 15,','  status: "live"','});'];
      for (var i = 0; i < lines.length; i++) g.fillText(lines[i], 20, 80 + i*26);
    } else if (character === 'data' || character === 'seo') {
      g.fillStyle = col; g.font = 'bold 22px serif'; g.fillText('Indice', 20, 40);
      g.font = '16px monospace'; g.fillStyle = '#4a4640';
      var rank = ['1  santinopole', '2  —', '3  —', '4  —'];
      for (var r = 0; r < rank.length; r++) g.fillText(rank[r], 20, 82 + r*26);
    } else if (character === 'commercial' || character === 'growth') {
      g.fillStyle = col; g.font = 'bold 22px serif'; g.fillText('Crescita', 20, 40);
      g.font = 'bold 48px serif'; g.fillStyle = '#2a2620'; g.fillText('+284%', 20, 110);
    } else if (character === 'entertainment') {
      g.fillStyle = col; g.font = 'bold 54px serif'; g.fillText('Aperto', 40, 130);
      g.font = 'italic 26px serif'; g.fillStyle = '#4a4640'; g.fillText('fino a tarda notte', 60, 180);
    } else if (character === 'fashion') {
      g.fillStyle = col; g.font = 'bold 26px serif'; g.fillText('MODA', 20, 50);
      g.font = 'italic 20px serif'; g.fillStyle = '#4a4640'; g.fillText('collezione primavera', 20, 90);
      g.font = 'bold 44px serif'; g.fillStyle = col; g.fillText('SS26', 20, 150);
    } else if (character === 'shopping') {
      g.fillStyle = col; g.font = 'bold 24px serif'; g.fillText('Corso', 20, 45);
      g.font = '18px serif'; g.fillStyle = '#4a4640'; g.fillText('— aperto fino alle 20 —', 20, 90);
    } else if (character === 'canal') {
      g.fillStyle = col; g.font = 'bold 24px serif'; g.fillText('Navigli', 20, 45);
      g.font = 'italic 18px serif'; g.fillStyle = '#4a4640'; g.fillText('cucina · vino · musica', 20, 90);
    } else if (character === 'harbor') {
      g.fillStyle = col; g.font = 'bold 22px monospace'; g.fillText('PORTA GENOVA', 20, 40);
    } else if (character === 'civic') {
      g.fillStyle = col; g.font = 'bold 26px serif'; g.fillText('Piazza Santino', 20, 45);
    } else if (character === 'cultural') {
      g.fillStyle = col; g.font = 'bold 24px serif'; g.fillText('Brera', 20, 45);
      g.font = 'italic 18px serif'; g.fillStyle = '#4a4640'; g.fillText('stagione d\'arte', 20, 90);
    } else if (character === 'residential') {
      g.fillStyle = col; g.font = 'bold 24px serif'; g.fillText('Porta Romana', 20, 45);
    } else {
      g.fillStyle = col; g.font = 'bold 22px serif'; g.fillText('Santinopole', 20, 60);
    }
    g.fillStyle = col; g.fillRect(0, H-6, W, 6);
    return c;
  }
  function buildBillboards() {
    var districts = S.city.districts;
    var maxPerDistrict = Q.tier >= 3 ? 4 : (Q.tier >= 2 ? 3 : 2);
    var colorMap = {
      financial:'#d4a24a', creative:'#3aa8b8', data:'#3ab890', commercial:'#d48838',
      harbor:'#5a8ac8', civic:'#b8a888', residential:'#c890a0',
      cultural:'#9878c8', entertainment:'#c85080', fashion:'#c88aa8',
      shopping:'#d8a858', canal:'#c87848'
    };
    for (var i = 0; i < districts.length; i++) {
      var d = districts[i];
      if (d.character === 'park') continue;
      var color = colorMap[d.character] || '#c89858';
      var canvas = makeBillboardCanvas(d.character, color);
      var tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Q.anisotropy;
      var count = maxPerDistrict;
      for (var k = 0; k < count; k++) {
        var angle = (k / count) * Math.PI * 2 + RNG() * 0.8;
        var rad = d.radius * (0.35 + RNG() * 0.45);
        var bx = d.center[0] + Math.cos(angle) * rad;
        var bz = d.center[1] + Math.sin(angle) * rad;
        var by = 70 + RNG() * 50;
        var sizeScale = d.character === 'financial' ? 1.3 : 1.0;
        var pw = 26 * sizeScale, ph = 13 * sizeScale;
        var geo = new THREE.PlaneGeometry(pw, ph);
        var mat = new THREE.MeshBasicMaterial({ map: tex.clone(), transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
        mat.map.needsUpdate = true;
        var mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(bx, by, bz);
        mesh.renderOrder = 3;
        billboards.push({ mesh: mesh, baseY: by, bobPhase: RNG()*Math.PI*2, bobSpeed: 0.6 + RNG()*0.4 });
      }
    }
  }
  buildBillboards();

  /* ============================================================
     DATA HIGHWAYS
     ============================================================ */
  var dataHighways = [];
  function buildDataHighways() {
    if (Q.tier < 1) return;
    var links = [
      { a: 'isola', b: 'citta', color: '#3ab8b8' },
      { a: 'citta', b: 'romana', color: '#3ab890' },
      { a: 'romana', b: 'isola', color: '#d48838' },
      { a: 'isola', b: 'centro', color: '#c89858' },
      { a: 'citta', b: 'centro', color: '#c89858' },
      { a: 'romana', b: 'centro', color: '#c89858' }
    ];
    var byId = {};
    for (var i = 0; i < S.city.districts.length; i++) byId[S.city.districts[i].id] = S.city.districts[i];
    var pulseCount = Q.tier >= 3 ? 5 : 3;
    for (var j = 0; j < links.length; j++) {
      var a = byId[links[j].a], b = byId[links[j].b];
      if (!a || !b) continue;
      var ax = a.center[0], az = a.center[1];
      var bx = b.center[0], bz = b.center[1];
      var col = new THREE.Color(links[j].color);
      var dx = bx-ax, dz = bz-az;
      var len = Math.sqrt(dx*dx + dz*dz);
      var midX = (ax+bx)/2, midZ = (az+bz)/2;
      var angle = Math.atan2(dx, dz);
      var lineGeo = new THREE.CylinderGeometry(0.4, 0.4, len, 6, 1, true);
      lineGeo.rotateX(Math.PI/2);
      var lineMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
      var line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(midX, 22, midZ);
      line.rotation.y = angle;
      line.renderOrder = 3;
      dataHighways.push({ type: 'line', mesh: line, baseOpacity: 0.22 });
      for (var p = 0; p < pulseCount; p++) {
        var pulseGeo = new THREE.SphereGeometry(1.1, 8, 6);
        var pulseMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
        var pulse = new THREE.Mesh(pulseGeo, pulseMat);
        pulse.renderOrder = 4;
        dataHighways.push({ type: 'pulse', mesh: pulse, ax: ax, az: az, bx: bx, bz: bz, t: p/pulseCount, speed: 0.18 + RNG()*0.08 });
      }
    }
  }
  buildDataHighways();

  /* ============================================================
     SIGNAL BANDS
     ============================================================ */
  var signalBandGroups = [];
  var BAND_COLOR_BY_CHARACTER = {
    financial:'#e0b860', creative:'#5ad0d8', data:'#5ad8b0', commercial:'#ffb860',
    harbor:'#6a9ad8', civic:'#f0e0c0', residential:'#e8c0cc', cultural:'#b890e0',
    entertainment:'#e870a0', fashion:'#e8a8c0', shopping:'#f0c070', canal:'#e08858'
  };
  function buildSignalBands() {
    if (Q.tier < 1) return;
    var lots = S.city.lots;
    var bandsByDistrict = {};
    for (var i = 0; i < lots.length; i++) {
      var lot = lots[i];
      if (lot.lod !== 0) continue; // only near city gets bands
      if (lot.character === 'park') continue;
      if (!bandsByDistrict[lot.districtId]) bandsByDistrict[lot.districtId] = { character: lot.character, lots: [] };
      bandsByDistrict[lot.districtId].lots.push(lot);
    }
    var districtIds = Object.keys(bandsByDistrict);
    for (var di = 0; dId = districtIds[di], di < districtIds.length; di++) {
      var entry = bandsByDistrict[dId];
      var character = entry.character;
      var colorHex = BAND_COLOR_BY_CHARACTER[character] || '#c89858';
      var color = new THREE.Color(colorHex);
      var totalBands = entry.lots.length * 2;
      if (totalBands === 0) continue;
      var bandGeo = new THREE.BoxGeometry(1, 0.5, 1);
      var bandMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
      var mesh = new THREE.InstancedMesh(bandGeo, bandMat, totalBands);
      mesh.frustumCulled = false;
      var idx = 0;
      var dummy = new THREE.Object3D();
      for (var li = 0; li < entry.lots.length; li++) {
        var lot = entry.lots[li];
        for (var b = 0; b < 2; b++) {
          var bandY = lot.h * (0.35 + b * 0.4);
          dummy.position.set(lot.x, bandY, lot.z);
          dummy.rotation.set(0, lot.rot, 0);
          dummy.scale.set(lot.w * 1.06, 0.45, lot.d * 1.06);
          dummy.updateMatrix();
          mesh.setMatrixAt(idx++, dummy.matrix);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      signalBandGroups.push({ districtId: dId, mesh: mesh, mat: bandMat });
    }
  }
  buildSignalBands();

  /* ============================================================
     ANIMATE
     ============================================================ */
  var _m4 = new THREE.Matrix4();
  var _q = new THREE.Quaternion();
  var _p = new THREE.Vector3();
  var _d = new THREE.Vector3();
  var _up = new THREE.Vector3(0, 1, 0);
  var _s = new THREE.Vector3(1, 1, 1);
  var _tp = new THREE.Vector3();

  function animate(elapsed, dt) {
    if (pedMesh && dt > 0) {
      for (var i = 0; i < pedData.length; i++) {
        var p = pedData[i];
        p.t += p.speed * dt;
        samplePolyline(p.path, p.t, _p, _d);
        var bob = Math.sin(elapsed * 7 + p.bobPhase) * 0.05;
        _tp.set(_p.x, bob, _p.z);
        var yaw = Math.atan2(_d.x, _d.z);
        _q.setFromAxisAngle(_up, yaw);
        _m4.compose(_tp, _q, _s);
        pedMesh.setMatrixAt(i, _m4);
      }
      pedMesh.instanceMatrix.needsUpdate = true;
    }
    if (vehMesh && dt > 0) {
      for (var j = 0; j < vehData.length; j++) {
        var v = vehData[j];
        v.t += v.speed * dt * v.dir;
        samplePolyline(v.path, v.t, _p, _d);
        var perpX = -_d.z * v.laneOffset;
        var perpZ = _d.x * v.laneOffset;
        _tp.set(_p.x + perpX, 0, _p.z + perpZ);
        var yaw2 = Math.atan2(_d.x * v.dir, _d.z * v.dir);
        _q.setFromAxisAngle(_up, yaw2);
        _m4.compose(_tp, _q, _s);
        vehMesh.setMatrixAt(j, _m4);
      }
      vehMesh.instanceMatrix.needsUpdate = true;
    }
    if (trains.length > 0 && dt > 0) {
      for (var k = 0; k < trains.length; k++) {
        var tr = trains[k];
        tr.t += tr.speed * dt;
        samplePolyline(tr.rail.poly, tr.t, _p, _d);
        tr.mesh.position.set(_p.x, 5.5, _p.z);
        tr.mesh.rotation.y = Math.atan2(_d.x, _d.z);
      }
    }
    if (billboards.length > 0) {
      for (var b = 0; b < billboards.length; b++) {
        var bb = billboards[b];
        var bobY = Math.sin(elapsed * bb.bobSpeed + bb.bobPhase) * 2.5;
        bb.mesh.position.y = bb.baseY + bobY;
        if (S.environment && S.environment.camera) bb.mesh.lookAt(S.environment.camera.position);
      }
    }
    if (dataHighways.length > 0 && dt > 0) {
      for (var h = 0; h < dataHighways.length; h++) {
        var item = dataHighways[h];
        if (item.type === 'pulse') {
          item.t += item.speed * dt;
          if (item.t > 1) item.t -= 1;
          var x = item.ax + (item.bx - item.ax) * item.t;
          var z = item.az + (item.bz - item.az) * item.t;
          item.mesh.position.set(x, 22, z);
          item.mesh.material.opacity = Math.sin(item.t * Math.PI) * 0.95;
        } else if (item.type === 'line') {
          item.mesh.material.opacity = item.baseOpacity + Math.sin(elapsed * 0.8) * 0.06;
        }
      }
    }
    for (var sg = 0; sg < signalBandGroups.length; sg++) {
      signalBandGroups[sg].mat.opacity = 0.45 + Math.sin(elapsed * 1.2 + sg * 0.7) * 0.18;
    }
  }

  function attachToLoop() {
    if (S.scrollexperience && typeof S.scrollexperience.onProgress === 'function') {
      S.scrollexperience.onProgress(function (progress, actIndex, dt, elapsed) { animate(elapsed, dt); });
    } else setTimeout(attachToLoop, 60);
  }

  /* ============================================================
     RUN
     ============================================================ */
  var scene_group = new THREE.Group();
  scene_group.name = 'santinopole-buildings';

  // Split lots by LOD
  var nearLots = [], instancedLots = [];
  for (var li2 = 0; li2 < S.city.lots.length; li2++) {
    var l = S.city.lots[li2];
    if (l.lod === 0) nearLots.push(l);
    else instancedLots.push(l);
  }

  buildRoads();
  buildNearLots(nearLots);
  buildLandmarks();
  buildPublicSpaces();
  buildPedestrians();
  buildVehicles();
  buildTransit();
  flushBatches(scene_group);
  buildInstancedCity(instancedLots);

  if (pedMesh) scene_group.add(pedMesh);
  if (vehMesh) scene_group.add(vehMesh);
  for (var ti2 = 0; ti2 < trains.length; ti2++) scene_group.add(trains[ti2].mesh);
  for (var bi2 = 0; bi2 < billboards.length; bi2++) scene_group.add(billboards[bi2].mesh);
  for (var hi2 = 0; hi2 < dataHighways.length; hi2++) scene_group.add(dataHighways[hi2].mesh);
  for (var sgi2 = 0; sgi2 < signalBandGroups.length; sgi2++) scene_group.add(signalBandGroups[sgi2].mesh);

  attachToLoop();

  S.buildings = {
    group: scene_group,
    materials: MATS,
    facadeMaterials: FACADE_MATS,
    animate: animate,
    setNight: function (factor) {
      // Daytime — windows off. This function kept for interface compatibility.
    },
    count: (function () {
      var c = 0;
      scene_group.traverse(function (o) { if (o.isMesh) c++; });
      return c;
    })(),
    living: {
      pedestrians: pedData.length,
      vehicles: vehData.length,
      trains: trains.length,
      billboards: billboards.length,
      highways: dataHighways.length,
      signalBandGroups: signalBandGroups.length,
      nearLots: nearLots.length,
      instancedLots: instancedLots.length
    }
  };

  S.log('buildings', true,
    nearLots.length + ' detailed · ' +
    instancedLots.length + ' instanced · ' +
    S.buildings.count + ' meshes');
  S.log('district identity', true,
    billboards.length + ' billboards · ' +
    dataHighways.length + ' highways · ' +
    signalBandGroups.length + ' signal bands');

})();
