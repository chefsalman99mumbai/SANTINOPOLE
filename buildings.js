/* ============================================================
   SANTINOPOLE — buildings.js — MILAN EDITION
   Terracotta roofs. Shutters. Balconies. Storefronts. Real cars.
   No neon. No billboards. No glow.
   ============================================================ */

(function () {
  'use strict';

  var S = window.SANTINOPOLE;
  var THREE = window.THREE;
  if (!S || !S.city || !S.performance || !THREE) {
    console.error('[buildings.js] dependencies missing.');
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
  var RNG = mulberry32(918273);

  var TEX = Math.max(64, Q.textureSize);
  var TEXH = Math.floor(TEX * 1.4);

  function cvs(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(c, rx, ry) {
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rx !== undefined) t.repeat.set(rx, ry === undefined ? rx : ry);
    t.anisotropy = Q.anisotropy;
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }

  /* Milanese facade texture:
     - base: cream / ochre / pale yellow
     - rows of windows with GREEN SHUTTERS
     - subtle plaster striations
  */
  function makeMilanFacade(base, shutter, trim, windows) {
    var W = TEX, H = TEXH;
    var c = cvs(W, H), g = c.getContext('2d');
    // plaster base
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    // subtle noise striations
    for (var i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(255,255,255,' + (RNG() * 0.03) + ')';
      g.fillRect(0, RNG() * H, W, 1);
    }
    // cornice band at top
    g.fillStyle = trim; g.fillRect(0, 0, W, 3);
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, 4, W, 1);
    // windows with green shutters
    var cols = windows ? windows[0] : 3;
    var rows = windows ? windows[1] : 3;
    var pw = W / cols, ph = H / rows;
    var ww = pw * 0.42, wh = ph * 0.58;
    for (var ry = 0; ry < rows; ry++) {
      for (var rx = 0; rx < cols; rx++) {
        var wx = rx*pw + (pw-ww)/2;
        var wy = ry*ph + (ph-wh)/2;
        // shutters left+right (green wood)
        g.fillStyle = shutter;
        g.fillRect(wx - ww*0.42, wy, ww*0.4, wh);
        g.fillRect(wx + ww,     wy, ww*0.4, wh);
        // shutter slats (darker lines)
        g.fillStyle = 'rgba(0,0,0,0.15)';
        for (var s = 1; s < 6; s++) {
          g.fillRect(wx - ww*0.42, wy + (wh/6)*s, ww*0.4, 1);
          g.fillRect(wx + ww,     wy + (wh/6)*s, ww*0.4, 1);
        }
        // window glass
        var gg = g.createLinearGradient(wx, wy, wx, wy+wh);
        gg.addColorStop(0, '#4a5a6a');
        gg.addColorStop(1, '#1a2430');
        g.fillStyle = gg;
        g.fillRect(wx, wy, ww, wh);
        // window sill
        g.fillStyle = trim;
        g.fillRect(wx - 2, wy + wh, ww + 4, 3);
      }
    }
    return tex(c);
  }

  var FACADE_SETS = [
    { base:'#e8d8b0', shutter:'#3d5a3a', trim:'#c8b088' }, // cream + green shutter
    { base:'#e0cfa4', shutter:'#4a4a3a', trim:'#b89870' }, // ochre + dark
    { base:'#f0e4c0', shutter:'#5a4a32', trim:'#c8b088' }, // pale yellow
    { base:'#dcc9a0', shutter:'#2a3d2a', trim:'#a88860' }, // warm terracotta
    { base:'#e6d4ac', shutter:'#3d4a5a', trim:'#b8a078' }, // cream + blue
    { base:'#f2e6c8', shutter:'#4a3a2a', trim:'#c8b890' }  // very pale
  ];

  var FACADES = FACADE_SETS.map(function (s) {
    return makeMilanFacade(s.base, s.shutter, s.trim, [3, 3]);
  });
  var FACADES_TALL = FACADE_SETS.map(function (s) {
    return makeMilanFacade(s.base, s.shutter, s.trim, [4, 5]);
  });

  function facadeMat(idx, tall) {
    var t = tall ? FACADES_TALL[idx % FACADES_TALL.length] : FACADES[idx % FACADES.length];
    return new THREE.MeshStandardMaterial({ map: t.clone(), roughness: 0.92, metalness: 0.02 });
  }

  // Terracotta tile texture for roofs
  function makeRoofTex() {
    var S0 = Math.max(64, TEX);
    var c = cvs(S0, S0), g = c.getContext('2d');
    g.fillStyle = '#b05a32'; g.fillRect(0, 0, S0, S0);
    var rows = 8, cols = 8;
    for (var r = 0; r < rows; r++) {
      for (var k = 0; k < cols; k++) {
        var cx = (k + (r%2)*0.5) * (S0/cols);
        var cy = r * (S0/rows);
        var w = S0/cols * 0.9, h = S0/rows * 0.9;
        var shade = 0.85 + RNG() * 0.25;
        g.fillStyle = 'rgb(' + Math.floor(176*shade) + ',' + Math.floor(96*shade) + ',' + Math.floor(52*shade) + ')';
        g.beginPath();
        g.ellipse(cx, cy + h/2, w*0.5, h*0.5, 0, 0, Math.PI*2);
        g.fill();
      }
    }
    return tex(c, 2, 2);
  }
  var ROOF_TEX = makeRoofTex();
  var ROOF_MAT = new THREE.MeshStandardMaterial({ map: ROOF_TEX, color: 0xb86848, roughness: 0.88 });
  var ROOF_DARK = new THREE.MeshStandardMaterial({ color: 0x8a4a32, roughness: 0.9 });

  // Ground / sidewalk / plaza
  function makeCobbleTex() {
    var S0 = Math.max(64, TEX);
    var c = cvs(S0, S0), g = c.getContext('2d');
    g.fillStyle = '#b8ac94'; g.fillRect(0, 0, S0, S0);
    var rows = 6, cell = S0/rows;
    for (var r = 0; r < rows; r++) {
      var off = (r%2) * cell * 0.5;
      for (var i = -1; i < rows+1; i++) {
        var l = 0.7 + RNG() * 0.25;
        g.fillStyle = 'rgb(' + Math.floor(200*l) + ',' + Math.floor(180*l) + ',' + Math.floor(156*l) + ')';
        g.fillRect(i*cell + off + 0.5, r*cell + 0.5, cell - 1, cell - 1);
      }
    }
    return tex(c, 4, 4);
  }
  var COBBLE = makeCobbleTex();

  var MATS = {
    asphalt: new THREE.MeshStandardMaterial({ color: 0x5a5248, roughness: 0.95 }),
    sidewalk: new THREE.MeshStandardMaterial({ map: COBBLE, color: 0xd8ccb4, roughness: 0.9 }),
    marble: new THREE.MeshStandardMaterial({ color: 0xf0e8d8, roughness: 0.4 }),
    lawn: new THREE.MeshStandardMaterial({ color: 0x6a9050, roughness: 0.95 }),
    stone: new THREE.MeshStandardMaterial({ color: 0xd8c8a8, roughness: 0.85 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.45, metalness: 0.7 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.55, metalness: 0.6 }),
    // storefronts
    awning_green: new THREE.MeshStandardMaterial({ color: 0x1f3d2a, roughness: 0.85 }),
    awning_burg:  new THREE.MeshStandardMaterial({ color: 0x5a1a20, roughness: 0.85 }),
    awning_navy:  new THREE.MeshStandardMaterial({ color: 0x1a2a44, roughness: 0.85 }),
    glass_store:  new THREE.MeshStandardMaterial({ color: 0x2a3844, roughness: 0.15, metalness: 0.4 }),
    // cars
    car_red:     new THREE.MeshStandardMaterial({ color: 0xb01a1a, roughness: 0.28, metalness: 0.65 }),
    car_black:   new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.24, metalness: 0.75 }),
    car_silver:  new THREE.MeshStandardMaterial({ color: 0xbcc0c4, roughness: 0.28, metalness: 0.72 }),
    car_champ:   new THREE.MeshStandardMaterial({ color: 0xd4c090, roughness: 0.28, metalness: 0.72 }),
    car_white:   new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.35, metalness: 0.55 }),
    car_blue:    new THREE.MeshStandardMaterial({ color: 0x1a2a5a, roughness: 0.28, metalness: 0.68 }),
    car_glass:   new THREE.MeshStandardMaterial({ color: 0x1a1f28, roughness: 0.08, metalness: 0.5 }),
    tire:        new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.9 })
  };

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
       hw,0,-hd, -hw,0,-hd, -hw,rh,0, hw,0,-hd, -hw,rh,0, hw,rh,0
    ];
    var uv = []; for (var i = 0; i < pos.length/3; i++) uv.push(pos[i*3]/3, pos[i*3+2]/3);
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }
  function hipRoof(w, d, rh, ridgeFrac) {
    var hw = w/2, hd = d/2;
    var rx = hw * (ridgeFrac || 0.4);
    var pos = [
      // front slope
      -hw,0,hd,  hw,0,hd,  rx,rh,0,  -hw,0,hd,  rx,rh,0,  -rx,rh,0,
      // back slope
       hw,0,-hd, -hw,0,-hd, -rx,rh,0, hw,0,-hd,  -rx,rh,0,  rx,rh,0,
      // left slope
      -hw,0,-hd, -hw,0,hd, -rx,rh,0,
      // right slope
       hw,0,hd,  hw,0,-hd,  rx,rh,0
    ];
    var uv = []; for (var i = 0; i < pos.length/3; i++) uv.push(pos[i*3]/3, pos[i*3+2]/3);
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
  function push(mat, geo) {
    var arr = BATCH.get(mat);
    if (!arr) { arr = []; BATCH.set(mat, arr); }
    arr.push(geo);
  }
  function flush(parent) {
    BATCH.forEach(function (arr, mat) {
      if (!arr.length) return;
      var m = null;
      try { m = mergeGeoms(arr); } catch (e) { m = null; }
      if (!m) { for (var i = 0; i < arr.length; i++) parent.add(new THREE.Mesh(arr[i], mat)); }
      else {
        m.computeBoundingSphere(); m.computeBoundingBox();
        parent.add(new THREE.Mesh(m, mat));
      }
    });
    BATCH.clear();
  }

  function ribbon(points, width, y) {
    if (points.length < 2) return null;
    var verts = [], idx = [], uvs = [], hw = width/2;
    for (var i = 0; i < points.length; i++) {
      var px = points[i][0], pz = points[i][1];
      var nx, nz;
      if (i === 0) { nx = points[1][0]-px; nz = points[1][1]-pz; }
      else if (i === points.length-1) { nx = px-points[i-1][0]; nz = pz-points[i-1][1]; }
      else { nx = points[i+1][0]-points[i-1][0]; nz = points[i+1][1]-points[i-1][1]; }
      var len = Math.sqrt(nx*nx+nz*nz) || 1;
      nx /= len; nz /= len;
      var pxn = -nz, pzn = nx;
      verts.push(px + pxn*hw, y, pz + pzn*hw);
      verts.push(px - pxn*hw, y, pz - pzn*hw);
      uvs.push(0, i*0.5, 1, i*0.5);
    }
    for (var s = 0; s < points.length-1; s++) {
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
    for (var i = 0; i < S.city.streets.length; i++) {
      var st = S.city.streets[i];
      var r = ribbon(st.points, st.width, 0.15);
      if (r) push(MATS.asphalt, r);
      var w = ribbon(st.points, st.width + 4.5, 0.30);
      if (w) push(MATS.sidewalk, w);
    }
  }

  /* ============================================================
     MILAN BUILDING — base + facade + roof + shutters + balcony + storefront
     ============================================================ */

  function buildMilanBuilding(lot) {
    var w = lot.w, d = lot.d, h = lot.h;
    var w4 = new THREE.Matrix4().makeRotationY(lot.rot).setPosition(lot.x, 0, lot.z);
    var fIdx = Math.floor(RNG() * FACADES.length);

    // Height profile — Milan is 5–8 stories, fairly uniform
    var stories = 5 + Math.floor(RNG() * 3);
    var storyH = 3.4;
    var bodyH = stories * storyH;
    if (bodyH > h) h = bodyH;
    if (h < 18) h = 18;

    // Ground floor (storefront level) = 4.5m, then body
    var gfH = 4.5;
    var upperH = h - gfH;

    // -- Ground floor (storefront) --
    push(MATS.stone, boxUV(w, gfH, d, 4, 3).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gfH/2, 0))));

    // -- Upper mass with facade texture --
    var fm = facadeMat(fIdx, true);
    push(fm, boxUV(w, upperH, d, 4, 3.4).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gfH + upperH/2, 0))));

    // -- Cornice (white stone band under roof) --
    push(MATS.stone, new THREE.BoxGeometry(w + 1.2, 0.9, d + 1.2).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h + 0.45, 0))));

    // -- Terracotta roof (hip, low pitch — very Milanese) --
    var roofH = Math.min(w, d) * 0.28 + 1.4;
    push(ROOF_MAT, hipRoof(w + 1.6, d + 1.6, roofH, 0.35).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h + 0.9, 0))));

    // -- Storefront: awning + glass display --
    // Awning (dark green / burgundy / navy)
    var awnMats = [MATS.awning_green, MATS.awning_burg, MATS.awning_navy];
    var awM = awnMats[Math.floor(RNG() * awnMats.length)];
    var awW = w * 0.92, awD = d * 0.92;
    // Awnings on all 4 faces (thin slab tilted)
    var awn = new THREE.BoxGeometry(awW, 0.15, 1.6);
    for (var s = 0; s < 4; s++) {
      var rot = s * Math.PI / 2;
      var ax = Math.sin(rot) * (d/2 + 0.7);
      var az = Math.cos(rot) * (d/2 + 0.7);
      push(awM, awn.clone()
        .applyMatrix4(new THREE.Matrix4().makeRotationX(-0.35))
        .applyMatrix4(new THREE.Matrix4().makeRotationY(rot))
        .applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gfH - 0.6, 0))));
    }
    // Glass display window (dark) at ground level
    var storeGlass = new THREE.BoxGeometry(w * 0.94, gfH * 0.7, d * 0.94);
    push(MATS.glass_store, storeGlass.applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gfH * 0.5, 0))));

    // -- Balconies (only for LOD 0 with big enough buildings) --
    if (w > 18 && d > 14) {
      var balconyMat = MATS.stone;
      var railMat = MATS.iron;
      var numB = 2 + Math.floor(RNG() * 2);
      for (var b = 0; b < numB; b++) {
        var by = gfH + (b + 1) * storyH - 0.6;
        if (by > h - 2) break;
        // Balcony on front face (facing +Z of local)
        var bw = w * 0.35, bd = 1.4;
        push(balconyMat, new THREE.BoxGeometry(bw, 0.18, bd).applyMatrix4(
          w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, by, d/2 + bd/2))));
        // Iron railing
        push(railMat, new THREE.BoxGeometry(bw, 0.75, 0.05).applyMatrix4(
          w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, by + 0.4, d/2 + bd))));
        push(railMat, new THREE.BoxGeometry(0.05, 0.75, bd).applyMatrix4(
          w4.clone().multiply(new THREE.Matrix4().makeTranslation(-bw/2, by + 0.4, d/2 + bd/2))));
        push(railMat, new THREE.BoxGeometry(0.05, 0.75, bd).applyMatrix4(
          w4.clone().multiply(new THREE.Matrix4().makeTranslation( bw/2, by + 0.4, d/2 + bd/2))));
      }
    }
  }

  // Modern tower with planted terraces (Bosco Verticale inspired)
  function buildModernTower(lot) {
    var w = lot.w, d = lot.d, h = lot.h;
    var w4 = new THREE.Matrix4().makeRotationY(lot.rot).setPosition(lot.x, 0, lot.z);
    if (h < 40) h = 40;
    // concrete core
    push(new THREE.MeshStandardMaterial({ color: 0xc8c0b0, roughness: 0.75 }), boxUV(w, h, d, 4, 4).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h/2, 0))));
    // glass bands + planted terraces
    var levels = Math.floor(h / 4);
    for (var l = 1; l < levels; l++) {
      var ly = l * 4;
      // Balcony slab (canti-levered)
      push(MATS.stone, new THREE.BoxGeometry(w + 2.2, 0.25, d + 2.2).applyMatrix4(
        w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, ly, 0))));
      // greenery — instanced small bushes on the terrace
      var plantMat = new THREE.MeshStandardMaterial({ color: 0x3a5a2a, roughness: 0.95 });
      var numPlants = 4;
      for (var p = 0; p < numPlants; p++) {
        var px = (RNG() - 0.5) * w * 0.8;
        var pz = (RNG() < 0.5 ? 1 : -1) * (d/2 + 0.9);
        push(plantMat, new THREE.SphereGeometry(0.6 + RNG()*0.3, 6, 5).applyMatrix4(
          w4.clone().multiply(new THREE.Matrix4().makeTranslation(px, ly + 0.9, pz))));
      }
    }
    // roofline slab
    push(MATS.stone, new THREE.BoxGeometry(w + 2, 0.4, d + 2).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h + 0.2, 0))));
  }

  function buildLandmarkTower(lm) {
    var w = 20, d = 20, h = lm.h;
    var w4 = new THREE.Matrix4().makeRotationY(0).setPosition(lm.x, 0, lm.z);
    var fm = facadeMat(0, true);
    push(fm, boxUV(w, h, d, 4, 4).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h/2, 0))));
    push(MATS.stone, new THREE.BoxGeometry(w + 2, 1, d + 2).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h + 0.5, 0))));
    var roofH = 6;
    push(ROOF_MAT, hipRoof(w + 2, d + 2, roofH, 0.3).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h + 1, 0))));
  }

  function buildCivicDome(lm) {
    var w = 40, d = 40, bodyH = lm.h * 0.6;
    var w4 = new THREE.Matrix4().makeRotationY(0).setPosition(lm.x, 0, lm.z);
    push(MATS.marble, new THREE.BoxGeometry(w + 6, 1, d + 6).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.5, 0))));
    push(facadeMat(2, true), boxUV(w, bodyH, d, 4, 3.5).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, bodyH/2 + 1, 0))));
    push(MATS.stone, new THREE.BoxGeometry(w + 2, 1.2, d + 2).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, bodyH + 1.6, 0))));
    push(MATS.marble, new THREE.CylinderGeometry(9, 9.4, 6, 16).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, bodyH + 5.4, 0))));
    // Terracotta dome
    push(ROOF_MAT, new THREE.SphereGeometry(9.4, 20, 12, 0, Math.PI*2, 0, Math.PI*0.55).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, bodyH + 8.4, 0))));
    push(MATS.metal, new THREE.ConeGeometry(0.6, 5, 6).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, bodyH + 20, 0))));
  }

  function buildPavilionLandmark(lm) {
    var w = 22, d = 20, h = lm.h;
    var w4 = new THREE.Matrix4().makeRotationY(0).setPosition(lm.x, 0, lm.z);
    push(MATS.marble, new THREE.BoxGeometry(w + 6, 0.8, d + 6).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.4, 0))));
    push(facadeMat(2, false), boxUV(w, h, d, 4, 3).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h/2 + 0.8, 0))));
    push(MATS.stone, new THREE.BoxGeometry(w + 2, 0.8, d + 2).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h + 1.2, 0))));
    push(ROOF_MAT, hipRoof(w + 2, d + 2, 4, 0.3).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h + 1.6, 0))));
  }

  function buildSpire(lm) {
    var w = 16, d = 16, h = lm.h;
    var w4 = new THREE.Matrix4().makeRotationY(0).setPosition(lm.x, 0, lm.z);
    push(MATS.stone, new THREE.BoxGeometry(w * 1.6, 10, d * 1.6).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, 5, 0))));
    push(facadeMat(0, true), boxUV(w, h - 10, d, 4, 4).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, 10 + (h - 10)/2, 0))));
    // crown of small spires (like Duomo)
    for (var s = 0; s < 8; s++) {
      var a = (s/8) * Math.PI * 2;
      var sx = Math.cos(a) * 6;
      var sz = Math.sin(a) * 6;
      push(MATS.stone, new THREE.ConeGeometry(1.2, 12, 4).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(sx, h + 6, sz))));
    }
    push(MATS.metal, new THREE.ConeGeometry(1.5, 18, 6).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h + 9, 0))));
  }

  /* ============================================================
     CARS — real luxury silhouettes (hood, cabin, trunk, wheels)
     ============================================================ */

  var CAR_MATS = [MATS.car_red, MATS.car_black, MATS.car_silver, MATS.car_champ, MATS.car_white, MATS.car_blue];

  // One car archetype: sedan. Whole thing merged into a single geometry per color.
  function buildCarGeometry() {
    var geos = [];
    // lower body (long)
    var body = new THREE.BoxGeometry(1.85, 0.55, 4.4);
    body.translate(0, 0.55, 0);
    geos.push(body);
    // hood (front)
    var hood = new THREE.BoxGeometry(1.7, 0.35, 1.4);
    hood.translate(0, 0.85, 1.3);
    geos.push(hood);
    // cabin (shorter, set back)
    var cabin = new THREE.BoxGeometry(1.65, 0.55, 1.9);
    cabin.translate(0, 1.15, -0.2);
    geos.push(cabin);
    // trunk
    var trunk = new THREE.BoxGeometry(1.7, 0.4, 1.1);
    trunk.translate(0, 0.85, -1.6);
    geos.push(trunk);
    return geos;
  }

  function buildCarGlassGeometry() {
    var geos = [];
    // windshield
    var ws = new THREE.BoxGeometry(1.5, 0.4, 0.15);
    ws.translate(0, 1.15, 0.75);
    geos.push(ws);
    // rear window
    var rw = new THREE.BoxGeometry(1.5, 0.4, 0.15);
    rw.translate(0, 1.15, -1.15);
    geos.push(rw);
    return geos;
  }

  function buildWheelGeometry() {
    var wheels = [];
    var wGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 8);
    wGeo.rotateZ(Math.PI/2);
    var positions = [
      [-0.9, 0.38, 1.4], [0.9, 0.38, 1.4],
      [-0.9, 0.38, -1.5], [0.9, 0.38, -1.5]
    ];
    for (var i = 0; i < positions.length; i++) {
      var w = wGeo.clone();
      w.translate(positions[i][0], positions[i][1], positions[i][2]);
      wheels.push(w);
    }
    return wheels;
  }

  var CAR_BODY = mergeGeoms(buildCarGeometry());
  var CAR_GLASS = mergeGeoms(buildCarGlassGeometry());
  var CAR_WHEELS = mergeGeoms(buildWheelGeometry());

  /* ============================================================
     HUMANS — torso + head + arms + legs (rigged billboard-ish)
     ============================================================ */

  function buildHumanGeometry() {
    var geos = [];
    // torso
    var torso = new THREE.BoxGeometry(0.34, 0.6, 0.22);
    torso.translate(0, 1.1, 0);
    geos.push(torso);
    // head
    var head = new THREE.SphereGeometry(0.14, 8, 6);
    head.translate(0, 1.55, 0);
    geos.push(head);
    // left arm
    var la = new THREE.BoxGeometry(0.08, 0.5, 0.08);
    la.translate(-0.22, 1.1, 0);
    geos.push(la);
    // right arm
    var ra = new THREE.BoxGeometry(0.08, 0.5, 0.08);
    ra.translate(0.22, 1.1, 0);
    geos.push(ra);
    // left leg
    var ll = new THREE.BoxGeometry(0.1, 0.6, 0.1);
    ll.translate(-0.09, 0.5, 0);
    geos.push(ll);
    // right leg
    var rl = new THREE.BoxGeometry(0.1, 0.6, 0.1);
    rl.translate(0.09, 0.5, 0);
    geos.push(rl);
    return geos;
  }
  var HUMAN_GEO = mergeGeoms(buildHumanGeometry());

  var HUMAN_MATS = [
    new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x8a3030, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.9 })
  ];

  /* ============================================================
     LIVING LAYER — pedestrians + cars on paths
     ============================================================ */

  function prepPoly(points) {
    var pts = [], cum = [0], total = 0;
    for (var i = 0; i < points.length; i++) pts.push(new THREE.Vector2(points[i][0], points[i][1]));
    for (var j = 1; j < pts.length; j++) {
      var dx = pts[j].x - pts[j-1].x, dy = pts[j].y - pts[j-1].y;
      total += Math.sqrt(dx*dx + dy*dy);
      cum.push(total);
    }
    return { pts: pts, cum: cum, total: total };
  }
  function samplePoly(poly, t, outPos, outDir) {
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

  var walkPaths = [], drivePaths = [];
  function prepPaths() {
    var s = S.city.streets;
    for (var i = 0; i < s.length; i++) {
      if (s[i].points.length < 2) continue;
      if (s[i].points.length > 200) continue;
      var poly = prepPoly(s[i].points);
      if (poly.total < 30) continue;
      walkPaths.push(poly);
      if (s[i].width >= 14 && poly.total > 60) drivePaths.push(poly);
    }
  }
  prepPaths();

  var pedInstances = [];
  var carInstances = [];
  var pedsPerMaterial = [[], [], [], [], []];
  var carsPerMaterial = [[], [], [], [], [], []];

  function createPedestrians() {
    var count = Q.pedestrians || 200;
    for (var i = 0; i < count; i++) {
      var path = walkPaths[Math.floor(RNG() * walkPaths.length)];
      if (!path) break;
      var matIdx = Math.floor(RNG() * HUMAN_MATS.length);
      pedsPerMaterial[matIdx].push({
        path: path,
        t: RNG() * path.total,
        speed: 1.1 + RNG() * 0.9,
        bobPhase: RNG() * Math.PI * 2
      });
    }
  }

  function createCars() {
    var count = Math.min(60, Q.vehicles || 40);
    for (var i = 0; i < count; i++) {
      var path = drivePaths[Math.floor(RNG() * drivePaths.length)];
      if (!path) break;
      var matIdx = Math.floor(RNG() * CAR_MATS.length);
      var dir = RNG() < 0.5 ? 1 : -1;
      carsPerMaterial[matIdx].push({
        path: path,
        t: RNG() * path.total,
        speed: 8 + RNG() * 8,
        dir: dir,
        laneOffset: dir * 3.4
      });
    }
  }

  function buildPedestrianMeshes() {
    for (var m = 0; m < HUMAN_MATS.length; m++) {
      var arr = pedsPerMaterial[m];
      if (!arr.length) continue;
      var mesh = new THREE.InstancedMesh(HUMAN_GEO, HUMAN_MATS[m], arr.length);
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      pedInstances.push({ mesh: mesh, data: arr, idx: 0 });
    }
  }

  function buildCarMeshes() {
    for (var m = 0; m < CAR_MATS.length; m++) {
      var arr = carsPerMaterial[m];
      if (!arr.length) continue;
      // body
      var bodyMesh = new THREE.InstancedMesh(CAR_BODY, CAR_MATS[m], arr.length);
      bodyMesh.frustumCulled = false;
      bodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // glass
      var glassMesh = new THREE.InstancedMesh(CAR_GLASS, MATS.car_glass, arr.length);
      glassMesh.frustumCulled = false;
      glassMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // wheels
      var wheelMesh = new THREE.InstancedMesh(CAR_WHEELS, MATS.tire, arr.length);
      wheelMesh.frustumCulled = false;
      wheelMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      carInstances.push({ body: bodyMesh, glass: glassMesh, wheels: wheelMesh, data: arr });
    }
  }

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
    // Pedestrians
    for (var pi = 0; pi < pedInstances.length; pi++) {
      var inst = pedInstances[pi];
      for (var i = 0; i < inst.data.length; i++) {
        var p = inst.data[i];
        p.t += p.speed * dt;
        samplePoly(p.path, p.t, _p, _d);
        var bob = Math.sin(elapsed * 7 + p.bobPhase) * 0.04;
        _tp.set(_p.x, bob, _p.z);
        var yaw = Math.atan2(_d.x, _d.z);
        _q.setFromAxisAngle(_up, yaw);
        _m4.compose(_tp, _q, _s);
        inst.mesh.setMatrixAt(i, _m4);
      }
      inst.mesh.instanceMatrix.needsUpdate = true;
    }

    // Cars
    for (var ci = 0; ci < carInstances.length; ci++) {
      var cinst = carInstances[ci];
      for (var j = 0; j < cinst.data.length; j++) {
        var v = cinst.data[j];
        v.t += v.speed * dt * v.dir;
        samplePoly(v.path, v.t, _p, _d);
        var perpX = -_d.z * v.laneOffset;
        var perpZ = _d.x * v.laneOffset;
        _tp.set(_p.x + perpX, 0, _p.z + perpZ);
        var yaw2 = Math.atan2(_d.x * v.dir, _d.z * v.dir);
        _q.setFromAxisAngle(_up, yaw2);
        _m4.compose(_tp, _q, _s);
        cinst.body.setMatrixAt(j, _m4);
        cinst.glass.setMatrixAt(j, _m4);
        cinst.wheels.setMatrixAt(j, _m4);
      }
      cinst.body.instanceMatrix.needsUpdate = true;
      cinst.glass.instanceMatrix.needsUpdate = true;
      cinst.wheels.instanceMatrix.needsUpdate = true;
    }
  }

  function attachToLoop() {
    if (S.scrollexperience && typeof S.scrollexperience.onProgress === 'function') {
      S.scrollexperience.onProgress(function (progress, actIndex, dt, elapsed) {
        animate(elapsed, dt);
      });
    } else setTimeout(attachToLoop, 60);
  }

  /* ============================================================
     RUN
     ============================================================ */
  var group = new THREE.Group();
  group.name = 'santinopole-city';

  buildRoads();

  // Split lots by LOD
  var nearLots = [], instancedLots = [];
  for (var i = 0; i < S.city.lots.length; i++) {
    var lot = S.city.lots[i];
    if (lot.lod === 0) nearLots.push(lot);
    else instancedLots.push(lot);
  }

  // Milan detail for near lots
  for (var ni = 0; ni < nearLots.length; ni++) buildMilanBuilding(nearLots[ni]);

  // Modern towers in web + fiera districts
  var modernZones = ['isola', 'citta', 'fiera'];
  for (var mi = 0; mi < nearLots.length; mi++) {
    var lot2 = nearLots[mi];
    if (modernZones.indexOf(lot2.districtId) !== -1 && lot2.h > 60) {
      buildModernTower(lot2);
    }
  }

  // Landmarks
  for (var li = 0; li < S.city.landmarks.length; li++) {
    var lm = S.city.landmarks[li];
    switch (lm.id) {
      case 'spire': buildSpire(lm); break;
      case 'cathedral':
      case 'exchange':
      case 'piazza': buildCivicDome(lm); break;
      case 'webhub':
      case 'glassworks':
      case 'observat':
      case 'index':
      case 'signal': buildLandmarkTower(lm); break;
      default: buildPavilionLandmark(lm);
    }
  }

  // Public spaces
  for (var pi2 = 0; pi2 < S.city.publicSpaces.length; pi2++) {
    var p = S.city.publicSpaces[pi2];
    if (p.kind === 'plaza') {
      var g = new THREE.CircleGeometry(p.radius, 32); g.rotateX(-Math.PI/2);
      push(MATS.marble, g.translate(p.x, 0.35, p.z));
    } else {
      var gg = new THREE.CircleGeometry(p.radius, 32); gg.rotateX(-Math.PI/2);
      push(MATS.lawn, gg.translate(p.x, 0.32, p.z));
    }
  }

  flush(group);

  // Instanced far city (no detail)
  var buckets = [[], [], [], []];
  for (var ii = 0; ii < instancedLots.length; ii++) {
    var l = instancedLots[ii];
    if (l.h < 25) buckets[0].push(l);
    else if (l.h < 55) buckets[1].push(l);
    else if (l.h < 95) buckets[2].push(l);
    else buckets[3].push(l);
  }
  var farMats = [
    new THREE.MeshLambertMaterial({ color: 0xd8c8a8 }),
    new THREE.MeshLambertMaterial({ color: 0xc8b898 }),
    new THREE.MeshLambertMaterial({ color: 0xbaa888 }),
    new THREE.MeshLambertMaterial({ color: 0xa89878 })
  ];
  var baseGeo = new THREE.BoxGeometry(1, 1, 1);
  baseGeo.translate(0, 0.5, 0);
  var dummy = new THREE.Object3D();
  for (var bi = 0; bi < buckets.length; bi++) {
    var b = buckets[bi];
    if (!b.length) continue;
    var mesh = new THREE.InstancedMesh(baseGeo, farMats[bi], b.length);
    mesh.frustumCulled = false;
    for (var k = 0; k < b.length; k++) {
      var lot3 = b[k];
      dummy.position.set(lot3.x, 0, lot3.z);
      dummy.rotation.set(0, lot3.rot || 0, 0);
      dummy.scale.set(lot3.w, lot3.h, lot3.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }

  // Living layer
  createPedestrians();
  createCars();
  buildPedestrianMeshes();
  buildCarMeshes();
  for (var pi3 = 0; pi3 < pedInstances.length; pi3++) group.add(pedInstances[pi3].mesh);
  for (var ci2 = 0; ci2 < carInstances.length; ci2++) {
    group.add(carInstances[ci2].body);
    group.add(carInstances[ci2].glass);
    group.add(carInstances[ci2].wheels);
  }

  attachToLoop();

  S.buildings = {
    group: group,
    materials: MATS,
    animate: animate,
    setNight: function () {},
    count: (function () {
      var c = 0;
      group.traverse(function (o) { if (o.isMesh) c++; });
      return c;
    })(),
    living: {
      pedestrians: pedsPerMaterial.reduce(function (a, b) { return a + b.length; }, 0),
      cars: carsPerMaterial.reduce(function (a, b) { return a + b.length; }, 0)
    }
  };

  S.log('buildings', true,
    nearLots.length + ' detailed · ' +
    instancedLots.length + ' far · ' +
    S.buildings.count + ' meshes');
  S.log('life', true,
    S.buildings.living.pedestrians + ' pedestrians · ' +
    S.buildings.living.cars + ' cars');

})();
