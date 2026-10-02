/* ============================================================
   SANTINOPOLE — buildings.js — MARINE DRIVE, MUMBAI
   Art Deco palazzi. Real cars. Real signs. Sunny day.
   ============================================================ */

(function () {
  'use strict';
  var S = window.SANTINOPOLE;
  var THREE = window.THREE;
  if (!S || !S.city || !S.performance || !THREE) { console.error('[buildings.js] deps missing'); return; }
  if (S.city.mode !== 'marine-drive') { console.error('[buildings.js] city.js not in marine-drive mode'); return; }
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

  /* ============================================================
     ART DECO MUMBAI FACADE TEXTURE
     ============================================================ */
  function makeDecoFacade(base, trim, windows) {
    var W = TS, H = Math.floor(TS * 1.4);
    var c = cvs(W, H), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, W, H);

    // subtle plaster striations
    for (var i = 0; i < 80; i++) {
      g.fillStyle = 'rgba(' + (RNG() > 0.4 ? '255,255,255' : '0,0,0') + ',' + (RNG() * 0.02) + ')';
      g.fillRect(RNG() * W, RNG() * H, 1 + RNG() * 2, 1 + RNG() * 1);
    }

    // horizontal banding (Art Deco signature)
    var bands = 4;
    for (var b = 0; b < bands; b++) {
      g.fillStyle = trim;
      g.fillRect(0, (b + 1) * (H / (bands + 1)) - 1, W, 2);
    }

    // top cornice
    g.fillStyle = trim;
    g.fillRect(0, 0, W, 5);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, 6, W, 2);

    // windows grid
    var cols = windows[0], rows = windows[1];
    var pw = W / cols, ph = (H - 10) / rows;
    var ww = pw * 0.55, wh = ph * 0.58;
    for (var ry = 0; ry < rows; ry++) {
      for (var rx = 0; rx < cols; rx++) {
        var wx = rx * pw + (pw - ww) / 2;
        var wy = 8 + ry * ph + (ph - wh) / 2;
        // deep-set window frame
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
        g.fillStyle = trim;
        g.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
        // glass gradient (daytime reflection — pale blue)
        var gg = g.createLinearGradient(wx, wy, wx, wy + wh);
        gg.addColorStop(0, '#8fa8c0');
        gg.addColorStop(0.5, '#5a7080');
        gg.addColorStop(1, '#2a3844');
        g.fillStyle = gg;
        g.fillRect(wx, wy, ww, wh);
        // reflection streak
        g.fillStyle = 'rgba(230, 240, 250, 0.22)';
        g.beginPath();
        g.moveTo(wx, wy);
        g.lineTo(wx + ww * 0.55, wy);
        g.lineTo(wx, wy + wh * 0.65);
        g.closePath();
        g.fill();
        // sill
        g.fillStyle = trim;
        g.fillRect(wx - 3, wy + wh + 1, ww + 6, 2);
      }
    }
    return tex(c);
  }

  var DECO_SPECS = [
    { base:'#ecd8a8', trim:'#f4e8c4' },  // pale cream
    { base:'#e8d4a0', trim:'#f0e0b8' },  // warm ochre
    { base:'#f0e0b0', trim:'#f8ecc8' },  // ivory
    { base:'#dcc898', trim:'#e8d8ac' },  // sand
    { base:'#e4d0a0', trim:'#f0e4bc' },  // beige
    { base:'#ead6a4', trim:'#f2e6c0' }   // light gold
  ];

  var FACADES_5 = DECO_SPECS.map(function (s) { return makeDecoFacade(s.base, s.trim, [4, 5]); });
  var FACADES_6 = DECO_SPECS.map(function (s) { return makeDecoFacade(s.base, s.trim, [4, 6]); });
  var FACADES_7 = DECO_SPECS.map(function (s) { return makeDecoFacade(s.base, s.trim, [5, 7]); });
  var FACADES_8 = DECO_SPECS.map(function (s) { return makeDecoFacade(s.base, s.trim, [5, 8]); });

  function facadeMat(idx, stories) {
    var list = stories <= 5 ? FACADES_5 : (stories === 6 ? FACADES_6 : (stories === 7 ? FACADES_7 : FACADES_8));
    var t = list[idx % list.length];
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, metalness: 0.02 });
  }

  /* ============================================================
     ROOF — terracotta tile / concrete parapet
     ============================================================ */
  function makeRoofTex() {
    var W = 128, H = 128;
    var c = cvs(W, H), g = c.getContext('2d');
    g.fillStyle = '#8a4028'; g.fillRect(0, 0, W, H);
    var cols = 8, rows = 10;
    var cw = W / cols, ch = H / rows;
    for (var r = 0; r < rows; r++) {
      for (var k = 0; k < cols; k++) {
        var shade = 0.75 + RNG() * 0.35;
        g.fillStyle = 'rgb(' + Math.floor(178 * shade) + ',' + Math.floor(92 * shade) + ',' + Math.floor(52 * shade) + ')';
        g.beginPath();
        g.ellipse(k*cw + cw*0.5 + (r%2)*cw*0.5, r*ch + ch*0.5, cw*0.5, ch*0.5, 0, 0, Math.PI*2);
        g.fill();
      }
    }
    return tex(c, 3, 3);
  }
  var ROOF_MAT = new THREE.MeshStandardMaterial({ map: makeRoofTex(), roughness: 0.9 });

  /* ============================================================
     GROUND SURFACES
     ============================================================ */
  function makeConcreteTex() {
    var W = 128, H = 128;
    var c = cvs(W, H), g = c.getContext('2d');
    g.fillStyle = '#8a8478'; g.fillRect(0, 0, W, H);
    for (var n = 0; n < 400; n++) {
      g.fillStyle = 'rgba(0,0,0,' + (RNG() * 0.06) + ')';
      g.fillRect(RNG() * W, RNG() * H, 2, 2);
    }
    return tex(c, 8, 8);
  }
  function makeAsphaltTex() {
    var W = 128, H = 128;
    var c = cvs(W, H), g = c.getContext('2d');
    g.fillStyle = '#2a2826'; g.fillRect(0, 0, W, H);
    for (var n = 0; n < 500; n++) {
      g.fillStyle = 'rgba(' + (RNG() > 0.5 ? '200,200,200' : '0,0,0') + ',' + (RNG() * 0.08) + ')';
      g.fillRect(RNG() * W, RNG() * H, 1 + RNG() * 2, 1 + RNG() * 2);
    }
    // yellow center line
    g.fillStyle = '#c8a838';
    g.fillRect(0, H / 2 - 1, W, 2);
    return tex(c, 6, 6);
  }
  function makeSandTex() {
    var W = 128, H = 128;
    var c = cvs(W, H), g = c.getContext('2d');
    g.fillStyle = '#d8b878'; g.fillRect(0, 0, W, H);
    for (var n = 0; n < 800; n++) {
      g.fillStyle = 'rgba(' + Math.floor(120 + RNG() * 80) + ',' + Math.floor(90 + RNG() * 60) + ',' + Math.floor(60 + RNG() * 40) + ',' + (RNG() * 0.35) + ')';
      g.fillRect(RNG() * W, RNG() * H, 1, 1);
    }
    return tex(c, 20, 20);
  }

  var MATS = {
    asphalt:    new THREE.MeshStandardMaterial({ map: makeAsphaltTex(), roughness: 0.95 }),
    concrete:   new THREE.MeshStandardMaterial({ map: makeConcreteTex(), roughness: 0.92 }),
    sand:       new THREE.MeshStandardMaterial({ map: makeSandTex(), roughness: 0.95 }),
    stone:      new THREE.MeshStandardMaterial({ color: 0xe8d8b0, roughness: 0.85 }),
    stoneDark:  new THREE.MeshStandardMaterial({ color: 0xc8b888, roughness: 0.88 }),
    seaWall:    new THREE.MeshStandardMaterial({ color: 0x9a9280, roughness: 0.9 }),
    balustrade: new THREE.MeshStandardMaterial({ color: 0xe0d0a8, roughness: 0.85 }),
    metal:      new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: 0.45, metalness: 0.75 }),
    iron:       new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.55, metalness: 0.65 }),
    glass:      new THREE.MeshStandardMaterial({ color: 0x2a3844, roughness: 0.15, metalness: 0.4 }),
    terracotta: ROOF_MAT,
    trunk:      new THREE.MeshStandardMaterial({ color: 0x5a4530, roughness: 0.95 }),
    foliage:    new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.95 }),
    foliage2:   new THREE.MeshStandardMaterial({ color: 0x4a7a38, roughness: 0.95 }),
    flowers:    new THREE.MeshStandardMaterial({ color: 0xd85028, roughness: 0.9 })
  };

  /* ============================================================
     SIGN TEXTURES — real Mumbai names
     ============================================================ */
  var SIGNS = [
    // Banks
    { text:'HDFC BANK', bg:'#0a2a6a', fg:'#ffffff', w:5 },
    { text:'ICICI BANK', bg:'#e04a20', fg:'#ffffff', w:5 },
    { text:'STATE BANK', bg:'#1a4a9a', fg:'#ffffff', w:5 },
    { text:'AXIS BANK', bg:'#8a1a24', fg:'#ffffff', w:5 },
    { text:'BANK OF BARODA', bg:'#f0a020', fg:'#1a1a1a', w:5 },
    // Restaurants / Cafes
    { text:'CAFÉ MADRAS', bg:'#3a2a1a', fg:'#f0e0b0', w:4 },
    { text:'IRANI CHAI', bg:'#4a2a1a', fg:'#f0e0b0', w:3.5 },
    { text:'TRISHNA', bg:'#2a1a10', fg:'#d4a24a', w:3 },
    { text:'MAHESH LUNCH', bg:'#5a1a1a', fg:'#f0d8a0', w:4.5 },
    { text:'BRITANNIA', bg:'#1a2a3a', fg:'#f0e0b0', w:4 },
    { text:'BADE MIYAN', bg:'#2a1a10', fg:'#f0c060', w:4 },
    { text:'LEOPOLD', bg:'#3a2a1a', fg:'#e0c090', w:3.5 },
    { text:'UDIPI', bg:'#3a5a2a', fg:'#f0e0a0', w:3 },
    { text:'GELATO', bg:'#c85080', fg:'#ffffff', w:3 },
    // Shops
    { text:'RAYMOND', bg:'#1a1a2a', fg:'#d4a24a', w:3.5 },
    { text:'BOMBAY DYEING', bg:'#0a2a4a', fg:'#ffffff', w:5 },
    { text:'WESTSIDE', bg:'#6a1a5a', fg:'#ffffff', w:3.5 },
    { text:'TANISHQ', bg:'#2a1a10', fg:'#e0a040', w:3.5 },
    { text:'LIFESTYLE', bg:'#8a1a3a', fg:'#ffffff', w:4 },
    { text:'TITAN', bg:'#1a1a1a', fg:'#d4a24a', w:3 },
    { text:'PHARMACY', bg:'#0a5a2a', fg:'#ffffff', w:3 },
    // Landmark names
    { text:'MARINE PLAZA', bg:'#2a3a5a', fg:'#e8e0c0', w:5.5 },
    { text:'SEA VIEW', bg:'#3a4a6a', fg:'#f0e0b0', w:4 },
    { text:'WANKHEDE', bg:'#1a3a1a', fg:'#d4c080', w:4 }
  ];

  var signTextures = {};
  function getSignTexture(idx) {
    if (signTextures[idx]) return signTextures[idx];
    var s = SIGNS[idx];
    var W = 512, H = 128;
    var c = cvs(W, H), g = c.getContext('2d');
    g.fillStyle = s.bg; g.fillRect(0, 0, W, H);
    // border
    g.strokeStyle = s.fg; g.lineWidth = 4;
    g.strokeRect(8, 8, W - 16, H - 16);
    // text
    g.fillStyle = s.fg;
    g.font = 'bold 56px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(s.text, W / 2, H / 2 + 2);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Q.anisotropy;
    signTextures[idx] = t;
    return t;
  }

  /* ============================================================
     GEOMETRY HELPERS
     ============================================================ */
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

  /* ============================================================
     BUILD THE ROAD SURFACE + SIDEWALKS + PROMENADE + SEA WALL
     ============================================================ */
  function ribbon(points, width, y, mat) {
    var verts = [], idx = [], uvs = [], hw = width / 2;
    for (var i = 0; i < points.length; i++) {
      var px = points[i].x !== undefined ? points[i].x : points[i][0];
      var pz = points[i].z !== undefined ? points[i].z : points[i][1];
      var nx, nz;
      var prev = points[i - 1] || points[i];
      var next = points[i + 1] || points[i];
      var pxp = prev.x !== undefined ? prev.x : prev[0];
      var pzp = prev.z !== undefined ? prev.z : prev[1];
      var pxn = next.x !== undefined ? next.x : next[0];
      var pzn = next.z !== undefined ? next.z : next[1];
      nx = pxn - pxp; nz = pzn - pzp;
      var len = Math.sqrt(nx * nx + nz * nz) || 1;
      nx /= len; nz /= len;
      var perpX = -nz, perpZ = nx;
      verts.push(px + perpX * hw, y, pz + perpZ * hw);
      verts.push(px - perpX * hw, y, pz - perpZ * hw);
      uvs.push(0, i * 0.3, 1, i * 0.3);
    }
    for (var s = 0; s < points.length - 1; s++) {
      var a = s * 2, b = s * 2 + 1, c = s * 2 + 2, d = s * 2 + 3;
      idx.push(a, b, c, b, d, c);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    if (mat) push(mat, g);
    else return g;
  }

  function buildRoadAndPromenade() {
    var N = S.city.curve.samples;
    var D = S.city.drive;

    var laneOffset = D.roadHalfWidth;
    var promInner = D.roadHalfWidth + D.outerSidewalk;
    var promOuter = promInner + D.promenadeWidth;

    // Sample curve into polylines offset by various amounts
    function sampleOffset(offset) {
      var pts = [];
      for (var i = 0; i < N; i++) {
        var t = i / (N - 1);
        var p = S.city.curve.point(t);
        var n = S.city.curve.perp(t);
        pts.push({ x: p.x + n.x * offset, z: p.z + n.z * offset });
      }
      return pts;
    }

    // Road (asphalt)
    ribbon(sampleOffset(0), D.roadHalfWidth * 2, 0.05, MATS.asphalt);

    // Inner sidewalk (between road and buildings)
    ribbon(sampleOffset(-laneOffset - D.innerSidewalk / 2), D.innerSidewalk, 0.15, MATS.concrete);

    // Promenade (outer sidewalk along sea)
    ribbon(sampleOffset(promInner + D.promenadeWidth / 2), D.promenadeWidth, 0.15, MATS.concrete);

    // Sea wall — a low box wall running the length of the curve
    var wallInner = sampleOffset(promOuter);
    var wallOuter = sampleOffset(promOuter + D.seaWallThickness);
    for (var i = 0; i < N - 1; i++) {
      var a = wallInner[i], b = wallInner[i + 1];
      var ax = a.x, az = a.z;
      var bx = b.x, bz = b.z;
      var mx = (ax + bx) / 2, mz = (az + bz) / 2;
      var dx = bx - ax, dz = bz - az;
      var len = Math.sqrt(dx * dx + dz * dz);
      var rot = Math.atan2(dx, dz);
      // Wall body
      push(MATS.seaWall, new THREE.BoxGeometry(D.seaWallThickness, 1.1, len * 1.05)
        .applyMatrix4(new THREE.Matrix4().makeRotationY(rot).setPosition(mx, 0.55, mz)));
      // Balustrade posts (Art Deco)
      push(MATS.balustrade, new THREE.BoxGeometry(D.seaWallThickness + 0.4, 0.4, len * 1.05)
        .applyMatrix4(new THREE.Matrix4().makeRotationY(rot).setPosition(mx, 1.3, mz)));
    }

    // Sea surface
    var seaGeo = new THREE.PlaneGeometry(2600, 900, 1, 1);
    seaGeo.rotateX(-Math.PI / 2);
    var seaMat = new THREE.MeshStandardMaterial({ color: 0x1a4a5c, roughness: 0.2, metalness: 0.35 });
    var sea = new THREE.Mesh(seaGeo, seaMat);
    sea.position.set(D.length * 0.5, -0.6, 200);
    sea.name = 'sea';
    // returned for env
    S.__marineDrive_sea = sea;
  }

  /* ============================================================
     BUILD ONE ART DECO BUILDING
     ============================================================ */
  function buildDecoBuilding(b) {
    var w = b.w, d = b.d, h = b.h;
    var stories = b.stories;
    var storyH = b.storyH;
    var w4 = new THREE.Matrix4().makeRotationY(b.rot).setPosition(b.x, 0, b.z);
    var fIdx = Math.floor(RNG() * DECO_SPECS.length);
    var fm = facadeMat(fIdx, stories);

    // Ground floor — darker stone
    var gfH = 4.5;
    push(MATS.stoneDark, boxUV(w, gfH, d, 4, 3).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gfH / 2, 0))));

    // Upper mass — Art Deco facade texture
    var upperH = h - gfH;
    push(fm, boxUV(w, upperH, d, w / 4, 3.4).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gfH + upperH / 2, 0))));

    // Cornice
    push(MATS.stone, new THREE.BoxGeometry(w + 1.2, 0.9, d + 1.2).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h + 0.45, 0))));

    // Flat roof (Mumbai Art Deco buildings have flat roofs, not pitched)
    push(MATS.concrete, new THREE.BoxGeometry(w + 1, 0.3, d + 1).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h + 0.9, 0))));

    // Water tank on roof
    if (RNG() < 0.75) {
      var tankX = (RNG() - 0.5) * w * 0.5;
      var tankZ = (RNG() - 0.5) * d * 0.5;
      push(MATS.metal, new THREE.CylinderGeometry(1.2, 1.2, 1.8, 8).applyMatrix4(
        w4.clone().multiply(new THREE.Matrix4().makeTranslation(tankX, h + 2.0, tankZ))));
      push(MATS.metal, new THREE.BoxGeometry(2.6, 0.15, 2.6).applyMatrix4(
        w4.clone().multiply(new THREE.Matrix4().makeTranslation(tankX, h + 1.15, tankZ))));
    }

    // AC units on some floors
    var acCount = Math.floor(RNG() * 4);
    for (var ac = 0; ac < acCount; ac++) {
      var acY = gfH + (1 + RNG() * (stories - 2)) * storyH;
      var acX = (RNG() - 0.5) * w * 0.8;
      push(MATS.metal, new THREE.BoxGeometry(1.6, 0.9, 0.8).applyMatrix4(
        w4.clone().multiply(new THREE.Matrix4().makeTranslation(acX, acY, d / 2 + 0.4))));
    }

    // Rooftop antenna
    if (RNG() < 0.4) {
      push(MATS.metal, new THREE.CylinderGeometry(0.06, 0.08, 4 + RNG() * 3, 5).applyMatrix4(
        w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, h + 2.5, 0))));
    }

    // Ground floor storefront (front face)
    var shopIdx = Math.floor(RNG() * SIGNS.length);
    var signTex = getSignTexture(shopIdx);
    var signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: false });

    // Glass display window
    push(MATS.glass, new THREE.BoxGeometry(w * 0.78, gfH * 0.7, 0.35).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gfH * 0.42, d / 2 + 0.18))));

    // Storefront sign board — separate mesh (canvas texture, not batchable)
    var signW = Math.min(w * 0.75, 5.5);
    var signH = signW * (128 / 512);
    var signGeo = new THREE.PlaneGeometry(signW, signH);
    var signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.applyMatrix4(new THREE.Matrix4().makeTranslation(0, gfH + 0.45, d / 2 + 0.35));
    signMesh.applyMatrix4(w4);
    if (!S.__marineSigns) S.__marineSigns = [];
    S.__marineSigns.push(signMesh);

    // Awning over storefront
    var awnColors = [0x1f4a2a, 0x5a1a24, 0x1a2a48, 0x8a3a1a];
    var awnMat = new THREE.MeshStandardMaterial({ color: awnColors[Math.floor(RNG() * awnColors.length)], roughness: 0.9 });
    var awn = new THREE.BoxGeometry(w * 0.85, 0.1, 1.6);
    awn.applyMatrix4(new THREE.Matrix4().makeRotationX(-0.4));
    push(awnMat, awn.applyMatrix4(w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, gfH - 0.4, d / 2 + 0.8))));

    // Balconies on front face
    var numBal = Math.max(1, stories - 2);
    for (var bl = 0; bl < numBal; bl++) {
      var by = gfH + (bl + 1) * storyH - 0.4;
      if (by > h - 1.5) break;
      var bw = w * 0.42;
      var bd = 1.0;
      push(MATS.stone, new THREE.BoxGeometry(bw, 0.15, bd).applyMatrix4(
        w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, by, d / 2 + bd / 2))));
      // railing
      push(MATS.iron, new THREE.BoxGeometry(bw, 0.75, 0.04).applyMatrix4(
        w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, by + 0.4, d / 2 + bd))));
      push(MATS.iron, new THREE.BoxGeometry(0.04, 0.75, bd).applyMatrix4(
        w4.clone().multiply(new THREE.Matrix4().makeTranslation(-bw / 2, by + 0.4, d / 2 + bd / 2))));
      push(MATS.iron, new THREE.BoxGeometry(0.04, 0.75, bd).applyMatrix4(
        w4.clone().multiply(new THREE.Matrix4().makeTranslation(bw / 2, by + 0.4, d / 2 + bd / 2))));
    }
  }

  /* ============================================================
     LAMPS — iconic double-headed Marine Drive lamp
     ============================================================ */
  function buildLamp(l) {
    // Pole
    push(MATS.iron, new THREE.CylinderGeometry(0.09, 0.14, 7, 8).translate(l.x, 3.5, l.z));
    // Base
    push(MATS.iron, new THREE.CylinderGeometry(0.3, 0.4, 0.5, 8).translate(l.x, 0.25, l.z));
    // Cross arm
    var fx = l.faceX, fz = l.faceZ;
    push(MATS.iron, new THREE.BoxGeometry(2.4, 0.1, 0.1)
      .applyMatrix4(new THREE.Matrix4().makeRotationY(Math.atan2(fx, fz))
        .setPosition(l.x, 6.7, l.z)));
    // Two heads (one each side, tilted down)
    for (var h = -1; h <= 1; h += 2) {
      var hx = l.x + fx * 1.1 * h;
      var hz = l.z + fz * 1.1 * h;
      push(MATS.iron, new THREE.CylinderGeometry(0.35, 0.28, 0.35, 8).translate(hx, 6.55, hz));
      push(MATS.glass, new THREE.SphereGeometry(0.28, 8, 6).translate(hx, 6.35, hz));
    }
  }

  /* ============================================================
     PALM TREE
     ============================================================ */
  function buildPalm(p) {
    var trunkH = 6 + RNG() * 2;
    var lean = (RNG() - 0.5) * 0.3;
    // trunk — slight bend via stacked segments
    var segments = 5;
    for (var s = 0; s < segments; s++) {
      var y0 = (s / segments) * trunkH;
      var y1 = ((s + 1) / segments) * trunkH;
      var midY = (y0 + y1) / 2;
      var offsetX = lean * midY;
      var taper = 0.4 - s * 0.06;
      push(MATS.trunk, new THREE.CylinderGeometry(taper * 0.9, taper, y1 - y0, 6)
        .translate(p.x + offsetX, midY, p.z));
    }
    // fronds
    var topX = p.x + lean * trunkH;
    var topZ = p.z;
    var numFronds = 6;
    for (var f = 0; f < numFronds; f++) {
      var a = (f / numFronds) * Math.PI * 2;
      var frondGeo = new THREE.ConeGeometry(0.5, 3.2, 4);
      // point outward and slightly down
      frondGeo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2.4));
      frondGeo.applyMatrix4(new THREE.Matrix4().makeRotationY(a));
      frondGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(
        topX + Math.cos(a) * 1.3, trunkH + 0.5, topZ + Math.sin(a) * 1.3));
      push(MATS.foliage, frondGeo);
    }
    // top sphere
    push(MATS.foliage, new THREE.SphereGeometry(0.6, 8, 6).translate(topX, trunkH + 0.8, topZ));
  }

  /* ============================================================
     BENCH
     ============================================================ */
  function buildBench(b) {
    var w4 = new THREE.Matrix4().makeRotationY(b.rot).setPosition(b.x, 0, b.z);
    push(MATS.iron, new THREE.BoxGeometry(2.2, 0.08, 0.55).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.5, 0))));
    push(MATS.iron, new THREE.BoxGeometry(2.2, 0.7, 0.08).applyMatrix4(
      w4.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.85, -0.28))));
    for (var s = -1; s <= 1; s += 2) {
      push(MATS.iron, new THREE.BoxGeometry(0.08, 0.5, 0.55).applyMatrix4(
        w4.clone().multiply(new THREE.Matrix4().makeTranslation(s * 0.95, 0.25, 0))));
    }
  }

  /* ============================================================
     CARS — real Mumbai types
     ============================================================ */
  // Premier Padmini taxi — the classic black-and-yellow
  function buildPadmini() {
    var geos = [];
    // lower body (yellow)
    geos.push(new THREE.BoxGeometry(1.7, 0.5, 3.9).translate(0, 0.55, 0));
    // hood
    geos.push(new THREE.BoxGeometry(1.6, 0.32, 1.2).translate(0, 0.85, 1.2));
    // cabin (black top — merge separately in black mat)
    var cab = new THREE.BoxGeometry(1.55, 0.55, 1.85).translate(0, 1.15, -0.15);
    return { body: mergeGeoms(geos), cabin: cab };
  }
  var PADMINI = buildPadmini();

  // Auto-rickshaw — yellow body, black canopy
  function buildAuto() {
    var geos = [];
    geos.push(new THREE.BoxGeometry(1.35, 0.5, 2.4).translate(0, 0.55, 0));
    geos.push(new THREE.BoxGeometry(1.3, 0.7, 1.3).translate(0, 1.15, -0.3));
    geos.push(new THREE.BoxGeometry(1.2, 0.3, 1.0).translate(0, 0.55, 1.3)); // front
    return mergeGeoms(geos);
  }
  var AUTO_BODY = buildAuto();

  // BEST bus — long red
  function buildBus() {
    var geos = [];
    geos.push(new THREE.BoxGeometry(2.5, 2.0, 11.5).translate(0, 1.5, 0));
    geos.push(new THREE.BoxGeometry(2.55, 0.4, 11.5).translate(0, 2.75, 0));
    return mergeGeoms(geos);
  }
  var BUS_BODY = buildBus();

  // Modern sedan (Mercedes/Honda style)
  function buildSedan() {
    var geos = [];
    geos.push(new THREE.BoxGeometry(1.85, 0.55, 4.6).translate(0, 0.6, 0));
    geos.push(new THREE.BoxGeometry(1.75, 0.35, 1.5).translate(0, 0.9, 1.5));
    geos.push(new THREE.BoxGeometry(1.7, 0.55, 2.1).translate(0, 1.2, -0.2));
    geos.push(new THREE.BoxGeometry(1.75, 0.42, 1.2).translate(0, 0.9, -1.8));
    return mergeGeoms(geos);
  }
  var SEDAN_BODY = buildSedan();

  // Wheel geometry (shared)
  var WHEEL_GEO = (function () {
    var g = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10);
    g.rotateZ(Math.PI / 2);
    return g;
  })();

  // Car materials
  var CAR_YELLOW = new THREE.MeshStandardMaterial({ color: 0xf0c020, roughness: 0.35, metalness: 0.5 });
  var CAR_BLACK  = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.22, metalness: 0.82 });
  var CAR_RED    = new THREE.MeshStandardMaterial({ color: 0xa81a1a, roughness: 0.25, metalness: 0.72 });
  var CAR_SILVER = new THREE.MeshStandardMaterial({ color: 0xc0c4c8, roughness: 0.22, metalness: 0.78 });
  var CAR_WHITE  = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.32, metalness: 0.55 });
  var CAR_BLUE   = new THREE.MeshStandardMaterial({ color: 0x1a3a6a, roughness: 0.25, metalness: 0.75 });
  var BUS_RED    = new THREE.MeshStandardMaterial({ color: 0xb01818, roughness: 0.45, metalness: 0.35 });
  var GLASS_CAR  = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.08, metalness: 0.5 });
  var TIRE       = new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.92 });

  /* ============================================================
     PEOPLE — with legs and arms, sitting on sea wall too
     ============================================================ */
  function buildHumanGeo() {
    var geos = [];
    geos.push(new THREE.BoxGeometry(0.34, 0.6, 0.2).translate(0, 1.15, 0));
    geos.push(new THREE.SphereGeometry(0.13, 8, 6).translate(0, 1.62, 0));
    geos.push(new THREE.BoxGeometry(0.08, 0.5, 0.08).translate(-0.22, 1.1, 0));
    geos.push(new THREE.BoxGeometry(0.08, 0.5, 0.08).translate(0.22, 1.1, 0));
    geos.push(new THREE.BoxGeometry(0.11, 0.55, 0.11).translate(-0.09, 0.55, 0));
    geos.push(new THREE.BoxGeometry(0.11, 0.55, 0.11).translate(0.09, 0.55, 0));
    return mergeGeoms(geos);
  }
  var HUMAN_GEO = buildHumanGeo();
  var HUMAN_MATS = [
    new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x2a3a5a, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x8a2020, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0xc85020, roughness: 0.9 })
  ];

  /* ============================================================
     PATH SAMPLING
     ============================================================ */
  var _ptmp = new THREE.Vector3();
  var _dtmp = new THREE.Vector3();
  function prepPoly(points) {
    var pts = [], cum = [0], total = 0;
    for (var i = 0; i < points.length; i++) {
      var pt = points[i];
      var px = pt.x !== undefined ? pt.x : pt[0];
      var pz = pt.z !== undefined ? pt.z : pt[1];
      pts.push(new THREE.Vector2(px, pz));
    }
    for (var j = 1; j < pts.length; j++) {
      var dx = pts[j].x - pts[j - 1].x, dy = pts[j].y - pts[j - 1].y;
      total += Math.sqrt(dx * dx + dy * dy);
      cum.push(total);
    }
    return { pts: pts, cum: cum, total: total };
  }
  function samplePoly(poly, t, outPos, outDir) {
    if (!poly || poly.total <= 0) { outPos.set(0, 0, 0); outDir.set(0, 0, 1); return; }
    var u = ((t % poly.total) + poly.total) % poly.total;
    var lo = 0, hi = poly.cum.length - 1;
    while (lo < hi - 1) { var mid = (lo + hi) >> 1; if (poly.cum[mid] <= u) lo = mid; else hi = mid; }
    var a = poly.pts[lo], b = poly.pts[hi];
    var segLen = poly.cum[hi] - poly.cum[lo] || 1;
    var f = (u - poly.cum[lo]) / segLen;
    outPos.set(a.x + (b.x - a.x) * f, 0, a.y + (b.y - a.y) * f);
    var dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    outDir.set(dx / len, 0, dy / len);
  }

  /* ============================================================
     VEHICLES + PEOPLE ON LANES
     ============================================================ */
  var vehicles = [];

  function createVehicles() {
    var D = S.city.drive;
    var laneCount = S.city.trafficLanes.length;
    var perLane = Q.vehicles > 0 ? Math.max(4, Math.floor(Q.vehicles / laneCount)) : 6;

    for (var li = 0; li < laneCount; li++) {
      var lane = S.city.trafficLanes[li];
      var poly = prepPoly(lane.points);
      for (var k = 0; k < perLane; k++) {
        var typeRoll = RNG();
        var kind;
        if (typeRoll < 0.38) kind = 'padmini';
        else if (typeRoll < 0.55) kind = 'auto';
        else if (typeRoll < 0.72) kind = 'bus';
        else if (typeRoll < 0.90) kind = 'sedan';
        else kind = 'bus';

        var speed;
        if (kind === 'bus') speed = 7 + RNG() * 3;
        else if (kind === 'auto') speed = 8 + RNG() * 4;
        else speed = 11 + RNG() * 6;

        vehicles.push({
          kind: kind,
          poly: poly,
          t: RNG() * poly.total,
          speed: speed,
          dir: lane.dir,
          laneId: li
        });
      }
    }
  }

  function buildVehicleInstances() {
    // Group vehicles by (kind, color) — Padmini yellow bodies, black cabins; buses red; sedans multi-color
    var groups = {};
    for (var i = 0; i < vehicles.length; i++) {
      var v = vehicles[i];
      var key = v.kind;
      if (v.kind === 'sedan') {
        var colors = ['black', 'silver', 'white', 'blue', 'red'];
        v.colorIdx = Math.floor(RNG() * colors.length);
        key += '_' + v.colorIdx;
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    }

    var instances = [];
    Object.keys(groups).forEach(function (key) {
      var arr = groups[key];
      var kind = key.split('_')[0];
      var bodyGeo, cabinGeo, bodyMat, cabinMat;
      if (kind === 'padmini') {
        bodyGeo = PADMINI.body; cabinGeo = PADMINI.cabin;
        bodyMat = CAR_YELLOW; cabinMat = CAR_BLACK;
      } else if (kind === 'auto') {
        bodyGeo = AUTO_BODY; cabinGeo = null;
        bodyMat = CAR_YELLOW; cabinMat = null;
      } else if (kind === 'bus') {
        bodyGeo = BUS_BODY; cabinGeo = null;
        bodyMat = BUS_RED; cabinMat = null;
      } else { // sedan
        bodyGeo = SEDAN_BODY; cabinGeo = null;
        var ci = parseInt(key.split('_')[1]);
        var mats = [CAR_BLACK, CAR_SILVER, CAR_WHITE, CAR_BLUE, CAR_RED];
        bodyMat = mats[ci]; cabinMat = null;
      }
      var bodyMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, arr.length);
      bodyMesh.frustumCulled = false;
      bodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      var cabinMesh = cabinGeo ? new THREE.InstancedMesh(cabinGeo, cabinMat, arr.length) : null;
      if (cabinMesh) { cabinMesh.frustumCulled = false; cabinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
      var wheelMesh = new THREE.InstancedMesh(WHEEL_GEO, TIRE, arr.length * 4);
      wheelMesh.frustumCulled = false;
      wheelMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      instances.push({
        kind: kind, data: arr,
        body: bodyMesh, cabin: cabinMesh, wheels: wheelMesh
      });
    });
    return instances;
  }

  /* ============================================================
     PEOPLE — walking on promenade + sitting on sea wall
     ============================================================ */
  var walkers = [];
  var sitters = [];

  function createPeople() {
    var count = Math.max(60, Q.pedestrians || 200);

    // Promenade polyline (middle of promenade)
    var D = S.city.drive;
    var promPts = [];
    var N = S.city.curve.samples;
    var midOff = D.roadHalfWidth + D.outerSidewalk + D.promenadeWidth * 0.5;
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1);
      var p = S.city.curve.point(t);
      var n = S.city.curve.perp(t);
      promPts.push({ x: p.x + n.x * midOff, z: p.z + n.z * midOff });
    }
    var promPoly = prepPoly(promPts);

    for (var k = 0; k < Math.floor(count * 0.7); k++) {
      walkers.push({
        poly: promPoly,
        t: RNG() * promPoly.total,
        speed: 1.0 + RNG() * 0.9,
        dir: RNG() < 0.5 ? 1 : -1,
        matIdx: Math.floor(RNG() * HUMAN_MATS.length),
        phase: RNG() * Math.PI * 2
      });
    }

    // Sitters on sea wall (facing sea = outward from promenade)
    var wallPts = [];
    for (var i2 = 0; i2 < N; i2++) {
      var t2 = i2 / (N - 1);
      var p2 = S.city.curve.point(t2);
      var n2 = S.city.curve.perp(t2);
      var off = D.roadHalfWidth + D.outerSidewalk + D.promenadeWidth - 0.3;
      wallPts.push({ x: p2.x + n2.x * off, z: p2.z + n2.z * off });
    }
    var wallPoly = prepPoly(wallPts);
    var sitCount = Math.floor(count * 0.3);
    for (var s = 0; s < sitCount; s++) {
      sitters.push({
        poly: wallPoly,
        t: RNG() * wallPoly.total,
        matIdx: Math.floor(RNG() * HUMAN_MATS.length),
        phase: RNG() * Math.PI * 2
      });
    }
  }

  function buildPeopleMeshes() {
    // Walking people — grouped by material
    var byMat = {};
    for (var i = 0; i < walkers.length; i++) {
      var w = walkers[i];
      if (!byMat[w.matIdx]) byMat[w.matIdx] = [];
      byMat[w.matIdx].push(w);
    }
    var walkingMeshes = [];
    Object.keys(byMat).forEach(function (mi) {
      var arr = byMat[mi];
      var m = new THREE.InstancedMesh(HUMAN_GEO, HUMAN_MATS[mi], arr.length);
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      walkingMeshes.push({ mesh: m, data: arr });
    });

    // Sitters — same geometry, different height (seated position)
    var sitByMat = {};
    for (var j = 0; j < sitters.length; j++) {
      var st = sitters[j];
      if (!sitByMat[st.matIdx]) sitByMat[st.matIdx] = [];
      sitByMat[st.matIdx].push(st);
    }
    var sittingMeshes = [];
    Object.keys(sitByMat).forEach(function (mi) {
      var arr = sitByMat[mi];
      var m = new THREE.InstancedMesh(HUMAN_GEO, HUMAN_MATS[mi], arr.length);
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      sittingMeshes.push({ mesh: m, data: arr });
    });
    return { walking: walkingMeshes, sitting: sittingMeshes };
  }

  /* ============================================================
     ANIMATE
     ============================================================ */
  var _m4 = new THREE.Matrix4();
  var _m4b = new THREE.Matrix4();
  var _q = new THREE.Quaternion();
  var _p = new THREE.Vector3();
  var _d = new THREE.Vector3();
  var _up = new THREE.Vector3(0, 1, 0);
  var _s1 = new THREE.Vector3(1, 1, 1);
  var _tp = new THREE.Vector3();
  var _wheelOffsets = [
    [-0.85, 0.34, 1.45], [0.85, 0.34, 1.45],
    [-0.85, 0.34, -1.55], [0.85, 0.34, -1.55]
  ];

  var vehicleInstances = null;
  var peopleMeshes = null;

  function animate(elapsed, dt) {
    // Vehicles
    if (vehicleInstances) {
      for (var vi = 0; vi < vehicleInstances.length; vi++) {
        var inst = vehicleInstances[vi];
        for (var i = 0; i < inst.data.length; i++) {
          var v = inst.data[i];
          v.t += v.speed * dt * v.dir;
          samplePoly(v.poly, v.t, _p, _d);
          // slight offset so different types don't overlap perfectly
          var typeOffset = inst.kind === 'bus' ? 0 : (inst.kind === 'auto' ? 0.6 : 0.2);
          var yaw = Math.atan2(_d.x * v.dir, _d.z * v.dir);
          _q.setFromAxisAngle(_up, yaw);
          _tp.set(_p.x, 0, _p.z);
          _m4.compose(_tp, _q, _s1);
          inst.body.setMatrixAt(i, _m4);
          if (inst.cabin) inst.cabin.setMatrixAt(i, _m4);
          // wheels
          for (var w = 0; w < 4; w++) {
            var offset = _wheelOffsets[w];
            _tp.set(_p.x, 0, _p.z);
            var rotQ = _q.clone().multiply(
              new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0))
            );
            _m4b.compose(
              new THREE.Vector3(
                _p.x + Math.cos(yaw) * offset[0] + Math.sin(yaw) * offset[2],
                offset[1],
                _p.z - Math.sin(yaw) * offset[0] + Math.cos(yaw) * offset[2]
              ),
              _q, _s1
            );
            inst.wheels.setMatrixAt(i * 4 + w, _m4b);
          }
        }
        inst.body.instanceMatrix.needsUpdate = true;
        if (inst.cabin) inst.cabin.instanceMatrix.needsUpdate = true;
        inst.wheels.instanceMatrix.needsUpdate = true;
      }
    }

    // Walking people
    if (peopleMeshes) {
      for (var wi = 0; wi < peopleMeshes.walking.length; wi++) {
        var wInst = peopleMeshes.walking[wi];
        for (var k = 0; k < wInst.data.length; k++) {
          var wk = wInst.data[k];
          wk.t += wk.speed * dt * wk.dir;
          samplePoly(wk.poly, wk.t, _p, _d);
          var bob = Math.sin(elapsed * 6 + wk.phase) * 0.05;
          _tp.set(_p.x, bob, _p.z);
          var wyaw = Math.atan2(_d.x * wk.dir, _d.z * wk.dir);
          _q.setFromAxisAngle(_up, wyaw);
          _m4.compose(_tp, _q, _s1);
          wInst.mesh.setMatrixAt(k, _m4);
        }
        wInst.mesh.instanceMatrix.needsUpdate = true;
      }

      // Sitters on sea wall — face outward (toward sea)
      for (var si = 0; si < peopleMeshes.sitting.length; si++) {
        var sInst = peopleMeshes.sitting[si];
        for (var si2 = 0; si2 < sInst.data.length; si2++) {
          var st = sInst.data[si2];
          samplePoly(st.poly, st.t, _p, _d);
          var perpX = -_d.z, perpZ = _d.x;
          _tp.set(_p.x, -0.5, _p.z); // lowered to look seated
          var syaw = Math.atan2(perpX, perpZ);
          _q.setFromAxisAngle(_up, syaw);
          _m4.compose(_tp, _q, _s1);
          sInst.mesh.setMatrixAt(si2, _m4);
        }
        sInst.mesh.instanceMatrix.needsUpdate = true;
      }
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
  group.name = 'marine-drive';

  // Road, sidewalks, promenade, sea wall
  buildRoadAndPromenade();

  // Buildings
  for (var i = 0; i < S.city.buildings.length; i++) buildDecoBuilding(S.city.buildings[i]);

  // Lamps
  for (var j = 0; j < S.city.lamps.length; j++) buildLamp(S.city.lamps[j]);

  // Palms
  for (var k = 0; k < S.city.palms.length; k++) buildPalm(S.city.palms[k]);

  // Benches
  for (var b = 0; b < S.city.benches.length; b++) buildBench(S.city.benches[b]);

  flush(group);

  // Sea (add separately — it's a unique mesh)
  if (S.__marineDrive_sea) group.add(S.__marineDrive_sea);

  // Signs
  if (S.__marineSigns) {
    for (var s = 0; s < S.__marineSigns.length; s++) group.add(S.__marineSigns[s]);
    S.__marineSigns = [];
  }

  // Vehicles + people
  createVehicles();
  createPeople();
  vehicleInstances = buildVehicleInstances();
  peopleMeshes = buildPeopleMeshes();

  for (var vi = 0; vi < vehicleInstances.length; vi++) {
    group.add(vehicleInstances[vi].body);
    if (vehicleInstances[vi].cabin) group.add(vehicleInstances[vi].cabin);
    group.add(vehicleInstances[vi].wheels);
  }
  for (var wi = 0; wi < peopleMeshes.walking.length; wi++) group.add(peopleMeshes.walking[wi].mesh);
  for (var si = 0; si < peopleMeshes.sitting.length; si++) group.add(peopleMeshes.sitting[si].mesh);

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
      pedestrians: walkers.length + sitters.length,
      vehicles: vehicles.length,
      walkers: walkers.length,
      sitters: sitters.length
    }
  };

  S.log('buildings', true,
    'Marine Drive · ' +
    S.city.buildings.length + ' buildings · ' +
    S.city.lamps.length + ' lamps · ' +
    S.city.palms.length + ' palms · ' +
    S.buildings.count + ' meshes');
  S.log('life', true,
    vehicles.length + ' vehicles · ' +
    walkers.length + ' walkers · ' +
    sitters.length + ' sea-wall sitters');

})();
