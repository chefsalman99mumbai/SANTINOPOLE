/* ============================================================
   SANTINOPOLE — city.js — GRID-PLANNED EUROPEAN CITY
   ------------------------------------------------------------
   Strict rectangular grid. Streets at fixed intervals.
   Blocks between streets. Buildings sit FLUSH on block edges,
   forming continuous street walls — like Milan and San Francisco.
   No jitter. No random rotation. Real city fabric.
   ============================================================ */

(function () {
  'use strict';

  var S = window.SANTINOPOLE;
  if (!S || !S.performance) { console.error('[city.js] performance.js must load first.'); return; }
  var Q = S.performance.Q;

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

  /* ============================================================
     GRID CONSTANTS
     ============================================================ */
  var GRID = {
    min: -800,
    max:  800,
    step: 100,          // distance between block centers
    streetW: 14,        // visible street width
    halfBlock: 43,      // (100 - 14) / 2
    bayEdgeZ: -720,
    hillStartZ: 620
  };

  /* ============================================================
     DISTRICTS
     ============================================================ */
  var DISTRICTS = [
    { id: 'downtown',   name: 'The Spine',        type: 'downtown',    center: [0,    0],    radius: 220, density: 1.0, character: 'financial' },
    { id: 'web',        name: 'Web Quarter',      type: 'web',         center: [420, -80],   radius: 230, density: 0.9, character: 'creative' },
    { id: 'seo',        name: 'Index Ward',       type: 'seo',         center: [-420,-80],   radius: 230, density: 0.9, character: 'data' },
    { id: 'growth',     name: 'Growth Front',     type: 'growth',      center: [0,   -420],  radius: 260, density: 1.0, character: 'commercial' },
    { id: 'waterfront', name: 'The Embarcadero',  type: 'waterfront',  center: [0,   -600],  radius: 180, density: 0.7, character: 'harbor' },
    { id: 'civic',      name: 'Piazza Santino',   type: 'civic',       center: [0,    420],  radius: 160, density: 0.8, character: 'civic' },
    { id: 'hills',      name: 'The Ridges',       type: 'residential', center: [0,    720],  radius: 380, density: 0.6, character: 'residential' },
    { id: 'arts',       name: 'Atelier Row',      type: 'arts',        center: [340,  380],  radius: 140, density: 0.9, character: 'cultural' },
    { id: 'nightlife',  name: 'Neon Ward',        type: 'nightlife',   center: [-340, 380],  radius: 140, density: 0.9, character: 'entertainment' },
    { id: 'parks_e',    name: 'Linden Green',     type: 'park',        center: [640, -280],  radius: 140, density: 0.0, character: 'park' },
    { id: 'parks_w',    name: 'Ivy Commons',      type: 'park',        center: [-640,-280],  radius: 140, density: 0.0, character: 'park' }
  ];

  function districtAt(x, z) {
    var best = null, bestDist = Infinity;
    for (var i = 0; i < DISTRICTS.length; i++) {
      var d = DISTRICTS[i];
      var dx = x - d.center[0];
      var dz = z - d.center[1];
      var dd = dx*dx + dz*dz;
      if (dd < d.radius * d.radius && dd < bestDist) { best = d; bestDist = dd; }
    }
    return best;
  }

  var DEFAULT_CHARACTER = 'residential';
  var DEFAULT_DISTRICT_ID = 'outskirts';

  /* ============================================================
     STREETS — grid lines only
     ============================================================ */
  var streets = [];
  var sid = 0;
  function makeStreet(width, points) {
    streets.push({ id: 's' + (sid++), kind: 'grid', width: width, points: points });
  }

  function buildGridStreets() {
    // Vertical grid lines (constant X) — at odd multiples of 50
    for (var x = -850; x <= 850; x += 100) {
      var isMajor = (x % 200 === -50 || x % 200 === 50 || x % 200 === -250 || x % 200 === 150);
      makeStreet(isMajor ? 20 : 14, [[x, GRID.min - 40], [x, GRID.max + 40]]);
    }
    // Horizontal grid lines (constant Z)
    for (var z = -850; z <= 850; z += 100) {
      var isMajor2 = (z % 200 === -50 || z % 200 === 50 || z % 200 === -250 || z % 200 === 150);
      makeStreet(isMajor2 ? 20 : 14, [[GRID.min - 40, z], [GRID.max + 40, z]]);
    }
  }
  buildGridStreets();

  /* ============================================================
     LANDMARKS — all on block centers
     ============================================================ */
  var LANDMARKS = [
    { id: 'spire',      name: 'The Santinopole Spire', x: 0,    z: 0,    type: 'tower',      district: 'downtown',   h: 220 },
    { id: 'exchange',   name: 'The Exchange',          x: -100, z: 100,  type: 'civic',      district: 'downtown',   h: 60 },
    { id: 'webhub',     name: 'Web Hub One',           x: 400,  z: -100, type: 'creative',   district: 'web',        h: 90 },
    { id: 'glassworks', name: 'The Glassworks',        x: 500,  z: 0,    type: 'creative',   district: 'web',        h: 70 },
    { id: 'index',      name: 'The Index',             x: -400, z: -100, type: 'data',       district: 'seo',        h: 80 },
    { id: 'signal',     name: 'Signal Tower',          x: -500, z: 0,    type: 'data',       district: 'seo',        h: 100 },
    { id: 'market',     name: 'The Grand Market',      x: 0,    z: -400, type: 'commercial', district: 'growth',     h: 42 },
    { id: 'bowl',       name: 'The Bowl',              x: 100,  z: -500, type: 'commercial', district: 'growth',     h: 50 },
    { id: 'pier',       name: 'Pier Nine',             x: -100, z: -600, type: 'harbor',     district: 'waterfront', h: 24 },
    { id: 'beacon',     name: 'The Beacon',            x: -200, z: -600, type: 'harbor',     district: 'waterfront', h: 40 },
    { id: 'piazza',     name: 'Piazza Santino',        x: 0,    z: 400,  type: 'civic',      district: 'civic',      h: 44 },
    { id: 'gallery',    name: 'The Galleria',          x: 300,  z: 400,  type: 'pavilion',   district: 'arts',       h: 22 },
    { id: 'amphithe',   name: 'The Amphitheatre',      x: 400,  z: 500,  type: 'pavilion',   district: 'arts',       h: 18 },
    { id: 'arcade',     name: 'The Neon Arcade',       x: -300, z: 400,  type: 'commercial', district: 'nightlife',  h: 32 },
    { id: 'cathedral',  name: 'Chiesa di Santino',     x: -100, z: 600,  type: 'civic',      district: 'civic',      h: 66 },
    { id: 'observat',   name: 'The Observatory',       x: -200, z: 700,  type: 'pavilion',   district: 'hills',      h: 30 },
    { id: 'cemetery',   name: 'Cimitero dei Ricordi',  x: 300,  z: 700,  type: 'pavilion',   district: 'hills',      h: 20 },
    { id: 'linden',     name: 'Linden Pavilion',       x: 600,  z: -300, type: 'pavilion',   district: 'parks_e',    h: 14 },
    { id: 'ivy',        name: 'Ivy Conservatory',      x: -600, z: -300, type: 'pavilion',   district: 'parks_w',    h: 16 }
  ];

  var landmarkBlockKeys = {};
  for (var li = 0; li < LANDMARKS.length; li++) {
    var L = LANDMARKS[li];
    landmarkBlockKeys[L.x + ',' + L.z] = true;
  }

  /* ============================================================
     PUBLIC SPACES
     ============================================================ */
  var publicSpaces = [];
  function buildPublicSpaces() {
    publicSpaces.push({ id: 'piazza-core', name: 'Piazza Santino', kind: 'plaza', x: 0, z: 400, radius: 60 });
    for (var i = 0; i < DISTRICTS.length; i++) {
      var d = DISTRICTS[i];
      if (d.character !== 'park') continue;
      publicSpaces.push({
        id: 'park-' + d.id, name: d.name, kind: 'park',
        x: d.center[0], z: d.center[1], radius: d.radius * 0.85
      });
    }
  }
  buildPublicSpaces();

  /* ============================================================
     BUILDING TYPE PER DISTRICT CHARACTER
     ============================================================ */
  var MIX = {
    financial:     ['tower', 'office', 'block'],
    creative:      ['creative', 'block', 'office'],
    data:          ['data', 'block', 'office'],
    commercial:    ['commercial', 'block', 'office'],
    harbor:        ['warehouse', 'block'],
    civic:         ['block', 'office', 'block'],
    residential:   ['rowhouse', 'rowhouse', 'block'],
    cultural:      ['block', 'office', 'creative'],
    entertainment: ['commercial', 'block', 'commercial'],
    park:          ['pavilion']
  };

  function pickType(character) {
    var arr = MIX[character] || MIX.residential;
    var r = RNG();
    if (r < 0.55) return arr[0];
    if (r < 0.85 && arr[1]) return arr[1];
    return arr[2] || arr[0];
  }

  var HEIGHTS = {
    financial:     [22, 90],
    creative:      [18, 42],
    data:          [20, 48],
    commercial:    [14, 32],
    harbor:        [10, 22],
    civic:         [16, 32],
    residential:   [12, 24],
    cultural:      [14, 28],
    entertainment: [14, 30],
    park:          [8, 14]
  };

  function pickHeight(character) {
    var range = HEIGHTS[character] || HEIGHTS.residential;
    // Bias toward shorter — creates a varied skyline
    var t = Math.pow(RNG(), 0.75);
    return range[0] + (range[1] - range[0]) * t;
  }

  /* ============================================================
     LOTS — buildings flush against block edges
     ============================================================ */
  var lots = [];

  function pushLot(x, z, w, d, h, rot, type, character, districtId) {
    lots.push({
      x: x, z: z,
      w: w, d: d, h: h,
      rot: rot,
      type: type,
      districtId: districtId,
      character: character
    });
  }

  /**
   * Fill one block edge with a continuous row of buildings.
   * startX/Z → endX/Z: the edge, walked in order.
   * facing: 'N' | 'S' | 'E' | 'W' — which compass direction the buildings face.
   */
  function fillEdge(startX, startZ, endX, endZ, facing, character, districtId) {
    var dx = endX - startX, dz = endZ - startZ;
    var edgeLen = Math.sqrt(dx*dx + dz*dz);
    if (edgeLen < 20) return;

    var ux = dx / edgeLen, uz = dz / edgeLen;
    // Perpendicular — always points INTO the block
    var px = -uz, pz = ux;

    // Depth (how far the building extends inward)
    var depth;
    if (character === 'financial') depth = rand(16, 22);
    else if (character === 'residential') depth = rand(14, 20);
    else if (character === 'harbor') depth = rand(20, 30);
    else if (character === 'civic') depth = rand(16, 24);
    else depth = rand(14, 20);

    // Rotation for buildings.js:
    // N/S edges → width runs along X (rot = 0)
    // E/W edges → width runs along Z (rot = PI/2)
    var rot = (facing === 'N' || facing === 'S') ? 0 : Math.PI / 2;

    // 3 or 4 buildings per edge
    var numBuildings = 3 + Math.floor(RNG() * 2);
    var typeA = pickType(character);
    var typeB = pickType(character);

    for (var k = 0; k < numBuildings; k++) {
      var t0 = (k / numBuildings) * edgeLen;
      var t1 = ((k + 1) / numBuildings) * edgeLen;
      var w = t1 - t0;
      var midT = (t0 + t1) / 2;

      // Point on the edge (building's front-center)
      var ex = startX + ux * midT;
      var ez = startZ + uz * midT;

      // Center of the building body (offset inward by depth/2)
      var bx = ex + px * depth / 2;
      var bz = ez + pz * depth / 2;

      var h = pickHeight(character);
      var type = (k === 0 || k === numBuildings - 1) ? typeA : typeB;

      pushLot(bx, bz, w, depth, h, rot, type, character, districtId);
    }
  }

  /* ============================================================
     BLOCK GENERATION
     ============================================================ */
  function generateBlocks() {
    for (var cx = GRID.min; cx <= GRID.max; cx += GRID.step) {
      for (var cz = GRID.min; cz <= GRID.max; cz += GRID.step) {

        // Bay skip — block must be entirely on land
        if (cz - GRID.halfBlock < GRID.bayEdgeZ + 5) continue;

        // Landmark block — skip, landmark will render there
        if (landmarkBlockKeys[cx + ',' + cz]) continue;

        var district = districtAt(cx, cz);

        // Park districts — no buildings, the block becomes lawn
        if (district && district.character === 'park') continue;

        // Hills — sparse (some blocks empty)
        if (district && district.character === 'residential' && cz > GRID.hillStartZ) {
          if (RNG() < 0.45) continue;
        }

        var character = district ? district.character : DEFAULT_CHARACTER;
        var districtId = district ? district.id : DEFAULT_DISTRICT_ID;

        var h = GRID.halfBlock;

        // N edge — from (cx-h, cz-h) to (cx+h, cz-h), facing north
        fillEdge(cx - h, cz - h, cx + h, cz - h, 'N', character, districtId);

        // S edge — from (cx+h, cz+h) to (cx-h, cz+h), facing south
        fillEdge(cx + h, cz + h, cx - h, cz + h, 'S', character, districtId);

        // E edge — from (cx+h, cz-h) to (cx+h, cz+h), facing east
        fillEdge(cx + h, cz - h, cx + h, cz + h, 'E', character, districtId);

        // W edge — from (cx-h, cz+h) to (cx-h, cz-h), facing west
        fillEdge(cx - h, cz + h, cx - h, cz - h, 'W', character, districtId);
      }
    }
  }
  generateBlocks();

  /* ============================================================
     BUDGET — keep lots closest to the origin if over limit
     ============================================================ */
  var maxTotal = Q.buildingsNear + Q.buildingsMid + Q.buildingsFar;
  if (lots.length > maxTotal) {
    lots.sort(function (a, b) {
      return (a.x*a.x + a.z*a.z) - (b.x*b.x + b.z*b.z);
    });
    lots.length = maxTotal;
  }

  /* ============================================================
     TRANSIT — trains run along grid streets
     ============================================================ */
  var transit = { lines: [], stations: [] };
  function buildTransit() {
    transit.lines.push({
      id: 'line-1', name: 'The Meridian', color: '#d4a24a',
      points: [[50, 850], [50, -650]]
    });
    transit.lines.push({
      id: 'line-2', name: 'The Cross', color: '#5a9bd4',
      points: [[-850, 50], [850, 50]]
    });
    transit.lines.push({
      id: 'line-3', name: 'The Loop', color: '#c96b5a',
      points: [[350, 350], [350, -350], [-350, -350], [-350, 350], [350, 350]]
    });
    var sp = [
      { x: 50,   z: 400,  name: 'Chiesa',        district: 'civic' },
      { x: 50,   z: 0,    name: 'Spine Central', district: 'downtown' },
      { x: 50,   z: -400, name: 'Growth Gate',   district: 'growth' },
      { x: 50,   z: -600, name: 'Pier Nine',     district: 'waterfront' },
      { x: -400, z: 50,   name: 'Index East',    district: 'seo' },
      { x: 400,  z: 50,   name: 'Web Hub',       district: 'web' },
      { x: 350,  z: 350,  name: 'Atelier',       district: 'arts' },
      { x: -350, z: 350,  name: 'Neon',          district: 'nightlife' }
    ];
    for (var i = 0; i < sp.length; i++) {
      transit.stations.push({ id: 'st-' + i, name: sp[i].name, x: sp[i].x, z: sp[i].z, district: sp[i].district });
    }
  }
  buildTransit();

  /* ============================================================
     BOUNDARY
     ============================================================ */
  function computeBoundary() {
    var h = 900, pts = [], seg = 64;
    for (var i = 0; i < seg; i++) {
      var a = (i / seg) * Math.PI * 2;
      var x = Math.cos(a) * h * 0.9;
      var z = Math.sin(a) * h * 0.9;
      if (z < GRID.bayEdgeZ) z = GRID.bayEdgeZ;
      pts.push([x, z]);
    }
    return pts;
  }
  var boundary = computeBoundary();

  /* ============================================================
     EXPORT
     ============================================================ */
  S.city = {
    boundary: boundary,
    bay: { edgeZ: GRID.bayEdgeZ, promenadeZ: GRID.bayEdgeZ + 40, width: 2000 },
    hills: { startZ: GRID.hillStartZ, peakZ: 1000, maxHeight: 140 },
    districts: DISTRICTS.map(function (d) {
      return { id: d.id, name: d.name, type: d.type, character: d.character,
               center: d.center.slice(), radius: d.radius, density: d.density };
    }),
    streets: streets,
    lots: lots,
    landmarks: LANDMARKS,
    publicSpaces: publicSpaces,
    transit: transit,
    constants: { streetWidth: GRID.streetW, halfSize: 900, gridStep: GRID.step },
    helpers: { districtAt: districtAt, random: RNG },
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
    lots.length + ' lots (grid-planned)'
  );

})();
