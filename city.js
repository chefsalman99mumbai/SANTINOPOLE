/* ============================================================
   SANTINOPOLE — city.js — MILAN, ENDLESS
   ------------------------------------------------------------
   Three layers:
     LOD 0 — Detailed Milan (0–520)  → full block/courtyard grid
     LOD 1 — Middle City    (520–1700) → coarse grid
     LOD 2 — Distant City   (1700–5000) → dense lattice, no edge
   ============================================================ */

(function () {
  'use strict';

  var S = window.SANTINOPOLE;
  if (!S || !S.performance) { console.error('[city.js] performance.js must load first.'); return; }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var RNG = mulberry32(20241024);
  function rand(a, b) { return a + RNG() * (b - a); }

  var MILAN = {
    outerR: 5000,
    detailR: 520,
    middleR: 1700,
    ring1R: 220, ring2R: 460,
    blockCenter: 60, streetCenter: 12,
    blockMiddle: 90, streetMiddle: 14,
    blockOuter:  110, streetOuter:  16,
    ringW: 32, radialW: 24, numRadials: 8,
    buildingDepth: 18
  };

  var gridStepCenter = MILAN.blockCenter + MILAN.streetCenter;
  var gridStepMiddle = MILAN.blockMiddle + MILAN.streetMiddle;
  var gridStepOuter  = MILAN.blockOuter  + MILAN.streetOuter;

  /* ============================================================
     DISTRICTS
     ============================================================ */
  var DISTRICTS = [
    { id: 'centro',   name: 'Centro',             type: 'downtown',    center: [0,     0],    radius: 200, density: 1.0, character: 'financial' },
    { id: 'brera',    name: 'Atelier Quarter',    type: 'arts',        center: [-110, -180],  radius: 130, density: 0.95, character: 'cultural' },
    { id: 'moda',     name: 'Fashion District',   type: 'fashion',     center: [140,  -60],   radius: 140, density: 0.95, character: 'fashion' },
    { id: 'isola',    name: 'Web Quarter',        type: 'web',         center: [240, -320],   radius: 200, density: 0.9, character: 'creative' },
    { id: 'citta',    name: 'Index Ward',         type: 'seo',         center: [500, -180],   radius: 180, density: 0.85, character: 'data' },
    { id: 'corso',    name: 'Grand Corso',        type: 'shopping',    center: [280,  -40],   radius: 150, density: 1.0, character: 'shopping' },
    { id: 'romana',   name: 'Growth Front',       type: 'growth',      center: [80,   400],   radius: 200, density: 1.0, character: 'commercial' },
    { id: 'navigli',  name: 'Canal Quarter',      type: 'canal',       center: [-340, 320],   radius: 240, density: 0.9, character: 'canal' },
    { id: 'ticinese', name: 'Ticinese',           type: 'residential', center: [-140, 380],   radius: 130, density: 0.9, character: 'residential' },
    { id: 'sempione', name: 'Linden Green',       type: 'park',        center: [-220, -220],  radius: 140, density: 0.0, character: 'park' },
    { id: 'fiera',    name: 'Fiera District',     type: 'commercial',  center: [-540, -120],  radius: 200, density: 0.75, character: 'commercial' },
    { id: 'nord',     name: 'Northern Ridges',    type: 'residential', center: [0,   -560],   radius: 260, density: 0.5, character: 'residential' },
    { id: 'sud',      name: 'Southern Ridges',    type: 'residential', center: [0,    560],   radius: 260, density: 0.5, character: 'residential' },
    { id: 'est',      name: 'Eastern Ridges',     type: 'residential', center: [600,    0],   radius: 200, density: 0.5, character: 'residential' },
    { id: 'ovest',    name: 'Western Ridges',     type: 'residential', center: [-600,   0],   radius: 200, density: 0.5, character: 'residential' }
  ];

  function districtAt(x, z) {
    var best = null, bestDist = Infinity;
    for (var i = 0; i < DISTRICTS.length; i++) {
      var d = DISTRICTS[i];
      var dx = x - d.center[0], dz = z - d.center[1];
      var dd = dx*dx + dz*dz;
      if (dd < d.radius*d.radius && dd < bestDist) { best = d; bestDist = dd; }
    }
    return best;
  }

  var publicSpaces = [
    { id: 'piazza-duomo', name: 'Piazza Santino', kind: 'plaza', x: 0, z: 0, radius: 52 },
    { id: 'park-sempione', name: 'Linden Green', kind: 'park', x: -220, z: -220, radius: 140 },
    { id: 'park-nord', name: 'Northern Gardens', kind: 'park', x: 0, z: -660, radius: 110 },
    { id: 'park-sud', name: 'Southern Gardens', kind: 'park', x: 0, z: 660, radius: 110 },
    { id: 'park-fiera', name: 'Fiera Grounds', kind: 'park', x: -540, z: -120, radius: 80 }
  ];
  function inPark(x, z) {
    for (var i = 0; i < publicSpaces.length; i++) {
      var p = publicSpaces[i];
      if (p.kind !== 'park') continue;
      var dx = x - p.x, dz = z - p.z;
      if (dx*dx + dz*dz < p.radius * p.radius) return true;
    }
    return false;
  }
  function nearPiazza(x, z) {
    var p = publicSpaces[0];
    var dx = x - p.x, dz = z - p.z;
    return (dx*dx + dz*dz) < (p.radius + 40) * (p.radius + 40);
  }

  /* ============================================================
     STREETS
     ============================================================ */
  var streets = [];
  var sid = 0;
  function makeStreet(kind, width, points) {
    streets.push({ id: 's' + (sid++), kind: kind, width: width, points: points });
  }

  function buildGridStreets() {
    for (var x = -180; x <= 180; x += gridStepCenter) makeStreet('grid', MILAN.streetCenter, [[x, -200], [x, 200]]);
    for (var z = -180; z <= 180; z += gridStepCenter) makeStreet('grid', MILAN.streetCenter, [[-200, z], [200, z]]);
    for (var x2 = -420; x2 <= 420; x2 += gridStepMiddle) makeStreet('grid', MILAN.streetMiddle, [[x2, -460], [x2, 460]]);
    for (var z2 = -420; z2 <= 420; z2 += gridStepMiddle) makeStreet('grid', MILAN.streetMiddle, [[-460, z2], [460, z2]]);
    // Outer street lines exist far into the distance — gives the endless feel
    for (var x3 = -1600; x3 <= 1600; x3 += gridStepOuter) makeStreet('grid', MILAN.streetOuter, [[x3, -1800], [x3, 1800]]);
    for (var z3 = -1600; z3 <= 1600; z3 += gridStepOuter) makeStreet('grid', MILAN.streetOuter, [[-1800, z3], [1800, z3]]);
  }
  buildGridStreets();

  function buildRings() {
    [MILAN.ring1R, MILAN.ring2R].forEach(function (R) {
      var pts = [], seg = 128;
      for (var i = 0; i <= seg; i++) {
        var a = (i / seg) * Math.PI * 2;
        pts.push([Math.cos(a) * R, Math.sin(a) * R]);
      }
      makeStreet('ring', MILAN.ringW, pts);
    });
  }
  buildRings();

  function buildRadials() {
    for (var k = 0; k < MILAN.numRadials; k++) {
      var a = (k / MILAN.numRadials) * Math.PI * 2;
      var cs = Math.cos(a), sn = Math.sin(a);
      var pts = [];
      for (var r = 60; r <= MILAN.outerR + 20; r += 40) pts.push([cs * r, sn * r]);
      makeStreet('radial', MILAN.radialW, pts);
    }
  }
  buildRadials();

  /* ============================================================
     LANDMARKS
     ============================================================ */
  var LANDMARKS = [
    { id: 'spire',      name: 'The Santinopole Spire', x: 0,     z: 0,     type: 'civic',      district: 'centro',   h: 180 },
    { id: 'exchange',   name: 'The Exchange',          x: 90,    z: 20,    type: 'civic',      district: 'centro',   h: 55 },
    { id: 'piazza',     name: 'Piazza Santino',        x: 60,    z: 0,     type: 'civic',      district: 'centro',   h: 40 },
    { id: 'cathedral',  name: 'Chiesa di Santino',     x: -100,  z: 60,    type: 'civic',      district: 'centro',   h: 80 },
    { id: 'webhub',     name: 'Torre Nuova',           x: 240,   z: -320,  type: 'tower',      district: 'isola',    h: 160 },
    { id: 'glassworks', name: 'Torre Vetro',           x: 340,   z: -240,  type: 'tower',      district: 'isola',    h: 130 },
    { id: 'observat',   name: 'The Observatory',       x: 180,   z: -400,  type: 'tower',      district: 'isola',    h: 100 },
    { id: 'index',      name: 'The Index',             x: 500,   z: -180,  type: 'data',       district: 'citta',    h: 90 },
    { id: 'signal',     name: 'Signal Tower',          x: 580,   z: -100,  type: 'data',       district: 'citta',    h: 100 },
    { id: 'market',     name: 'Porta Romana Gate',     x: 80,    z: 400,   type: 'commercial', district: 'romana',   h: 55 },
    { id: 'bowl',       name: 'The Bowl',              x: -40,   z: 460,   type: 'commercial', district: 'romana',   h: 50 },
    { id: 'pier',       name: 'Porta Genova',          x: -340,  z: 320,   type: 'pavilion',   district: 'navigli',  h: 26 },
    { id: 'beacon',     name: 'The Beacon',            x: -440,  z: 400,   type: 'pavilion',   district: 'navigli',  h: 40 },
    { id: 'gallery',    name: 'The Galleria',          x: 140,   z: -60,   type: 'pavilion',   district: 'moda',     h: 42 },
    { id: 'amphithe',   name: 'The Amphitheatre',      x: 200,   z: 0,     type: 'pavilion',   district: 'moda',     h: 28 },
    { id: 'arcade',     name: 'The Arcade',            x: -110,  z: -180,  type: 'pavilion',   district: 'brera',    h: 30 },
    { id: 'linden',     name: 'Linden Pavilion',       x: -220,  z: -220,  type: 'pavilion',   district: 'sempione', h: 14 },
    { id: 'cemetery',   name: 'Cimitero dei Ricordi',  x: 400,   z: 500,   type: 'pavilion',   district: 'sud',      h: 20 },
    { id: 'ivy',        name: 'Ivy Conservatory',      x: -540,  z: -120,  type: 'pavilion',   district: 'fiera',    h: 16 }
  ];
  function nearLandmark(x, z) {
    for (var i = 0; i < LANDMARKS.length; i++) {
      var L = LANDMARKS[i];
      var dx = x - L.x, dz = z - L.z;
      if (dx*dx + dz*dz < 55*55) return true;
    }
    return false;
  }

  /* ============================================================
     LOTS
     ============================================================ */
  var lots = [];

  function pushLot(x, z, w, d, h, rot, type, character, districtId, lod) {
    lots.push({ x: x, z: z, w: w, d: d, h: h, rot: rot, type: type, districtId: districtId, character: character, lod: lod || 0 });
  }

  var CHARACTER_BUILDINGS = {
    financial:     ['block', 'block', 'office', 'block'],
    creative:      ['creative', 'creative', 'block'],
    data:          ['data', 'office', 'block'],
    commercial:    ['block', 'block', 'commercial'],
    harbor:        ['warehouse', 'block'],
    civic:         ['pavilion', 'block', 'block'],
    residential:   ['block', 'block', 'rowhouse'],
    cultural:      ['block', 'block', 'creative'],
    fashion:       ['block', 'block', 'block'],
    shopping:      ['block', 'commercial', 'block'],
    canal:         ['block', 'block', 'commercial'],
    entertainment: ['commercial', 'block', 'block'],
    park:          ['pavilion']
  };
  function pickType(character) {
    var arr = CHARACTER_BUILDINGS[character] || CHARACTER_BUILDINGS.residential;
    var r = RNG();
    if (r < 0.62) return arr[0];
    if (r < 0.90 && arr[1]) return arr[1];
    return arr[2] || arr[0];
  }
  var HEIGHTS = {
    financial:     [22, 72], creative:      [20, 46], data:          [22, 52],
    commercial:    [16, 34], harbor:        [12, 24], civic:         [18, 34],
    residential:   [14, 26], cultural:      [16, 30], fashion:       [16, 28],
    shopping:      [14, 26], canal:         [14, 26], entertainment: [14, 28], park: [10, 16]
  };
  function pickHeight(character) {
    var range = HEIGHTS[character] || HEIGHTS.residential;
    var t = 0.15 + RNG() * 0.7;
    return range[0] + (range[1] - range[0]) * t;
  }

  function fillEdge(sx, sz, ex, ez, depth, character, districtId) {
    var dx = ex - sx, dz = ez - sz;
    var edgeLen = Math.sqrt(dx*dx + dz*dz);
    if (edgeLen < 25) return;
    var ux = dx / edgeLen, uz = dz / edgeLen;
    var px = -uz, pz = ux;
    var rot = (Math.abs(ux) > 0.7) ? 0 : (Math.abs(uz) > 0.7 ? Math.PI / 2 : Math.atan2(ux, uz));
    var numBuildings = edgeLen < 70 ? 2 : 3;
    var typeA = pickType(character), typeB = pickType(character);

    for (var k = 0; k < numBuildings; k++) {
      var t0 = (k / numBuildings) * edgeLen;
      var t1 = ((k + 1) / numBuildings) * edgeLen;
      var w = t1 - t0 - 0.4;
      var midT = (t0 + t1) / 2;
      var ex2 = sx + ux * midT;
      var ez2 = sz + uz * midT;
      var bx = ex2 + px * depth / 2;
      var bz = ez2 + pz * depth / 2;
      var h = pickHeight(character);
      var type = (k === 0 || k === numBuildings - 1) ? typeA : typeB;
      pushLot(bx, bz, w, depth, h, rot, type, character, districtId, 0);
    }
  }

  function fillBlock(cx, cz, blockSize, district) {
    var half = blockSize / 2;
    if (cz - half < -720) return;
    if (nearLandmark(cx, cz)) return;
    if (nearPiazza(cx, cz)) return;
    if (inPark(cx, cz)) return;
    var r = Math.sqrt(cx*cx + cz*cz);
    var ringTol = half + MILAN.ringW / 2 + 4;
    if (Math.abs(r - MILAN.ring1R) < ringTol) return;
    if (Math.abs(r - MILAN.ring2R) < ringTol) return;
    if (r > 50) {
      var angle = Math.atan2(cz, cx);
      var step = (Math.PI * 2) / MILAN.numRadials;
      var offset = Math.round(angle / step) * step;
      var nx = Math.cos(offset), nz = Math.sin(offset);
      var perpDist = Math.abs(-nz * cx + nx * cz);
      if (perpDist < half + MILAN.radialW / 2 + 4) return;
    }
    var character = district ? district.character : 'residential';
    var districtId = district ? district.id : 'outskirts';
    var depth = Math.min(MILAN.buildingDepth, blockSize * 0.28);
    fillEdge(cx - half, cz - half, cx + half, cz - half, depth, character, districtId);
    fillEdge(cx + half, cz - half, cx + half, cz + half, depth, character, districtId);
    fillEdge(cx + half, cz + half, cx - half, cz + half, depth, character, districtId);
    fillEdge(cx - half, cz + half, cx - half, cz - half, depth, character, districtId);
  }

  function generateDetailedMilan() {
    for (var x = -180; x <= 180; x += gridStepCenter)
      for (var z = -180; z <= 180; z += gridStepCenter)
        fillBlock(x, z, MILAN.blockCenter, districtAt(x, z));
    for (var x2 = -440; x2 <= 440; x2 += gridStepMiddle)
      for (var z2 = -440; z2 <= 440; z2 += gridStepMiddle) {
        var rr = Math.sqrt(x2*x2 + z2*z2);
        if (rr < 200) continue;
        if (rr > MILAN.detailR + 100) continue;
        fillBlock(x2, z2, MILAN.blockMiddle, districtAt(x2, z2));
      }
  }
  generateDetailedMilan();

  /* ============================================================
     ★ MIDDLE CITY — LOD 1
     Coarse grid, one box per cell, taller mid-rise mass
     ============================================================ */
  function generateMiddleCity() {
    var step = 130;
    var jitter = 18;
    for (var x = -MILAN.middleR; x <= MILAN.middleR; x += step) {
      for (var z = -MILAN.middleR; z <= MILAN.middleR; z += step) {
        var r = Math.sqrt(x*x + z*z);
        if (r < MILAN.detailR - 30) continue;
        if (r > MILAN.middleR) continue;
        if (inPark(x, z)) continue;
        var d = districtAt(x, z);
        var character = d ? d.character : 'residential';
        var jx = x + (RNG() - 0.5) * jitter;
        var jz = z + (RNG() - 0.5) * jitter;
        var w = 55 + RNG() * 45;
        var dd = 55 + RNG() * 45;
        var h;
        if (character === 'financial' || character === 'data') h = 40 + RNG() * 70;
        else if (character === 'creative' || character === 'commercial') h = 30 + RNG() * 50;
        else if (character === 'residential') h = 20 + RNG() * 30;
        else h = 25 + RNG() * 45;
        pushLot(jx, jz, w, dd, h, (RNG() - 0.5) * 0.2, 'block', character, d ? d.id : 'mid', 1);
      }
    }
  }
  generateMiddleCity();

  /* ============================================================
     ★ DISTANT CITY — LOD 2
     Dense lattice of boxes fading into haze. No visible edge.
     ============================================================ */
  function generateDistantCity() {
    var step = 90;
    var jitter = 28;
    var maxR = MILAN.outerR;
    for (var x = -maxR; x <= maxR; x += step) {
      for (var z = -maxR; z <= maxR; z += step) {
        var r = Math.sqrt(x*x + z*z);
        if (r < MILAN.middleR - 40) continue;
        if (r > maxR) continue;
        // Density fade — sparser at the very edge to blend into haze
        var fade = 1 - (r - MILAN.middleR) / (maxR - MILAN.middleR);
        fade = Math.min(1, fade * 1.4);
        if (RNG() > fade) continue;
        var jx = x + (RNG() - 0.5) * jitter;
        var jz = z + (RNG() - 0.5) * jitter;
        var w = 40 + RNG() * 50;
        var dd = 40 + RNG() * 50;
        // Heights — taller towers clustered near center to create distant skyline peaks
        var h = 25 + RNG() * 90;
        // Rare tall towers
        if (RNG() < 0.04) h = 130 + RNG() * 80;
        pushLot(jx, jz, w, dd, h, (RNG() - 0.5) * 0.4, 'block', 'distant', 'distant', 2);
      }
    }
  }
  generateDistantCity();

  /* ============================================================
     TRANSIT
     ============================================================ */
  var transit = { lines: [], stations: [] };
  function buildTransit() {
    var ring1Pts = [];
    for (var i = 0; i <= 64; i++) { var a = (i/64)*Math.PI*2; ring1Pts.push([Math.cos(a)*MILAN.ring1R, Math.sin(a)*MILAN.ring1R]); }
    transit.lines.push({ id: 'tram-inner', name: 'Cerchia Tram', color: '#d4a24a', points: ring1Pts });

    var ring2Pts = [];
    for (var j = 0; j <= 64; j++) { var a2 = (j/64)*Math.PI*2; ring2Pts.push([Math.cos(a2)*MILAN.ring2R, Math.sin(a2)*MILAN.ring2R]); }
    transit.lines.push({ id: 'tram-outer', name: 'Bastioni Tram', color: '#c96b5a', points: ring2Pts });

    transit.lines.push({ id: 'tram-ew', name: 'Decumano', color: '#5a9bd4', points: [[-760, 0], [760, 0]] });
    transit.lines.push({ id: 'tram-ns', name: 'Cardo', color: '#5a9bd4', points: [[0, -760], [0, 760]] });

    var sp = [
      { x: 0, z: 0, name: 'Duomo', district: 'centro' },
      { x: 220, z: 0, name: 'Porta Venezia', district: 'corso' },
      { x: -220, z: 0, name: 'Porta Genova', district: 'navigli' },
      { x: 0, z: -220, name: 'Porta Nuova', district: 'isola' },
      { x: 0, z: 220, name: 'Porta Romana', district: 'romana' },
      { x: 460, z: 0, name: 'Città Studi', district: 'citta' },
      { x: -460, z: 0, name: 'Fiera', district: 'fiera' },
      { x: 140, z: -60, name: 'Montenapoleone', district: 'moda' },
      { x: -110, z: -180, name: 'Brera', district: 'brera' },
      { x: -340, z: 320, name: 'Navigli', district: 'navigli' }
    ];
    for (var k = 0; k < sp.length; k++) transit.stations.push({ id: 'st-' + k, name: sp[k].name, x: sp[k].x, z: sp[k].z, district: sp[k].district });
  }
  buildTransit();

  function computeBoundary() {
    var h = MILAN.outerR + 30, pts = [], seg = 64;
    for (var i = 0; i < seg; i++) {
      var a = (i / seg) * Math.PI * 2;
      pts.push([Math.cos(a) * h, Math.sin(a) * h]);
    }
    return pts;
  }
  var boundary = computeBoundary();

  S.city = {
    boundary: boundary,
    bay: { edgeZ: -720, promenadeZ: -680, width: 3000 },
    hills: { startZ: 620, peakZ: 1000, maxHeight: 140 },
    districts: DISTRICTS.map(function (d) {
      return { id: d.id, name: d.name, type: d.type, character: d.character, center: d.center.slice(), radius: d.radius, density: d.density };
    }),
    streets: streets,
    lots: lots,
    landmarks: LANDMARKS,
    publicSpaces: publicSpaces,
    transit: transit,
    constants: { streetWidth: MILAN.streetCenter, halfSize: MILAN.outerR, gridStep: MILAN.blockCenter },
    helpers: { districtAt: districtAt, random: RNG },
    stats: {
      districtCount: DISTRICTS.length, streetCount: streets.length,
      lotCount: lots.length, landmarkCount: LANDMARKS.length,
      spaceCount: publicSpaces.length, transitLines: transit.lines.length,
      transitStations: transit.stations.length
    }
  };

  var lodCounts = [0, 0, 0];
  for (var lp = 0; lp < lots.length; lp++) lodCounts[lots[lp].lod]++;

  S.log('city', true,
    DISTRICTS.length + ' districts · ' + streets.length + ' streets · ' +
    lots.length + ' lots (LOD 0/1/2: ' + lodCounts[0] + '/' + lodCounts[1] + '/' + lodCounts[2] + ')');

})();
