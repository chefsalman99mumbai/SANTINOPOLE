/* ============================================================
   SANTINOPOLE — buildings.js — FINAL EUROPEAN CITY
   Terracotta roofs. Shutters. Balconies with plants. Trees.
   Street lamps. Benches. Café awnings with signage.
   ============================================================ */

(function () {
  'use strict';
  var S = window.SANTINOPOLE;
  var THREE = window.THREE;
  if (!S || !S.city || !S.performance || !THREE) { console.error('deps'); return; }
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

  var TS = Math.max(128, Q.textureSize * 2);
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

  /* ---------- FACADE TEXTURES ---------- */
  function makeFacade(base, shutter, trim, plaster, cols, rows) {
    var W = TS, H = Math.floor(TS * 1.3);
    var c = cvs(W, H), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    // plaster noise
    for (var n = 0; n < 120; n++) {
      g.fillStyle = 'rgba(' + (RNG() > 0.5 ? '255,255,255' : '0,0,0') + ',' + (RNG() * 0.025) + ')';
      g.fillRect(RNG() * W, RNG() * H, 1 + RNG() * 3, 1 + RNG() * 2);
    }
    // thin horizontal plaster lines
    for (var hl = 0; hl < H; hl += 6 + Math.floor(RNG() * 8)) {
      g.fillStyle = 'rgba(0,0,0,0.03)';
      g.fillRect(0, hl, W, 1);
    }
    // cornice
    g.fillStyle = trim;
    g.fillRect(0, 0, W, 4);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, 5, W, 1);
    // windows
    var pw = W / cols, ph = H / rows;
    var ww = pw * 0.4, wh = ph * 0.55;
    for (var ry = 0; ry < rows; ry++) {
      for (var rx = 0; rx < cols; rx++) {
        var wx = rx * pw + (pw - ww) / 2;
        var wy = ry * ph + (ph - wh) / 2 + 3;
        // window frame
        g.fillStyle = trim;
        g.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
        // shutters left / right (green)
        g.fillStyle = shutter;
        g.fillRect(wx - ww * 0.45, wy, ww * 0.42, wh);
        g.fillRect(wx + ww * 1.03, wy, ww * 0.42, wh);
        // shutter slats
        g.fillStyle = 'rgba(0,0,0,0.18)';
        for (var sl = 1; sl < 7; sl++) {
          g.fillRect(wx - ww * 0.45, wy + sl * (wh / 7), ww * 0.42, 1);
          g.fillRect(wx + ww * 1.03, wy + sl * (wh / 7), ww * 0.42, 1);
        }
        // glass
        var gg = g.createLinearGradient(wx, wy, wx, wy + wh);
        gg.addColorStop(0, '#5a6878');
        gg.addColorStop(0.5, '#384250');
        gg.addColorStop(1, '#1a2030');
        g.fillStyle = gg;
        g.fillRect(wx, wy, ww, wh);
        // window reflection
        g.fillStyle = 'rgba(220,230,240,0.14)';
        g.beginPath();
        g.moveTo(wx, wy);
        g.lineTo(wx + ww * 0.5, wy);
        g.lineTo(wx, wy + wh * 0.6);
        g.closePath();
        g.fill();
        // sill
        g.fillStyle = trim;
        g.fillRect(wx - 3, wy + wh + 1, ww + 6, 2);
      }
    }
    return tex(c);
  }

  var FACADE_SPECS = [
    { base:'#ecd9b0', shutter:'#3d5a3a', trim:'#e0d0a8' }, // cream + green
    { base:'#e2cc a0', shutter:'#4a3a2a', trim:'#c8b088' }, // ochre + brown
    { base:'#f2e4c0', shutter:'#5a3a30', trim:'#e8d8b0' }, // pale yellow + dark red
    { base:'#dcc8a0', shutter:'#2a3d2a', trim:'#c8b088' }, // warm tan + dark green
    { base:'#e8d4ac', shutter:'#3d4a5a', trim:'#d0b888' }, // cream + slate
    { base:'#f0e0bc', shutter:'#4a3a2a', trim:'#e0ccA0' }  // cream + wood
  ];

  var FACADES_TALL = FACADE_SPECS.map(function (s) { return makeFacade(s.base, s.shutter, s.trim, null, 4, 5); });
  var FACADES_SHORT = FACADE_SPECS.map(function (s) { return makeFacade(s.base, s.shutter, s.trim, null, 3, 3); });
  var FACADES_WIDE = FACADE_SPECS.map(function (s) { return makeFacade(s.base, s.shutter, s.trim, null, 5, 4); });

  function facadeMat(idx, shape) {
    var list = shape === 'tall' ? FACADES_TALL : (shape === 'wide' ? FACADES_WIDE : FACADES_SHORT);
    var t = list[idx % list.length];
    return new THREE.MeshStandardMaterial({
      map: t, roughness: 0.92, metalness: 0.02
    });
  }

  /* ---------- TERRACOTTA ROOF TILE TEXTURE ---------- */
  function makeRoofTex() {
    var W = 256, H = 256;
    var c = cvs(W, H), g = c.getContext('2d');
    g.fillStyle = '#8a3a20'; g.fillRect(0, 0, W, H);
    var cols = 10, rows = 12;
    var cw = W / cols, ch = H / rows;
    for (var r = 0; r < rows; r++) {
      for (var k = 0; k < cols; k++) {
        var cx = k * cw + (r % 2) * cw * 0.5;
        var cy = r * ch;
        // tile color variation
        var shade = 0.75 + RNG() * 0.35;
        var rCol = Math.floor(178 * shade);
        var gCol = Math.floor(92 * shade);
        var bCol = Math.floor(52 * shade);
        g.fillStyle = 'rgb(' + rCol + ',' + gCol + ',' + bCol + ')';
        g.beginPath();
        g.ellipse(cx + cw * 0.5, cy + ch * 0.5, cw * 0.52, ch * 0.55, 0, 0, Math.PI * 2);
        g.fill();
        // shadow
        g.strokeStyle = 'rgba(0,0,0,0.25)';
        g.lineWidth = 1;
        g.stroke();
      }
    }
    // overall darkening at bottom (ridge shadow)
    var gd = g.createLinearGradient(0, 0, 0, H);
    gd.addColorStop(0, 'rgba(0,0,0,0.05)');
    gd.addColorStop(1, 'rgba(0,0,0,0.28)');
    g.fillStyle = gd;
    g.fillRect(0, 0, W, H);
    return tex(c, 2, 2);
  }
  var ROOF_TEX = makeRoofTex();
  var ROOF_MAT = new THREE.MeshStandardMaterial({ map: ROOF_TEX, color: 0xa85238, roughness: 0.88 });

  /* ---------- COBBLE TEXTURE ---------- */
  function makeCobbleTex() {
    var W = 256, H = 256;
    var c = cvs(W, H), g = c.getContext('2d');
    g.fillStyle = '#7a6a56'; g.fillRect(0, 0, W, H);
    var rows = 8, cell = W / rows;
    for (var r = 0; r < rows; r++) {
      var off = (r % 2) * cell * 0.5;
      for (var i = -1; i < rows + 1; i++) {
        var l = 0.7 + RNG() * 0.35;
        g.fillStyle = 'rgb(' + Math.floor(180*l) + ',' + Math.floor(160*l) + ',' + Math.floor(132*l) + ')';
        g.beginPath();
        g.arc(i*cell + off + cell*0.5, r*cell + cell*0.5, cell*0.42, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.15)';
        g.stroke();
      }
    }
    return tex(c, 5, 5);
  }
  var COBBLE = makeCobbleTex();

  /* ---------- STOREFRONT SIGN CANVAS ---------- */
  var SHOP_SIGNS = ['CAFÉ', 'TRATTORIA', 'BOUTIQUE', 'LIBRERIA', 'FORNO', 'GELATERIA', 'ENOTECA', 'PASTICCERIA', 'FLORIST', 'TABACCHI'];
  function makeSignCanvas(text, bg) {
    var W = 512, H = 96;
    var c = cvs(W, H), g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3;
    g.strokeRect(6, 6, W - 12, H - 12);
    g.fillStyle = '#f0e4c0';
    g.font = 'bold 48px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, W / 2, H / 2 + 2);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /* ---------- MATERIALS ---------- */
  var MATS = {
    asphalt: new THREE.MeshStandardMaterial({ color: 0x4a4438, roughness: 0.96 }),
    sidewalk: new THREE.MeshStandardMaterial({ map: COBBLE, color: 0xcec0a8, roughness: 0.9 }),
    stone: new THREE.MeshStandardMaterial({ color: 0xd4c4a4, roughness: 0.85 }),
    marble: new THREE.MeshStandardMaterial({ color: 0xf0e8d4, roughness: 0.4 }),
    lawn: new THREE.MeshStandardMaterial({ color: 0x5a7a48, roughness: 0.95 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: 0.45, metalness: 0.75 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: 0.55, metalness: 0.7 }),
    // awnings
    awning_green: new THREE.MeshStandardMaterial({ color: 0x1f4a2a, roughness: 0.88 }),
    awning_burg:  new THREE.MeshStandardMaterial({ color: 0x5a1a24, roughness: 0.88 }),
    awning_navy:  new THREE.MeshStandardMaterial({ color: 0x1a2a48, roughness: 0.88 }),
    // trees
    trunk: new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.95 }),
    foliage_a: new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.95 }),
    foliage_b: new THREE.MeshStandardMaterial({ color: 0x4a7a38, roughness: 0.95 }),
    foliage_c: new THREE.MeshStandardMaterial({ color: 0x587a32, roughness: 0.95 }),
    // chimney
    chimney: new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 0.9 }),
    // glass store
    glass_store: new THREE.MeshStandardMaterial({ color: 0x2a3644, roughness: 0.15, metalness: 0.5 }),
    // cars
    car_red:    new THREE.MeshStandardMaterial({ color: 0xa81a1a, roughness: 0.24, metalness: 0.72 }),
    car_black:  new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.20, metalness: 0.82 }),
    car_silver: new THREE.MeshStandardMaterial({ color: 0xbcbfc4, roughness: 0.24, metalness: 0.78 }),
    car_champ:  new THREE.MeshStandardMaterial({ color: 0xd0b884, roughness: 0.24, metalness: 0.76 }),
    car_white:  new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.32, metalness: 0.6 }),
    car_glass:  new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.08, metalness: 0.5 }),
    tire:       new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.92 }),
    // human clothing
    cloth_black:  new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.9 }),
    cloth_navy:   new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.9 }),
    cloth_red:    new THREE.MeshStandardMaterial({ color: 0x8a2828, roughness: 0.9 }),
    cloth_cream:  new THREE.MeshStandardMaterial({ color: 0xd8c8a8, roughness: 0.9 }),
    cloth_green:  new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.9 }),
    skin:         new THREE.MeshStandardMaterial({ color: 0xd4a890, roughness: 0.85 })
  };

  /* ---------- GEOMETRY HELPERS ---------- */
  function boxUV(w, h, d, tw, th) {
    var g = new THREE.BoxGeometry(w, h, d);
    var uv = g.attributes.uv, nrm = g.attributes.normal;
    for (var i = 0; i < uv.count; i++) {
      var nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
      var su, sv;
      if (ny > 0.5) { su = w / tw; sv = d / tw; }
      else if (nx > 0.5) { su = d / tw; sv = h / th; }
      else { su = w / tw; sv = h / th; }
      uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
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
    var uv = []; for (var i = 0; i < pos.length/3; i++) uv.push(pos[i*3]/2.5, pos[i*3+2]/2.5);
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }
  function hipRoof(w, d, rh, ridgeFrac) {
    var hw = w/2, hd = d/2, rx = hw * (ridgeFrac || 0.4);
    var pos = [
      -hw,0,hd,  hw,0,hd,  rx,rh,0,  -hw,0,hd,  rx,rh,0,  -rx,rh,0,
       hw,0,-hd, -hw,0,-hd, -rx,rh,0, hw,0,-hd,  -rx,rh,0,  rx,rh,0,
      -hw,0,-hd, -hw,0,hd, -rx,rh,0,
       hw,0,hd,  hw,0,-hd,  rx,rh,0
    ];
    var uv = []; for (var i = 0; i < pos.length/3; i++) uv.push(pos[i*3]/2.5, pos[i*3+2]/2.5);
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }
  function mergeGeoms(geos) {
    if (!geos || !geos.length) return null;
    if (geos.length === 1) return geos[0];
    var allIdx = true, anyIdx = false;
    for (var i = 0; i < geos.length; i++) { if (geos[i].index) anyIdx = true; else allIdx = false; }
    var arr = geos;
    if (!allIdx && anyIdx) { arr = []; for (var i = 0; i < geos.length; i++) arr.push(geos[i].index ? geos[i].toNonIndexed() : geos[i]); }
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
      try { m = mergeGeoms(arr); } catch (e) {}
      if (!m) { for (var i = 0; i < arr.length; i++) parent.add(new THREE.Mesh(arr[i], mat)); }
      else { m.computeBoundingSphere(); m.computeBoundingBox(); parent.add(new THREE.Mesh(m, mat)); }
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

  /* ---------- BUILDING GENERATOR ---------- */
  function buildEuropeanBuilding(lot) {
    var w = lot.w, d = lot.d;
    // Sane heights
    if (w < 8) w = 8; if (d < 8) d = 8;
    var stories = 3 + Math.floor(RNG() * 4); // 3-6 stories
    var storyH = 3.5;
    var gfH = 4.2;
    var h = gfH + stories * storyH;
    if (lot.h > h * 1.3) h = lot.h; // allow taller if lot specifies

    var w4 = new THREE.Matrix4().makeRotationY(lot.rot).setPosition(lot.x, 0, lot.z);

    // Shape of facade based on width
    var shape = w > 24 ? 'wide' : (stories >= 5 ? 'tall' : 'short');
    var fIdx = Math.floor(RNG() * FACADE_SPECS.length);

    // Ground floor (storefront level) — stone base
    push(MATS.stone, boxUV(w, gfH, d, 4, 3).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gfH / 2, 0))));

    // Upper mass — textured facade
    var upperH = h - gfH;
    var fm = facadeMat(fIdx, shape);
    push(fm, boxUV(w, upperH, d, 4, 3.4).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gfH + upperH / 2, 0))));

    // Cornice under roof
    push(MATS.stone, new THREE.BoxGeometry(w + 1.4, 0.8, d + 1.4).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h + 0.4, 0))));

    // Terracotta roof
    var roofH = Math.min(w, d) * 0.22 + 1.2;
    push(ROOF_MAT, hipRoof(w + 1.8, d + 1.8, roofH, 0.35).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h + 0.8, 0))));

    // Chimneys — 1 or 2
    var numCh = 1 + (RNG() > 0.5 ? 1 : 0);
    for (var ch = 0; ch < numCh; ch++) {
      var cx = (RNG() - 0.5) * w * 0.6;
      var cz = (RNG() - 0.5) * d * 0.6;
      var chH = 2.5 + RNG() * 1.5;
      push(MATS.chimney, new THREE.BoxGeometry(1.4, chH, 1.4).applyMatrix4(
        w4.clone().multiply(new THREE.Matrix4().makeTranslation(cx, h + roofH * 0.7 + chH / 2, cz))));
      // chimney cap
      push(MATS.chimney, new THREE.BoxGeometry(1.8, 0.3, 1.8).applyMatrix4(
        w4.clone().multiply(new THREE.Matrix4().makeTranslation(cx, h + roofH * 0.7 + chH + 0.15, cz))));
    }

    // Storefront details (only for LOWER buildings and on front face)
    if (h < 45 && w > 12) {
      // Glass display
      push(MATS.glass_store, new THREE.BoxGeometry(w * 0.85, gfH * 0.72, 0.3).applyMatrix4(
        w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gfH * 0.42, d / 2 + 0.16))));

      // Awning
      var awnMats = [MATS.awning_green, MATS.awning_burg, MATS.awning_navy];
      var awM = awnMats[Math.floor(RNG() * awnMats.length)];
      var awW = w * 0.9;
      var awn = new THREE.BoxGeometry(awW, 0.12, 2.2);
      awn.applyMatrix4(new THREE.Matrix4().makeRotationX(-0.35));
      push(awM, awn.applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gfH - 0.5, d / 2 + 1.0))));

      // Sign above awning — a canvas plane
      var signText = SHOP_SIGNS[Math.floor(RNG() * SHOP_SIGNS.length)];
      var signBg = RNG() > 0.5 ? '#1f3a28' : '#3a1a24';
      var signTex = makeSignCanvas(signText, signBg);
      var signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6, emissive: 0x000000 });
      var signGeo = new THREE.PlaneGeometry(Math.min(awW, 5), 0.9);
      var signMesh = new THREE.Mesh(signGeo, signMat);
      signMesh.applyMatrix4(new THREE.Matrix4().makeTranslation(0, gfH + 0.6, d / 2 + 0.25));
      signMesh.applyMatrix4(w4);
      // Note: signs are separate meshes — not batched (canvas textures per sign)
      // We'll add them via the group below
      if (!S.__tempSigns) S.__tempSigns = [];
      S.__tempSigns.push(signMesh);
    }

    // Balconies with plants
    if (w > 14 && d > 12 && stories >= 4) {
      var numBal = 1 + Math.floor(RNG() * 2);
      for (var b = 0; b < numBal; b++) {
        var by = gfH + (b + 1.5) * storyH;
        if (by > h - 2) break;
        var bw = w * 0.35;
        var bd = 1.5;
        // Balcony floor
        push(MATS.stone, new THREE.BoxGeometry(bw, 0.16, bd).applyMatrix4(
          w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, by, d / 2 + bd / 2))));
        // Iron rail
        push(MATS.iron, new THREE.BoxGeometry(bw, 0.85, 0.05).applyMatrix4(
          w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, by + 0.45, d / 2 + bd))));
        push(MATS.iron, new THREE.BoxGeometry(0.05, 0.85, bd).applyMatrix4(
          w4.clone().multiply(new THREE.Matrix4().makeTranslation(-bw / 2, by + 0.45, d / 2 + bd / 2))));
        push(MATS.iron, new THREE.BoxGeometry(0.05, 0.85, bd).applyMatrix4(
          w4.clone().multiply(new THREE.Matrix4().makeTranslation(bw / 2, by + 0.45, d / 2 + bd / 2))));
        // Plants on balcony
        var pMat = [MATS.foliage_a, MATS.foliage_b, MATS.foliage_c][Math.floor(RNG() * 3)];
        push(pMat, new THREE.SphereGeometry(0.45 + RNG() * 0.25, 6, 5).applyMatrix4(
          w4.clone().multiply(new THREE.Matrix4().makeTranslation(-bw * 0.35, by + 0.6, d / 2 + bd * 0.7))));
        push(pMat, new THREE.SphereGeometry(0.45 + RNG() * 0.25, 6, 5).applyMatrix4(
          w4.clone().multiply(new THREE.Matrix4().makeTranslation(bw * 0.35, by + 0.6, d / 2 + bd * 0.7))));
      }
    }
  }

  /* ---------- STREET TREES ---------- */
  var TREES = [];
  function buildTreesAlongStreets() {
    var s = S.city.streets;
    var maxTrees = Q.trees || 200;
    var built = 0;
    for (var i = 0; i < s.length && built < maxTrees; i++) {
      var st = s[i];
      if (st.points.length < 2) continue;
      var poly = preparePolyline(st.points);
      if (poly.total < 80) continue;
      var spacing = 22;
      var count = Math.floor(poly.total / spacing);
      for (var k = 0; k < count && built < maxTrees; k++) {
        var t = (k / count) * poly.total;
        samplePolyline(poly, t, _ptmp, _dtmp);
        // Offset onto sidewalk (both sides alternating)
        var side = (k % 2) * 2 - 1;
        var px = _ptmp.x - _dtmp.z * side * (st.width / 2 + 3);
        var pz = _ptmp.z + _dtmp.x * side * (st.width / 2 + 3);
        // Skip if too close to another tree
        var ok = true;
        for (var ti = 0; ti < TREES.length; ti++) {
          var dx = px - TREES[ti].x, dz = pz - TREES[ti].z;
          if (dx*dx + dz*dz < 40*40) { ok = false; break; }
        }
        if (!ok) continue;

        var trunkH = 2 + RNG() * 1.2;
        var canopyR = 1.8 + RNG() * 1.2;

        // Trunk
        push(MATS.trunk, new THREE.CylinderGeometry(0.18, 0.28, trunkH, 6).translate(px, trunkH / 2, pz));

        // Canopy — 3 overlapping spheres
        var fMat = [MATS.foliage_a, MATS.foliage_b, MATS.foliage_c][Math.floor(RNG() * 3)];
        for (var cf = 0; cf < 3; cf++) {
          var fx = px + (RNG() - 0.5) * 1.5;
          var fy = trunkH + 1.2 + (RNG() - 0.5) * 0.8;
          var fz = pz + (RNG() - 0.5) * 1.5;
          var fr = canopyR * (0.7 + RNG() * 0.5);
          push(fMat, new THREE.SphereGeometry(fr, 8, 6).translate(fx, fy, fz));
        }

        TREES.push({ x: px, z: pz });
        built++;
      }
    }
  }

  /* ---------- STREET LAMPS ---------- */
  function buildStreetLamps() {
    var maxLamps = Q.lamps || 200;
    var built = 0;
    var s = S.city.streets;
    for (var i = 0; i < s.length && built < maxLamps; i++) {
      var st = s[i];
      if (st.points.length < 2) continue;
      var poly = preparePolyline(st.points);
      if (poly.total < 60) continue;
      var spacing = 32;
      var count = Math.floor(poly.total / spacing);
      for (var k = 0; k < count && built < maxLamps; k++) {
        var t = ((k + 0.5) / count) * poly.total;
        samplePolyline(poly, t, _ptmp, _dtmp);
        var side = (k % 2) * 2 - 1;
        var px = _ptmp.x - _dtmp.z * side * (st.width / 2 + 1.8);
        var pz = _ptmp.z + _dtmp.x * side * (st.width / 2 + 1.8);
        var lampH = 6;
        // Pole
        push(MATS.iron, new THREE.CylinderGeometry(0.10, 0.16, lampH, 6).translate(px, lampH / 2, pz));
        // Head
        push(MATS.iron, new THREE.CylinderGeometry(0.35, 0.28, 0.5, 6).translate(px, lampH + 0.2, pz));
        // Glass (dark during day)
        push(MATS.glass_store, new THREE.SphereGeometry(0.24, 8, 6).translate(px, lampH + 0.55, pz));
        built++;
      }
    }
  }

  /* ---------- CAFÉ TABLES ---------- */
  function buildCafeTables() {
    if (Q.tier < 2) return;
    var maxTables = 40;
    var built = 0;
    var s = S.city.streets;
    for (var i = 0; i < s.length && built < maxTables; i++) {
      var st = s[i];
      if (st.points.length < 2) continue;
      if (st.width < 14) continue;
      var poly = preparePolyline(st.points);
      if (poly.total < 100) continue;
      var count = Math.floor(poly.total / 90);
      for (var k = 0; k < count && built < maxTables; k++) {
        var t = ((k + 0.3) / count) * poly.total;
        samplePolyline(poly, t, _ptmp, _dtmp);
        var side = RNG() > 0.5 ? 1 : -1;
        var px = _ptmp.x - _dtmp.z * side * (st.width / 2 + 3.5);
        var pz = _ptmp.z + _dtmp.x * side * (st.width / 2 + 3.5);
        // Table
        push(MATS.iron, new THREE.CylinderGeometry(0.55, 0.55, 0.06, 8).translate(px, 0.75, pz));
        push(MATS.iron, new THREE.CylinderGeometry(0.08, 0.08, 0.75, 6).translate(px, 0.375, pz));
        // Chairs (2)
        for (var c = 0; c < 2; c++) {
          var ca = (c / 2) * Math.PI * 2 + RNG() * 0.5;
          var cx = px + Math.cos(ca) * 0.9;
          var cz = pz + Math.sin(ca) * 0.9;
          push(MATS.iron, new THREE.CylinderGeometry(0.22, 0.22, 0.05, 6).translate(cx, 0.5, cz));
          push(MATS.iron, new THREE.BoxGeometry(0.4, 0.45, 0.05).translate(cx, 0.75, cz + 0.2 * Math.sin(ca)));
        }
        // Umbrella
        var umbMats = [MATS.awning_green, MATS.awning_burg, MATS.awning_navy];
        var um = umbMats[Math.floor(RNG() * umbMats.length)];
        push(MATS.iron, new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6).translate(px, 1.2, pz));
        push(um, new THREE.ConeGeometry(1.3, 0.5, 8).translate(px, 2.4, pz));
        built++;
      }
    }
  }

  /* ---------- HUMANS ---------- */
  function buildHumanGeo() {
    var geos = [];
    geos.push(new THREE.BoxGeometry(0.32, 0.55, 0.2).translate(0, 1.15, 0));
    geos.push(new THREE.SphereGeometry(0.13, 7, 6).translate(0, 1.6, 0));
    geos.push(new THREE.BoxGeometry(0.08, 0.5, 0.08).translate(-0.21, 1.1, 0));
    geos.push(new THREE.BoxGeometry(0.08, 0.5, 0.08).translate(0.21, 1.1, 0));
    geos.push(new THREE.BoxGeometry(0.1, 0.55, 0.1).translate(-0.09, 0.55, 0));
    geos.push(new THREE.BoxGeometry(0.1, 0.55, 0.1).translate(0.09, 0.55, 0));
    return mergeGeoms(geos);
  }
  var HUMAN_GEO = buildHumanGeo();
  var HUMAN_MATS = [MATS.cloth_black, MATS.cloth_navy, MATS.cloth_red, MATS.cloth_cream, MATS.cloth_green];

  /* ---------- CARS ---------- */
  function buildCarBody() {
    var geos = [];
    geos.push(new THREE.BoxGeometry(1.8, 0.5, 4.2).translate(0, 0.55, 0));
    geos.push(new THREE.BoxGeometry(1.7, 0.35, 1.4).translate(0, 0.85, 1.35));
    geos.push(new THREE.BoxGeometry(1.65, 0.5, 1.9).translate(0, 1.15, -0.15));
    geos.push(new THREE.BoxGeometry(1.7, 0.4, 1.0).translate(0, 0.85, -1.6));
    return mergeGeoms(geos);
  }
  function buildCarGlass() {
    var geos = [];
    geos.push(new THREE.BoxGeometry(1.5, 0.42, 0.12).translate(0, 1.16, 0.78));
    geos.push(new THREE.BoxGeometry(1.5, 0.42, 0.12).translate(0, 1.16, -1.08));
    return mergeGeoms(geos);
  }
  function buildCarWheels() {
    var wg = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 8);
    wg.rotateZ(Math.PI / 2);
    var positions = [[-0.88, 0.36, 1.4], [0.88, 0.36, 1.4], [-0.88, 0.36, -1.5], [0.88, 0.36, -1.5]];
    var geos = [];
    for (var i = 0; i < positions.length; i++) {
      geos.push(wg.clone().translate(positions[i][0], positions[i][1], positions[i][2]));
    }
    return mergeGeoms(geos);
  }
  var CAR_BODY = buildCarBody();
  var CAR_GLASS = buildCarGlass();
  var CAR_WHEELS = buildCarWheels();
  var CAR_MATS = [MATS.car_red, MATS.car_black, MATS.car_silver, MATS.car_champ, MATS.car_white];

  /* ---------- PATH SAMPLING ---------- */
  var _ptmp = new THREE.Vector3();
  var _dtmp = new THREE.Vector3();
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
    if (!poly || poly.total <= 0) { outPos.set(0, 0, 0); outDir.set(0, 0, 1); return; }
    var u = ((t % poly.total) + poly.total) % poly.total;
    var lo = 0, hi = poly.cum.length - 1;
    while (lo < hi - 1) { var mid = (lo + hi) >> 1; if (poly.cum[mid] <= u) lo = mid; else hi = mid; }
    var a = poly.pts[lo], b = poly.pts[hi];
    var segLen = poly.cum[hi] - poly.cum[lo] || 1;
    var f = (u - poly.cum[lo]) / segLen;
    outPos.set(a.x + (b.x - a.x) * f, 0, a.y + (b.y - a.y) * f);
    var dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.sqrt(dx*dx + dy*dy) || 1;
    outDir.set(dx / len, 0, dy / len);
  }

  var walkPaths = [], drivePaths = [];
  function prepPaths() {
    var s = S.city.streets;
    for (var i = 0; i < s.length; i++) {
      if (s[i].points.length < 2) continue;
      if (s[i].points.length > 200) continue;
      var poly = preparePolyline(s[i].points);
      if (poly.total < 30) continue;
      walkPaths.push(poly);
      if (s[i].width >= 14 && poly.total > 60) drivePaths.push(poly);
    }
  }
  prepPaths();

  /* ---------- ANIMATE ---------- */
  var pedInstances = [], carInstances = [];
  function createPeople() {
    var count = Math.max(40, Q.pedestrians || 200);
    var perMat = {};
    for (var i = 0; i < count; i++) {
      var path = walkPaths[Math.floor(RNG() * walkPaths.length)];
      if (!path) break;
      var mi = Math.floor(RNG() * HUMAN_MATS.length);
      if (!perMat[mi]) perMat[mi] = [];
      perMat[mi].push({ path: path, t: RNG() * path.total, speed: 1.0 + RNG() * 0.8, bobPhase: RNG() * Math.PI * 2 });
    }
    for (var mi2 in perMat) {
      var arr = perMat[mi2];
      var mesh = new THREE.InstancedMesh(HUMAN_GEO, HUMAN_MATS[mi2], arr.length);
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = false;
      pedInstances.push({ mesh: mesh, data: arr });
    }
  }
  function createCars() {
    var count = Math.min(60, Q.vehicles || 40);
    var perMat = {};
    for (var i = 0; i < count; i++) {
      var path = drivePaths[Math.floor(RNG() * drivePaths.length)];
      if (!path) break;
      var mi = Math.floor(RNG() * CAR_MATS.length);
      if (!perMat[mi]) perMat[mi] = [];
      var dir = RNG() < 0.5 ? 1 : -1;
      perMat[mi].push({ path: path, t: RNG() * path.total, speed: 8 + RNG() * 8, dir: dir, laneOffset: dir * 3.4 });
    }
    for (var mi2 in perMat) {
      var arr = perMat[mi2];
      var body = new THREE.InstancedMesh(CAR_BODY, CAR_MATS[mi2], arr.length);
      body.frustumCulled = false;
      body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      body.castShadow = true;
      var glass = new THREE.InstancedMesh(CAR_GLASS, MATS.car_glass, arr.length);
      glass.frustumCulled = false;
      glass.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      var wheels = new THREE.InstancedMesh(CAR_WHEELS, MATS.tire, arr.length);
      wheels.frustumCulled = false;
      wheels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      carInstances.push({ body: body, glass: glass, wheels: wheels, data: arr });
    }
  }

  var _m4 = new THREE.Matrix4();
  var _q = new THREE.Quaternion();
  var _p = new THREE.Vector3();
  var _d = new THREE.Vector3();
  var _up = new THREE.Vector3(0, 1, 0);
  var _s = new THREE.Vector3(1, 1, 1);
  var _tp = new THREE.Vector3();

  function animate(elapsed, dt) {
    for (var pi = 0; pi < pedInstances.length; pi++) {
      var inst = pedInstances[pi];
      for (var i = 0; i < inst.data.length; i++) {
        var p = inst.data[i];
        p.t += p.speed * dt;
        samplePolyline(p.path, p.t, _p, _d);
        var bob = Math.sin(elapsed * 6 + p.bobPhase) * 0.05;
        _tp.set(_p.x, bob, _p.z);
        var yaw = Math.atan2(_d.x, _d.z);
        _q.setFromAxisAngle(_up, yaw);
        _m4.compose(_tp, _q, _s);
        inst.mesh.setMatrixAt(i, _m4);
      }
      inst.mesh.instanceMatrix.needsUpdate = true;
    }
    for (var ci = 0; ci < carInstances.length; ci++) {
      var cinst = carInstances[ci];
      for (var j = 0; j < cinst.data.length; j++) {
        var v = cinst.data[j];
        v.t += v.speed * dt * v.dir;
        samplePolyline(v.path, v.t, _p, _d);
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

  /* ---------- RUN ---------- */
  var group = new THREE.Group();
  group.name = 'santinopole-city';

  buildRoads();

  var nearLots = [], instancedLots = [];
  for (var i = 0; i < S.city.lots.length; i++) {
    var lot = S.city.lots[i];
    if (lot.lod === 0) nearLots.push(lot);
    else instancedLots.push(lot);
  }

  for (var ni = 0; ni < nearLots.length; ni++) buildEuropeanBuilding(nearLots[ni]);

  // Landmarks
  for (var li = 0; li < S.city.landmarks.length; li++) {
    var lm = S.city.landmarks[li];
    var lw = 22, ld = 22;
    var stories = 4 + Math.floor(RNG() * 2);
    var lh = lm.h > 40 ? lm.h : stories * 3.8 + 4;
    var w4 = new THREE.Matrix4().makeRotationY(0).setPosition(lm.x, 0, lm.z);
    push(facadeMat(1, 'tall'), boxUV(lw, lh, ld, 4, 3.5).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, lh / 2, 0))));
    push(MATS.stone, new THREE.BoxGeometry(lw + 2, 1, ld + 2).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, lh + 0.5, 0))));
    push(ROOF_MAT, hipRoof(lw + 2, ld + 2, 6, 0.35).applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, lh + 1, 0))));
  }

  // Public spaces
  for (var pi2 = 0; pi2 < S.city.publicSpaces.length; pi2++) {
    var ps = S.city.publicSpaces[pi2];
    if (ps.kind === 'plaza') {
      var g = new THREE.CircleGeometry(ps.radius, 32); g.rotateX(-Math.PI / 2);
      push(MATS.marble, g.translate(ps.x, 0.35, ps.z));
    } else {
      var gg = new THREE.CircleGeometry(ps.radius, 32); gg.rotateX(-Math.PI / 2);
      push(MATS.lawn, gg.translate(ps.x, 0.32, ps.z));
    }
  }

  // Street life
  buildTreesAlongStreets();
  buildStreetLamps();
  buildCafeTables();

  flush(group);

  // Instanced far city
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

  // Add pending sign meshes
  if (S.__tempSigns) {
    for (var si = 0; si < S.__tempSigns.length; si++) group.add(S.__tempSigns[si]);
    S.__tempSigns = [];
  }

  // Life
  createPeople();
  createCars();
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
      pedestrians: pedInstances.reduce(function (a, b) { return a + b.data.length; }, 0),
      cars: carInstances.reduce(function (a, b) { return a + b.data.length; }, 0),
      trees: TREES.length
    }
  };

  S.log('buildings', true,
    nearLots.length + ' detailed · ' +
    instancedLots.length + ' far · ' +
    S.buildings.count + ' meshes');
  S.log('street life', true,
    S.buildings.living.trees + ' trees · ' +
    S.buildings.living.pedestrians + ' pedestrians · ' +
    S.buildings.living.cars + ' cars');

})();
