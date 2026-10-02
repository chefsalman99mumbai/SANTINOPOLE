/* ============================================================
   SANTINOPOLE — city.js — MARINE DRIVE
   ============================================================ */

(function () {
  'use strict';
  var S = window.SANTINOPOLE;
  if (!S || !S.performance) { console.error('[city.js] performance.js missing'); return; }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var RNG = mulberry32(20241024);

  var DRIVE = {
    length: 900,
    curveDepth: 300,
    roadHalfWidth: 11,
    innerSidewalk: 4,
    outerSidewalk: 3,
    promenadeWidth: 20,
    seaWallThickness: 2.5
  };

  var OFF_PROM_INNER = DRIVE.roadHalfWidth + DRIVE.outerSidewalk;
  var OFF_PROM_MID   = OFF_PROM_INNER + DRIVE.promenadeWidth * 0.5;
  var OFF_PROM_OUTER = OFF_PROM_INNER + DRIVE.promenadeWidth;
  var OFF_SEAWALL    = OFF_PROM_OUTER + DRIVE.seaWallThickness;
  var OFF_SEA        = OFF_SEAWALL + 40;
  var OFF_BUILDING   = DRIVE.roadHalfWidth + DRIVE.innerSidewalk;

  function point(t) {
    return { x: t * DRIVE.length, z: -DRIVE.curveDepth * t * t };
  }
  function tangent(t) {
    var dx = DRIVE.length, dz = -2 * DRIVE.curveDepth * t;
    var len = Math.sqrt(dx * dx + dz * dz) || 1;
    return { x: dx / len, z: dz / len };
  }
  function perp(t) {
    var T = tangent(t);
    return { x: -T.z, z: T.x };
  }
  function rotYFacing(dx, dz) { return Math.atan2(dx, dz); }

  /* ---------- BUILDINGS ---------- */
  var buildings = [];
  var N_BUILDINGS = 38;
  for (var i = 0; i < N_BUILDINGS; i++) {
    var t = (i + 0.5) / N_BUILDINGS;
    var p = point(t);
    var n = perp(t);

    var width = 14 + RNG() * 12;
    var depth = 22 + RNG() * 16;
    var stories = 5 + Math.floor(RNG() * 4);
    var storyH = 3.5 + RNG() * 0.3;
    var height = stories * storyH;

    var bx = p.x - n.x * (OFF_BUILDING + depth * 0.5);
    var bz = p.z - n.z * (OFF_BUILDING + depth * 0.5);
    var rot = rotYFacing(n.x, n.z);

    buildings.push({
      x: bx, z: bz, w: width, d: depth, h: height,
      stories: stories, storyH: storyH, rot: rot, arcPos: t,
      style: RNG() < 0.5 ? 'deco_corner' : 'deco_slab'
    });
  }

  /* ---------- LAMPS ---------- */
  var lamps = [];
  var N_LAMPS = 46;
  for (var i = 0; i < N_LAMPS; i++) {
    var t = (i + 0.5) / N_LAMPS;
    var p = point(t);
    var n = perp(t);
    var off = OFF_PROM_OUTER - 2;
    lamps.push({
      x: p.x + n.x * off,
      z: p.z + n.z * off,
      faceX: -n.x, faceZ: -n.z,
      arcPos: t
    });
  }

  /* ---------- PALMS ---------- */
  var palms = [];
  var N_PALMS = 30;
  for (var i = 0; i < N_PALMS; i++) {
    var t = (i + 0.5) / N_PALMS;
    var p = point(t);
    var n = perp(t);
    var off = (i % 2 === 0) ? OFF_PROM_INNER + 4 : OFF_PROM_MID + RNG() * 6;
    palms.push({
      x: p.x + n.x * off,
      z: p.z + n.z * off,
      scale: 0.85 + RNG() * 0.35,
      arcPos: t
    });
  }

  /* ---------- BENCHES ---------- */
  var benches = [];
  var N_BENCHES = 16;
  for (var i = 0; i < N_BENCHES; i++) {
    var t = (i + 0.5) / N_BENCHES;
    var p = point(t);
    var n = perp(t);
    var off = OFF_PROM_MID + 4;
    benches.push({
      x: p.x + n.x * off,
      z: p.z + n.z * off,
      rot: rotYFacing(n.x, n.z),
      arcPos: t
    });
  }

  /* ---------- SEA WALL ---------- */
  var N_SAMPLES = 96;
  var seaWallInner = [], seaWallOuter = [];
  for (var i = 0; i < N_SAMPLES; i++) {
    var t = i / (N_SAMPLES - 1);
    var p = point(t);
    var n = perp(t);
    seaWallInner.push({ x: p.x + n.x * OFF_PROM_OUTER, z: p.z + n.z * OFF_PROM_OUTER });
    seaWallOuter.push({ x: p.x + n.x * OFF_SEAWALL, z: p.z + n.z * OFF_SEAWALL });
  }

  /* ---------- TRAFFIC LANES ---------- */
  var LANE_OFFSETS = [-7.5, -3.5, 3.5, 7.5];
  var trafficLanes = LANE_OFFSETS.map(function (off, idx) {
    var dir = idx < 2 ? -1 : 1;
    var pts = [];
    for (var i = 0; i < N_SAMPLES; i++) {
      var t = i / (N_SAMPLES - 1);
      var p = point(t);
      var n = perp(t);
      pts.push({ x: p.x + n.x * off, z: p.z + n.z * off });
    }
    return { offset: off, dir: dir, points: pts };
  });

  /* ---------- BOUNDARY ---------- */
  var boundary = [];
  for (var i = 0; i < N_SAMPLES; i++) {
    var t = i / (N_SAMPLES - 1);
    var p = point(t);
    var n = perp(t);
    boundary.push([p.x + n.x * OFF_SEA, p.z + n.z * OFF_SEA]);
  }
  for (var i = N_SAMPLES - 1; i >= 0; i--) {
    var t = i / (N_SAMPLES - 1);
    var p = point(t);
    var n = perp(t);
    boundary.push([p.x - n.x * (OFF_BUILDING + 45), p.z - n.z * (OFF_BUILDING + 45)]);
  }

  /* ---------- ROAD POLYLINE ---------- */
  var roadPolyline = [];
  for (var i = 0; i < N_SAMPLES; i++) {
    var t = i / (N_SAMPLES - 1);
    var p = point(t);
    roadPolyline.push([p.x, p.z]);
  }
  var streets = [{
    id: 'marine-drive-road', kind: 'avenue',
    width: DRIVE.roadHalfWidth * 2, points: roadPolyline
  }];

  /* ---------- LEGACY COMPAT ---------- */
  var lots = buildings.map(function (b) {
    return {
      x: b.x, z: b.z, w: b.w, d: b.d, h: b.h,
      rot: b.rot, type: 'block',
      districtId: 'marine-drive', character: 'artdeco', lod: 0
    };
  });

  var districts = [{
    id: 'marine-drive', name: 'Marine Drive', character: 'artdeco',
    center: [DRIVE.length * 0.5, -DRIVE.curveDepth * 0.35],
    radius: DRIVE.length * 0.5
  }];

  var landmarks = [{
    id: 'chowpatty', name: 'Chowpatty',
    x: DRIVE.length + 40, z: -DRIVE.curveDepth - 20,
    h: 26, district: 'marine-drive'
  }];

  S.city = {
    mode: 'marine-drive',
    drive: DRIVE,
    curve: { point: point, tangent: tangent, perp: perp, samples: N_SAMPLES },
    buildings: buildings,
    lamps: lamps,
    palms: palms,
    benches: benches,
    seaWallInner: seaWallInner,
    seaWallOuter: seaWallOuter,
    trafficLanes: trafficLanes,
    boundary: boundary,
    bay: { edgeZ: 0, promenadeZ: 0, width: 0 },
    hills: null,
    districts: districts,
    streets: streets,
    lots: lots,
    landmarks: landmarks,
    publicSpaces: [],
    transit: { lines: [], stations: [] },
    constants: { streetWidth: DRIVE.roadHalfWidth * 2, halfSize: DRIVE.length, gridStep: 100 },
    helpers: {},
    stats: {
      districtCount: districts.length,
      streetCount: streets.length,
      lotCount: lots.length,
      landmarkCount: landmarks.length,
      spaceCount: 0,
      transitLines: 0,
      transitStations: 0,
      buildingCount: buildings.length,
      lampCount: lamps.length,
      palmCount: palms.length
    }
  };

  S.log('city', true,
    'Marine Drive · ' + buildings.length + ' buildings · ' +
    lamps.length + ' lamps · ' + palms.length + ' palms');

})();
