
/* ============================================================
   SANTINOPOLE — city.js
   ------------------------------------------------------------
   The geographic spine. Procedurally generates the city graph:
   districts, street network, building lots, landmarks, public
   spaces, and transit.

   Depends on: three.js (S.log), performance.js (S.performance.Q)
   Exposes:    window.SANTINOPOLE.city
   ============================================================ */

(function () {
  'use strict';

  var S = window.SANTINOPOLE;
  if (!S || !S.performance) {
    console.error('[city.js] performance.js must load first.');
    return;
  }
  var Q = S.performance.Q;

  /* ---------- SEEDED RNG (deterministic city) ---------- */
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

  /* ---------- CITY CONSTANTS ---------- */
  var CITY = {
    halfSize: 900,
    bayEdgeZ: -720,
    promenadeZ: -680,
    hillStartZ: 620,
    streetWidth: 8,
    boulevardWidth: 18
  };

  /* ============================================================
     DISTRICTS — the souls of the city
     ============================================================ */
  var DISTRICTS = [
    { id: 'downtown',   name: 'The Spine',        type: 'downtown',    center: [0,    0],    radius: 220, density: 0.95, character: 'financial' },
    { id: 'web',        name: 'Web Quarter',      type: 'web',         center: [420, -80],   radius: 230, density: 0.75, character: 'creative' },
    { id: 'seo',        name: 'Index Ward',       type: 'seo',         center: [-420,-80],   radius: 230, density: 0.75, character: 'data' },
    { id: 'growth',     name: 'Growth Front',     type: 'growth',      center: [0,   -420],  radius: 260, density: 0.85, character: 'commercial' },
    { id: 'waterfront', name: 'The Embarcadero',  type: 'waterfront',  center: [0,   -620],  radius: 180, density: 0.50, character: 'harbor' },
    { id: 'civic',      name: 'Piazza Santino',   type: 'civic',       center: [0,    420],  radius: 160, density: 0.55, character: 'civic' },
    { id: 'hills',      name: 'The Ridges',       type: 'residential', center: [0,    720],  radius: 380, density: 0.60, character: 'residential' },
    { id: 'arts',       name: 'Atelier Row',      type: 'arts',        center: [340,  380],  radius: 140, density: 0.70, character: 'cultural' },
    { id: 'nightlife',  name: 'Neon Ward',        type: 'nightlife',   center: [-340, 380],  radius: 140, density: 0.70, character: 'entertainment' },
    { id: 'parks_e',    name: 'Linden Green',     type: 'park',        center: [640, -280],  radius: 140, density: 0.05, character: 'park' },
    { id: 'parks_w',    name: 'Ivy Commons',      type: 'park',        center: [-640,-280],  radius: 140, density: 0.05, character: 'park' }
  ];

  function districtAt(x, z) {
    var best = null, bestDist = Infinity;
    for (var i = 0; i < DISTRICTS.length; i++) {
      var d = DISTRICTS[i];
      var dx = x - d.center[0];
      var dz = z - d.center[1];
      var dd = dx * dx + dz * dz;
      if (dd < d.radius * d.radius && dd < bestDist) { best = d; bestDist = dd; }
    }
    return best;
  }

  /* ============================================================
     STREETS — five patterns, one city
     ============================================================ */
  var streets = [];
  var sid = 0;
  function makeStreet(kind, width, points) {
    streets.push({ id: 's' + (sid++), kind: kind, width: width, points: points });
  }

  function generateRings() {
    var radii = [140, 260, 380, 520, 660];
    for (var r = 0; r < radii.length; r++) {
      var R = radii[r];
      var pts = [];
      var seg = 96;
      for (var i = 0; i <= seg; i++) {
        var a = (i / seg) * Math.PI * 2;
        var noise = 1 + Math.sin(a * 5 + r * 1.3) * 0.02;
        var z = Math.sin(a) * R * noise;
        if (z < CITY.bayEdgeZ - 5) continue;
        pts.push([Math.cos(a) * R * noise, z]);
      }
      if (pts.length > 4) makeStreet('ring', r === 0 ? 14 : (r % 2 === 0 ? 12 : 10), pts);
    }
  }

  function generateRadials() {
    var count = 12;
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2;
      var isMajor = (i % 3 === 0);
      var pts = [];
      for (var r = 30; r <= CITY.halfSize * 1.1; r += 30) {
        var curve = Math.sin(r * 0.003 + i * 2) * r * 0.05;
        var offA = a + curve * 0.01;
        var z = Math.sin(offA) * r;
        if (z < CITY.bayEdgeZ - 5) break;
        pts.push([Math.cos(offA) * r, z]);
      }
      if (pts.length > 3) makeStreet(isMajor ? 'radial' : 'grid', isMajor ? 18 : 11, pts);
    }
  }

  function generateDistrictGrid(d) {
    if (d.character === 'park') return;
    var cx = d.center[0], cz = d.center[1], R = d.radius;
    var rotMap = { financial: 0, creative: 0.12, data: -0.08, commercial: 0,
                   harbor: 0, civic: 0.26, residential: 0.15, cultural: 0.09,
                   entertainment: -0.14 };
    var rot = rotMap[d.character] || 0;
    var cosR = Math.cos(rot), sinR = Math.sin(rot);
    var spacing = d.type === 'downtown' ? 55 :
                  d.type === 'residential' ? 70 :
                  d.type === 'waterfront' ? 90 : 62;
    var count = Math.floor(R * 1.6 / spacing);
    var R2 = (R + 20) * (R + 20);

    for (var i = -count; i <= count; i++) {
      var local = i * spacing;
      var ptsV = [], ptsH = [];
      var seg = 24;
      for (var s = 0; s <= seg; s++) {
        var t = (s / seg) * 2 - 1;
        // vertical
        var wx1 = cx + local * cosR - (t * R) * sinR;
        var wz1 = cz + local * sinR + (t * R) * cosR;
        if (wz1 >= CITY.bayEdgeZ && ((wx1-cx)*(wx1-cx)+(wz1-cz)*(wz1-cz)) < R2) ptsV.push([wx1, wz1]);
        // horizontal
        var wx2 = cx + (t * R) * cosR - local * sinR;
        var wz2 = cz + (t * R) * sinR + local * cosR;
        if (wz2 >= CITY.bayEdgeZ && ((wx2-cx)*(wx2-cx)+(wz2-cz)*(wz2-cz)) < R2) ptsH.push([wx2, wz2]);
      }
      if (ptsV.length > 2) makeStreet('grid', 7, ptsV);
      if (ptsH.length > 2) makeStreet('grid', 7, ptsH);
    }
  }

  function generatePromenade() {
    var pts = [];
    for (var x = -CITY.halfSize; x <= CITY.halfSize; x += 40) {
      pts.push([x, CITY.promenadeZ + Math.sin(x * 0.004) * 12]);
    }
    makeStreet('promenade', 22, pts);
  }

  function generateHillsides() {
    for (var h = 0; h < 6; h++) {
      var baseZ = CITY.hillStartZ + h * 55;
      var pts = [];
      var amp = 30 + h * 12;
      for (var x = -600; x <= 600; x += 50) {
        pts.push([x, baseZ + Math.sin(x * 0.006 + h) * amp]);
      }
      makeStreet('hillside', 8, pts);
    }
  }

  function generateStreets() {
    generateRings();
    generateRadials();
    for (var i = 0; i < DISTRICTS.length; i++) generateDistrictGrid(DISTRICTS[i]);
    generatePromenade();
    generateHillsides();
  }

  /* ============================================================
     BUILDING LOTS — district character drives type
     ============================================================ */
  var MIX = {
    financial:     [['tower', 55], ['office', 30], ['block', 15]],
    creative:      [['creative', 45], ['block', 25], ['office', 20], ['tower', 10]],
    data:          [['data', 50], ['office', 25], ['block', 25]],
    commercial:    [['commercial', 45], ['block', 30], ['office', 25]],
    harbor:        [['warehouse', 50], ['block', 30], ['office', 20]],
    civic:         [['pavilion', 45], ['block', 30], ['office', 25]],
    residential:   [['rowhouse', 60], ['block', 30], ['office', 10]],
    cultural:      [['pavilion', 40], ['block', 40], ['office', 20]],
    entertainment: [['commercial', 40], ['block', 35], ['creative', 25]],
    park:          [['pavilion', 100]]
  };

  function pickMix(mix) {
    var total = 0, i;
    for (i = 0; i < mix.length; i++) total += mix[i][1];
    var r = RNG() * total, acc = 0;
    for (i = 0; i < mix.length; i++) {
      acc += mix[i][1];
      if (r <= acc) return mix[i][0];
    }
    return mix[0][0];
  }

  function sizeForType(type, distRatio) {
    var w, d, h;
    if (type === 'tower') {
      w = rand(20, 34); d = rand(20, 34);
      h = rand(60, 140) * (1 - distRatio * 0.35);
    } else if (type === 'office') {
      w = rand(24, 38); d = rand(22, 36); h = rand(28, 60);
    } else if (type === 'block') {
      w = rand(26, 42); d = rand(26, 42); h = rand(18, 32);
    } else if (type === 'creative') {
      w = rand(28, 44); d = rand(26, 42); h = rand(22, 48);
    } else if (type === 'data') {
      w = rand(26, 40); d = rand(26, 40); h = rand(24, 52);
    } else if (type === 'commercial') {
      w = rand(20, 32); d = rand(22, 34); h = rand(14, 28);
    } else if (type === 'warehouse') {
      w = rand(40, 70); d = rand(30, 50); h = rand(10, 20);
    } else if (type === 'rowhouse') {
      w = rand(10, 16); d = rand(18, 26); h = rand(12, 22);
    } else if (type === 'pavilion') {
      w = rand(30, 50); d = rand(24, 40); h = rand(8, 16);
    } else {
      w = 24; d = 24; h = 20;
    }
    return { w: w, d: d, h: h };
  }

  function generateLotsForDistrict(d) {
    if (d.character === 'park') return [];
    var lots = [];
    var cx = d.center[0], cz = d.center[1], R = d.radius;
    var rotMap = { financial: 0, creative: 0.12, data: -0.08, commercial: 0,
                   harbor: 0, civic: 0.26, residential: 0.15, cultural: 0.09,
                   entertainment: -0.14 };
    var rot = rotMap[d.character] || 0;
    var cosR = Math.cos(rot), sinR = Math.sin(rot);
    var spacingMap = { downtown: 42, web: 48, seo: 48, growth: 46,
                       waterfront: 70, civic: 60, residential: 34,
                       arts: 50, nightlife: 50 };
    var spacing = spacingMap[d.type] || 50;
    var jitter = d.type === 'downtown' ? 0.05 : 0.15;
    var count = Math.floor(R / spacing) + 1;
    var mix = MIX[d.character] || MIX.financial;
    var R2 = (R * 0.95) * (R * 0.95);

    for (var ix = -count; ix <= count; ix++) {
      for (var iz = -count; iz <= count; iz++) {
        var localX = ix * spacing + (RNG() - 0.5) * spacing * jitter;
        var localZ = iz * spacing + (RNG() - 0.5) * spacing * jitter;
        var wx = cx + localX * cosR - localZ * sinR;
        var wz = cz + localX * sinR + localZ * cosR;
        var dx = wx - cx, dz = wz - cz;
        var dd = dx * dx + dz * dz;
        if (dd > R2) continue;
        if (wz < CITY.bayEdgeZ + 15) continue;
        if (RNG() > d.density) continue;

        var type = pickMix(mix);
        var distRatio = Math.sqrt(dd) / R;
        var sz = sizeForType(type, distRatio);

        lots.push({
          x: wx, z: wz,
          w: sz.w, d: sz.d, h: sz.h,
          rot: rot + (RNG() - 0.5) * 0.15,
          type: type,
          districtId: d.id,
          character: d.character
        });
      }
    }
    return lots;
  }

  function generateAllLots() {
    var maxTotal = Q.buildingsNear + Q.buildingsMid + Q.buildingsFar;
    var all = [];
    for (var i = 0; i < DISTRICTS.length; i++) {
      var dl = generateLotsForDistrict(DISTRICTS[i]);
      for (var j = 0; j < dl.length; j++) all.push(dl[j]);
    }
    if (all.length > maxTotal) {
      for (var k = all.length - 1; k > 0; k--) {
        var sw = Math.floor(RNG() * (k + 1));
        var tmp = all[k]; all[k] = all[sw]; all[sw] = tmp;
      }
      all.length = maxTotal;
    }
    for (var m = 0; m < all.length; m++) {
      var x = all[m].x, z = all[m].z;
      all[m].r = Math.sqrt(x * x + z * z);
    }
    return all;
  }

  /* ============================================================
     LANDMARKS — camera destinations, named
     ============================================================ */
  var LANDMARKS = [
    { id: 'spire',      name: 'The Santinopole Spire', x: 0,    z: -60,  type: 'tower',      district: 'downtown',   h: 220 },
    { id: 'exchange',   name: 'The Exchange',          x: -90,  z: 40,   type: 'civic',      district: 'downtown',   h: 60 },
    { id: 'webhub',     name: 'Web Hub One',           x: 460,  z: -100, type: 'creative',   district: 'web',        h: 90 },
    { id: 'glassworks', name: 'The Glassworks',        x: 380,  z: -40,  type: 'creative',   district: 'web',        h: 70 },
    { id: 'index',      name: 'The Index',             x: -440, z: -60,  type: 'data',       district: 'seo',        h: 80 },
    { id: 'signal',     name: 'Signal Tower',          x: -400, z: -140, type: 'data',       district: 'seo',        h: 100 },
    { id: 'market',     name: 'The Grand Market',      x: 0,    z: -420, type: 'commercial', district: 'growth',     h: 42 },
    { id: 'bowl',       name: 'The Bowl',              x: 130,  z: -480, type: 'commercial', district: 'growth',     h: 50 },
    { id: 'pier',       name: 'Pier Nine',             x: 0,    z: -640, type: 'harbor',     district: 'waterfront', h: 24 },
    { id: 'beacon',     name: 'The Beacon',            x: -180, z: -640, type: 'harbor',     district: 'waterfront', h: 40 },
    { id: 'piazza',     name: 'Piazza Santino',        x: 0,    z: 420,  type: 'civic',      district: 'civic',      h: 44 },
    { id: 'gallery',    name: 'The Galleria',          x: 340,  z: 380,  type: 'pavilion',   district: 'arts',       h: 22 },
    { id: 'amphithe',   name: 'The Amphitheatre',      x: 320,  z: 460,  type: 'pavilion',   district: 'arts',       h: 18 },
    { id: 'arcade',     name: 'The Neon Arcade',       x: -340, z: 380,  type: 'commercial', district: 'nightlife',  h: 32 },
    { id: 'cathedral',  name: 'Chiesa di Santino',     x: 0,    z: 580,  type: 'civic',      district: 'civic',      h: 66 },
    { id: 'observat',   name: 'The Observatory',       x: -120, z: 720,  type: 'pavilion',   district: 'hills',      h: 30 },
    { id: 'cemetery',   name: 'Cimitero dei Ricordi',  x: 280,  z: 760,  type: 'pavilion',   district: 'hills',      h: 20 },
    { id: 'linden',     name: 'Linden Pavilion',       x: 640,  z: -280, type: 'pavilion',   district: 'parks_e',    h: 14 },
    { id: 'ivy',        name: 'Ivy Conservatory',      x: -640, z: -280, type: 'pavilion',   district: 'parks_w',    h: 16 }
  ];

  /* ============================================================
     PUBLIC SPACES — parks, plazas, greens
     ============================================================ */
  var publicSpaces = [];
  function generatePublicSpaces() {
    publicSpaces.push({ id: 'piazza-core', name: 'Piazza Santino', kind: 'plaza', x: 0, z: 420, radius: 60 });
    for (var i = 0; i < DISTRICTS.length; i++) {
      var d = DISTRICTS[i];
      if (d.character !== 'park') continue;
      publicSpaces.push({
        id: 'park-' + d.id, name: d.name, kind: 'park',
        x: d.center[0], z: d.center[1], radius: d.radius * 0.9
      });
    }
    var greens = [
      { x: -200, z: 200, r: 40 }, { x: 200, z: 200, r: 35 },
      { x: -240, z: -220, r: 45 }, { x: 240, z: -220, r: 45 },
      { x: 0, z: 200, r: 30 }
    ];
    for (var j = 0; j < greens.length; j++) {
      publicSpaces.push({ id: 'green-' + j, name: 'Green ' + (j + 1), kind: 'green',
                          x: greens[j].x, z: greens[j].z, radius: greens[j].r });
    }
  }

  /* ============================================================
     TRANSIT — 3 named lines, 11 stations
     ============================================================ */
  var transit = { lines: [], stations: [] };
  function generateTransit() {
    transit.lines.push({
      id: 'line-1', name: 'The Meridian', color: '#d4a24a',
      points: [[0, 820], [0, 640], [0, 440], [0, 0], [0, -400], [0, -640]]
    });
    transit.lines.push({
      id: 'line-2', name: 'The Cross', color: '#5a9bd4',
      points: [[-660, 0], [-420, -40], [-140, -20], [0, 0], [200, -40], [420, -60], [660, -80]]
    });
    transit.lines.push({
      id: 'line-3', name: 'The Loop', color: '#c96b5a',
      points: [[340, 380], [180, 100], [100, -400], [0, -640], [-100, -400], [-180, 100], [-340, 380]]
    });
    var sp = [
      { x: 0,   z: 640,  name: 'Chiesa',        district: 'civic' },
      { x: 0,   z: 420,  name: 'Piazza',        district: 'civic' },
      { x: 0,   z: 0,    name: 'Spine Central', district: 'downtown' },
      { x: 0,   z: -420, name: 'Growth Gate',   district: 'growth' },
      { x: 0,   z: -640, name: 'Pier Nine',     district: 'waterfront' },
      { x: -420,z: -40,  name: 'Index East',    district: 'seo' },
      { x: 420, z: -60,  name: 'Web Hub',       district: 'web' },
      { x: 340, z: 380,  name: 'Atelier',       district: 'arts' },
      { x: -340,z: 380,  name: 'Neon',          district: 'nightlife' },
      { x: -200,z: 100,  name: 'West Gate',     district: 'seo' },
      { x: 200, z: 100,  name: 'East Gate',     district: 'web' }
    ];
    for (var i = 0; i < sp.length; i++) {
      transit.stations.push({ id: 'st-' + i, name: sp[i].name, x: sp[i].x, z: sp[i].z, district: sp[i].district });
    }
  }

  /* ============================================================
     BOUNDARY — rounded city outline
     ============================================================ */
  function computeBoundary() {
    var h = CITY.halfSize, pts = [], seg = 64;
    for (var i = 0; i < seg; i++) {
      var a = (i / seg) * Math.PI * 2;
      var x = Math.cos(a) * h * 0.9;
      var z = Math.sin(a) * h * 0.9;
      if (z < CITY.bayEdgeZ) z = CITY.bayEdgeZ;
      pts.push([x, z]);
    }
    return pts;
  }

  /* ============================================================
     RUN
     ============================================================ */
  generateStreets();
  generatePublicSpaces();
  generateTransit();
  var lots = generateAllLots();
  var boundary = computeBoundary();

  /* ============================================================
     EXPORT
     ============================================================ */
  S.city = {
    boundary: boundary,
    bay: { edgeZ: CITY.bayEdgeZ, promenadeZ: CITY.promenadeZ, width: CITY.halfSize * 2.4 },
    hills: { startZ: CITY.hillStartZ, peakZ: CITY.halfSize * 1.1, maxHeight: 140 },
    districts: DISTRICTS.map(function (d) {
      return { id: d.id, name: d.name, type: d.type, character: d.character,
               center: d.center.slice(), radius: d.radius, density: d.density };
    }),
    streets: streets,
    lots: lots,
    landmarks: LANDMARKS,
    publicSpaces: publicSpaces,
    transit: transit,
    constants: { streetWidth: CITY.streetWidth, boulevardWidth: CITY.boulevardWidth, halfSize: CITY.halfSize },
    helpers: {
      districtAt: districtAt,
      random: RNG
    },
    stats: {
      districtCount: DISTRICTS.length,
      streetCount: streets.length,
      lotCount: lots.length,
      landmarkCount: LANDMARKS.length,
      spaceCount: publicSpaces.length,
      transitLines: transit.lines.length,
      transitStations: transit.stations.length
    }
  };

  S.log(
    'city',
    true,
    DISTRICTS.length + ' districts · ' +
    streets.length + ' streets · ' +
    lots.length + ' lots'
  );

})();
