// city.js
import { THREE } from "./three.js";
import Environment from "./environment.js";
import Buildings from "./buildings.js";

class SeededRandom {
  constructor(seed = 12345) {
    this.seed = seed >>> 0;
  }

  next() {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  range(min, max) {
    return min + (max - min) * this.next();
  }

  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  pick(array) {
    return array[Math.floor(this.next() * array.length)];
  }
}

class City {
  constructor(engine, performance) {
    this.engine = engine;
    this.performance = performance;
    this.scene = engine.getScene();

    this.events = new THREE.EventDispatcher();
    this.random = new SeededRandom(847291);

    this.group = new THREE.Group();
    this.group.name = "SANTINOPOLE_CITY";

    this.scene.add(this.group);

    this.clock = {
      elapsed: 0,
      delta: 0
    };

    this.districts = new Map();
    this.traffic = [];
    this.landmarks = [];
    this.lightSystems = [];

    this.quality = "high";

    this.environment = new Environment(engine, performance);
    this.group.add(this.environment.getObject());

    this.buildings = new Buildings(engine, performance);
    this.group.add(this.buildings.getObject());

    this.createGround();
    this.createRoadNetwork();
    this.createCityGrid();
    this.createDistricts();
    this.createLandmarks();
    this.createTraffic();
    this.createStreetLights();
    this.createAtmosphericDepth();

    this.handleEngineUpdate = this.handleEngineUpdate.bind(this);
    this.handleResize = this.handleResize.bind(this);

    engine.on("update", this.handleEngineUpdate);
    engine.on("resize", this.handleResize);

    if (performance) {
      this.quality = performance.getTier();
      this.setQuality(this.quality);

      this.handleQuality = ({ detail }) => {
        if (detail?.tier) {
          this.setQuality(detail.tier);
        }
      };

      window.addEventListener(
        "santinopole:quality",
        this.handleQuality
      );
    }
  }

  /* ------------------------------------------------------------------------
     CITY FOUNDATION
  ------------------------------------------------------------------------ */

  createGround() {
    const geometry = new THREE.PlaneGeometry(3200, 3200, 1, 1);

    const material = new THREE.MeshStandardMaterial({
      color: 0x101317,
      roughness: 0.94,
      metalness: 0.06
    });

    const ground = new THREE.Mesh(geometry, material);

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    ground.name = "CITY_GROUND";

    this.ground = ground;
    this.group.add(ground);
  }

  createRoadNetwork() {
    this.roads = new THREE.Group();
    this.roads.name = "ROAD_NETWORK";

    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x171a1e,
      roughness: 0.86,
      metalness: 0.18
    });

    const roadEdgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x292d32,
      roughness: 0.7,
      metalness: 0.25
    });

    const roadWidth = 18;
    const roadLength = 1450;

    const horizontalGeometry = new THREE.BoxGeometry(
      roadLength,
      0.35,
      roadWidth
    );

    const verticalGeometry = new THREE.BoxGeometry(
      roadWidth,
      0.35,
      roadLength
    );

    const horizontal = new THREE.InstancedMesh(
      horizontalGeometry,
      roadMaterial,
      13
    );

    const vertical = new THREE.InstancedMesh(
      verticalGeometry,
      roadMaterial,
      13
    );

    const matrix = new THREE.Matrix4();

    const roadPositions = [
      -720, -600, -480, -360, -240, -120,
      0,
      120, 240, 360, 480, 600, 720
    ];

    roadPositions.forEach((position, index) => {
      matrix.makeTranslation(0, -0.8, position);
      horizontal.setMatrixAt(index, matrix);

      matrix.makeTranslation(position, -0.79, 0);
      vertical.setMatrixAt(index, matrix);
    });

    horizontal.instanceMatrix.needsUpdate = true;
    vertical.instanceMatrix.needsUpdate = true;

    this.roads.add(horizontal, vertical);

    const edgeGeometry = new THREE.BoxGeometry(
      roadLength,
      0.22,
      1.1
    );

    const edgeTop = new THREE.InstancedMesh(
      edgeGeometry,
      roadEdgeMaterial,
      26
    );

    const edgeBottom = new THREE.InstancedMesh(
      edgeGeometry,
      roadEdgeMaterial,
      26
    );

    roadPositions.forEach((position, index) => {
      matrix.makeTranslation(0, -0.58, position - roadWidth / 2);
      edgeTop.setMatrixAt(index, matrix);

      matrix.makeTranslation(0, -0.58, position + roadWidth / 2);
      edgeBottom.setMatrixAt(index, matrix);

      matrix.makeRotationY(Math.PI / 2);
      matrix.setPosition(
        position - roadWidth / 2,
        -0.57,
        0
      );
      edgeTop.setMatrixAt(index + 13, matrix);

      matrix.setPosition(
        position + roadWidth / 2,
        -0.57,
        0
      );
      edgeBottom.setMatrixAt(index + 13, matrix);
    });

    edgeTop.instanceMatrix.needsUpdate = true;
    edgeBottom.instanceMatrix.needsUpdate = true;

    this.roads.add(edgeTop, edgeBottom);

    this.group.add(this.roads);
  }

  createCityGrid() {
    const grid = new THREE.Group();
    grid.name = "CITY_GRID";

    const lineMaterial = new THREE.MeshBasicMaterial({
      color: 0x343940,
      transparent: true,
      opacity: 0.32
    });

    const geometry = new THREE.BoxGeometry(1.2, 0.06, 92);

    const lines = new THREE.InstancedMesh(
      geometry,
      lineMaterial,
      62
    );

    const matrix = new THREE.Matrix4();

    for (let i = 0; i < 62; i++) {
      const x = -930 + i * 30;

      matrix.makeTranslation(x, -0.57, 0);
      lines.setMatrixAt(i, matrix);
    }

    lines.instanceMatrix.needsUpdate = true;

    const horizontalGeometry = new THREE.BoxGeometry(
      92,
      0.06,
      1.2
    );

    const horizontalLines = new THREE.InstancedMesh(
      horizontalGeometry,
      lineMaterial,
      62
    );

    for (let i = 0; i < 62; i++) {
      const z = -930 + i * 30;

      matrix.makeTranslation(0, -0.56, z);
      horizontalLines.setMatrixAt(i, matrix);
    }

    horizontalLines.instanceMatrix.needsUpdate = true;

    grid.add(lines, horizontalLines);
    this.grid = grid;

    this.group.add(grid);
  }

  /* ------------------------------------------------------------------------
     DISTRICTS
  ------------------------------------------------------------------------ */

  createDistricts() {
    const definitions = [
      {
        id: "downtown",
        type: "downtown",
        position: [0, 0],
        size: 260,
        density: 1.0
      },
      {
        id: "commercial",
        type: "commercial",
        position: [350, -80],
        size: 230,
        density: 0.95
      },
      {
        id: "web",
        type: "web",
        position: [-340, -100],
        size: 220,
        density: 0.9
      },
      {
        id: "seo",
        type: "seo",
        position: [-300, 360],
        size: 240,
        density: 0.82
      },
      {
        id: "growth",
        type: "growth",
        position: [330, 360],
        size: 250,
        density: 0.86
      },
      {
        id: "historic",
        type: "historic",
        position: [-500, -430],
        size: 250,
        density: 0.72
      },
      {
        id: "residential",
        type: "residential",
        position: [470, -440],
        size: 280,
        density: 0.68
      },
      {
        id: "waterfront",
        type: "commercial",
        position: [0, 650],
        size: 360,
        density: 0.52
      }
    ];

    definitions.forEach((definition) => {
      const district = new THREE.Group();

      district.name = `DISTRICT_${definition.id.toUpperCase()}`;
      district.position.set(
        definition.position[0],
        0,
        definition.position[1]
      );

      const footprint = definition.size * definition.density;

      this.buildings.createDistrict({
        type: definition.type,
        size: footprint,
        density: definition.density,
        position: [0, 0],
        seed: this.random.int(1000, 999999)
      });

      this.districts.set(definition.id, {
        id: definition.id,
        type: definition.type,
        position: new THREE.Vector3(
          definition.position[0],
          0,
          definition.position[1]
        ),
        size: definition.size,
        density: definition.density,
        group: district
      });

      this.group.add(district);
    });
  }

  getDistrict(id) {
    return this.districts.get(id) || null;
  }

  getDistricts() {
    return this.districts;
  }

  /* ------------------------------------------------------------------------
     LANDMARKS
  ------------------------------------------------------------------------ */

  createLandmarks() {
    this.createCentralTower();
    this.createCivicPlaza();
    this.createObservationSpire();
    this.createWaterfrontStructure();
  }

  createCentralTower() {
    const group = new THREE.Group();
    group.name = "SANTINOPOLE_TOWER";

    const baseGeometry = new THREE.BoxGeometry(56, 340, 56);

    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x20262d,
      roughness: 0.3,
      metalness: 0.72,
      clearcoat: 0.35
    });

    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 168;

    group.add(base);

    const crownGeometry = new THREE.ConeGeometry(
      32,
      95,
      8
    );

    const crownMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x161b21,
      roughness: 0.22,
      metalness: 0.85
    });

    const crown = new THREE.Mesh(
      crownGeometry,
      crownMaterial
    );

    crown.position.y = 385;

    group.add(crown);

    const ringGeometry = new THREE.TorusGeometry(
      39,
      1.5,
      8,
      48
    );

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x8ea8b8,
      transparent: true,
      opacity: 0.72
    });

    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        ringGeometry,
        ringMaterial
      );

      ring.rotation.x = Math.PI / 2;
      ring.position.y = 105 + i * 72;

      group.add(ring);
    }

    group.position.set(0, 0, 0);

    this.landmarks.push(group);
    this.group.add(group);
  }

  createCivicPlaza() {
    const plaza = new THREE.Group();
    plaza.name = "CIVIC_PLAZA";

    const platformGeometry = new THREE.CylinderGeometry(
      92,
      92,
      1.5,
      64
    );

    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x272c31,
      roughness: 0.65,
      metalness: 0.22
    });

    const platform = new THREE.Mesh(
      platformGeometry,
      platformMaterial
    );

    platform.position.set(-180, -0.1, -180);

    plaza.add(platform);

    const innerGeometry = new THREE.CylinderGeometry(
      54,
      54,
      0.5,
      64
    );

    const innerMaterial = new THREE.MeshStandardMaterial({
      color: 0x161a1e,
      roughness: 0.45,
      metalness: 0.3
    });

    const inner = new THREE.Mesh(
      innerGeometry,
      innerMaterial
    );

    inner.position.set(-180, 0.7, -180);

    plaza.add(inner);

    this.landmarks.push(plaza);
    this.group.add(plaza);
  }

  createObservationSpire() {
    const group = new THREE.Group();
    group.name = "OBSERVATION_SPIRE";

    const shaftGeometry = new THREE.CylinderGeometry(
      9,
      20,
      250,
      12
    );

    const shaftMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x2b333a,
      roughness: 0.28,
      metalness: 0.78
    });

    const shaft = new THREE.Mesh(
      shaftGeometry,
      shaftMaterial
    );

    shaft.position.y = 125;

    group.add(shaft);

    const beaconGeometry = new THREE.SphereGeometry(
      11,
      20,
      20
    );

    const beaconMaterial = new THREE.MeshBasicMaterial({
      color: 0xc5d9e4
    });

    const beacon = new THREE.Mesh(
      beaconGeometry,
      beaconMaterial
    );

    beacon.position.y = 255;

    group.add(beacon);

    group.position.set(
      -600,
      0,
      420
    );

    this.landmarks.push(group);
    this.group.add(group);
  }

  createWaterfrontStructure() {
    const group = new THREE.Group();
    group.name = "WATERFRONT_LANDMARK";

    const arcGeometry = new THREE.TorusGeometry(
      80,
      7,
      16,
      64,
      Math.PI
    );

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x30383e,
      roughness: 0.28,
      metalness: 0.78
    });

    const arc = new THREE.Mesh(
      arcGeometry,
      material
    );

    arc.rotation.z = Math.PI;
    arc.position.y = 70;

    group.add(arc);

    group.position.set(0, 0, 650);

    this.landmarks.push(group);
    this.group.add(group);
  }

  /* ------------------------------------------------------------------------
     TRAFFIC
  ------------------------------------------------------------------------ */

  createTraffic() {
    this.trafficGroup = new THREE.Group();
    this.trafficGroup.name = "TRAFFIC";

    const vehicleGeometry = new THREE.BoxGeometry(
      3.2,
      1.1,
      6
    );

    const vehicleMaterial = new THREE.MeshStandardMaterial({
      color: 0x6d747a,
      roughness: 0.38,
      metalness: 0.65
    });

    const lightMaterial = new THREE.MeshBasicMaterial({
      color: 0xdde9ef
    });

    const rearMaterial = new THREE.MeshBasicMaterial({
      color: 0xb24a4a
    });

    const maxVehicles = 160;

    this.vehicleMesh = new THREE.InstancedMesh(
      vehicleGeometry,
      vehicleMaterial,
      maxVehicles
    );

    this.headlightMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.45, 0.25, 0.55),
      lightMaterial,
      maxVehicles * 2
    );

    this.taillightMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.45, 0.25, 0.55),
      rearMaterial,
      maxVehicles * 2
    );

    this.vehicleMesh.instanceMatrix.setUsage(
      THREE.DynamicDrawUsage
    );

    this.headlightMesh.instanceMatrix.setUsage(
      THREE.DynamicDrawUsage
    );

    this.taillightMesh.instanceMatrix.setUsage(
      THREE.DynamicDrawUsage
    );

    this.trafficGroup.add(
      this.vehicleMesh,
      this.headlightMesh,
      this.taillightMesh
    );

    this.group.add(this.trafficGroup);

    this.vehicleState = [];

    for (let i = 0; i < maxVehicles; i++) {
      const horizontal = i % 2 === 0;

      const lane = this.random.pick([
        -6.5,
        -2.8,
        2.8,
        6.5
      ]);

      const road = this.random.int(-12, 12) * 60;

      const direction = this.random.next() > 0.5 ? 1 : -1;

      const state = {
        horizontal,
        lane,
        road,
        direction,
        speed: this.random.range(18, 42),
        offset: this.random.range(-700, 700),
        active: true
      };

      this.vehicleState.push(state);

      this.updateVehicleMatrix(i, state, 0);
    }

    this.vehicleMesh.instanceMatrix.needsUpdate = true;
    this.headlightMesh.instanceMatrix.needsUpdate = true;
    this.taillightMesh.instanceMatrix.needsUpdate = true;
  }

  updateVehicleMatrix(index, state, elapsed) {
    let x;
    let z;
    let rotation;

    if (state.horizontal) {
      x =
        ((state.offset + elapsed * state.speed * state.direction) %
          1450 + 1450) %
          1450 -
        725;

      z = state.road + state.lane;
      rotation =
        state.direction > 0
          ? 0
          : Math.PI;
    } else {
      z =
        ((state.offset + elapsed * state.speed * state.direction) %
          1450 + 1450) %
          1450 -
        725;

      x = state.road + state.lane;
      rotation =
        state.direction > 0
          ? Math.PI / 2
          : -Math.PI / 2;
    }

    const matrix = new THREE.Matrix4();

    matrix.compose(
      new THREE.Vector3(x, 0.25, z),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, rotation, 0)
      ),
      new THREE.Vector3(1, 1, 1)
    );

    this.vehicleMesh.setMatrixAt(index, matrix);

    const lightDistance = 2.65;

    const front = new THREE.Vector3(
      0,
      0.25,
      -lightDistance
    ).applyQuaternion(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, rotation, 0)
      )
    );

    const rear = new THREE.Vector3(
      0,
      0.25,
      lightDistance
    ).applyQuaternion(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, rotation, 0)
      )
    );

    const frontLeft = new THREE.Vector3(
      x + front.x - 0.8,
      front.y,
      z + front.z
    );

    const frontRight = new THREE.Vector3(
      x + front.x + 0.8,
      front.y,
      z + front.z
    );

    const rearLeft = new THREE.Vector3(
      x + rear.x - 0.8,
      rear.y,
      z + rear.z
    );

    const rearRight = new THREE.Vector3(
      x + rear.x + 0.8,
      rear.y,
      z + rear.z
    );

    matrix.makeTranslation(
      frontLeft.x,
      frontLeft.y,
      frontLeft.z
    );

    this.headlightMesh.setMatrixAt(
      index * 2,
      matrix
    );

    matrix.makeTranslation(
      frontRight.x,
      frontRight.y,
      frontRight.z
    );

    this.headlightMesh.setMatrixAt(
      index * 2 + 1,
      matrix
    );

    matrix.makeTranslation(
      rearLeft.x,
      rearLeft.y,
      rearLeft.z
    );

    this.taillightMesh.setMatrixAt(
      index * 2,
      matrix
    );

    matrix.makeTranslation(
      rearRight.x,
      rearRight.y,
      rearRight.z
    );

    this.taillightMesh.setMatrixAt(
      index * 2 + 1,
      matrix
    );
  }

  /* ------------------------------------------------------------------------
     STREET LIGHTING
  ------------------------------------------------------------------------ */

  createStreetLights() {
    const group = new THREE.Group();
    group.name = "STREET_LIGHTS";

    const poleGeometry = new THREE.CylinderGeometry(
      0.35,
      0.5,
      8,
      8
    );

    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3e42,
      roughness: 0.55,
      metalness: 0.65
    });

    const bulbGeometry = new THREE.SphereGeometry(
      0.65,
      8,
      8
    );

    const bulbMaterial = new THREE.MeshBasicMaterial({
      color: 0xd4e3ea
    });

    const count = 220;

    const poles = new THREE.InstancedMesh(
      poleGeometry,
      poleMaterial,
      count
    );

    const bulbs = new THREE.InstancedMesh(
      bulbGeometry,
      bulbMaterial,
      count
    );

    const matrix = new THREE.Matrix4();

    let index = 0;

    for (
      let road = -600;
      road <= 600;
      road += 120
    ) {
      for (
        let side = -1;
        side <= 1;
        side += 2
      ) {
        if (index >= count) break;

        matrix.makeTranslation(
          road + side * 13,
          3.5,
          0
        );

        poles.setMatrixAt(index, matrix);

        matrix.makeTranslation(
          road + side * 13,
          7.4,
          0
        );

        bulbs.setMatrixAt(index, matrix);

        index++;
      }
    }

    poles.instanceMatrix.needsUpdate = true;
    bulbs.instanceMatrix.needsUpdate = true;

    group.add(poles, bulbs);

    this.streetLights = {
      group,
      bulbs
    };

    this.group.add(group);
  }

  /* ------------------------------------------------------------------------
     ATMOSPHERIC DEPTH
  ------------------------------------------------------------------------ */

  createAtmosphericDepth() {
    const distant = new THREE.Group();
    distant.name = "DISTANT_CITY";

    const material = new THREE.MeshStandardMaterial({
      color: 0x20252b,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.68
    });

    const geometry = new THREE.BoxGeometry(30, 1, 30);

    for (let i = 0; i < 140; i++) {
      const height = this.random.range(30, 210);

      const building = new THREE.Mesh(
        geometry,
        material
      );

      const angle =
        this.random.range(0, Math.PI * 2);

      const radius =
        this.random.range(850, 1250);

      building.position.set(
        Math.cos(angle) * radius,
        height / 2 - 1,
        Math.sin(angle) * radius
      );

      building.scale.set(
        this.random.range(0.7, 2.2),
        height / 30,
        this.random.range(0.7, 2.2)
      );

      distant.add(building);
    }

    this.distantCity = distant;
    this.group.add(distant);
  }

  /* ------------------------------------------------------------------------
     UPDATE LOOP
  ------------------------------------------------------------------------ */

  handleEngineUpdate({ delta, elapsed }) {
    this.clock.delta = delta;
    this.clock.elapsed = elapsed;

    this.environment.update(delta, elapsed);
    this.buildings.update(delta, elapsed);

    this.updateTraffic(elapsed);
    this.updateStreetLights(elapsed);
    this.updateLandmarks(delta, elapsed);

    this.events.dispatchEvent({
      type: "update",
      delta,
      elapsed
    });
  }

  updateTraffic(elapsed) {
    if (!this.vehicleMesh) return;

    const activeCount =
      this.quality === "high"
        ? 160
        : this.quality === "medium"
          ? 105
          : 60;

    for (let i = 0; i < this.vehicleState.length; i++) {
      const state = this.vehicleState[i];

      if (i >= activeCount) {
        const hidden = new THREE.Matrix4();
        hidden.makeScale(0, 0, 0);

        this.vehicleMesh.setMatrixAt(i, hidden);

        hidden.makeScale(0, 0, 0);

        this.headlightMesh.setMatrixAt(
          i * 2,
          hidden
        );

        this.headlightMesh.setMatrixAt(
          i * 2 + 1,
          hidden
        );

        this.taillightMesh.setMatrixAt(
          i * 2,
          hidden
        );

        this.taillightMesh.setMatrixAt(
          i * 2 + 1,
          hidden
        );

        continue;
      }

      this.updateVehicleMatrix(
        i,
        state,
        elapsed
      );
    }

    this.vehicleMesh.count = activeCount;
    this.headlightMesh.count = activeCount * 2;
    this.taillightMesh.count = activeCount * 2;

    this.vehicleMesh.instanceMatrix.needsUpdate = true;
    this.headlightMesh.instanceMatrix.needsUpdate = true;
    this.taillightMesh.instanceMatrix.needsUpdate = true;
  }

  updateStreetLights(elapsed) {
    if (!this.streetLights?.bulbs) return;

    const pulse =
      0.72 +
      Math.sin(elapsed * 1.8) * 0.06;

    this.streetLights.bulbs.material.opacity =
      pulse;
  }

  updateLandmarks(delta, elapsed) {
    if (this.landmarks.length === 0) return;

    const tower = this.landmarks[0];

    if (tower) {
      tower.rotation.y += delta * 0.018;
    }

    const spire = this.landmarks[2];

    if (spire) {
      const beacon = spire.children[1];

      if (beacon) {
        const scale =
          1 +
          Math.sin(elapsed * 2.4) * 0.08;

        beacon.scale.setScalar(scale);
      }
    }
  }

  /* ------------------------------------------------------------------------
     QUALITY
  ------------------------------------------------------------------------ */

  setQuality(tier = "high") {
    this.quality = tier;

    this.environment.setQuality(tier);
    this.buildings.setQuality(tier);

    if (this.distantCity) {
      this.distantCity.visible = tier !== "low";
    }

    if (this.grid) {
      this.grid.visible = tier !== "low";
    }

    this.events.dispatchEvent({
      type: "quality",
      tier
    });
  }

  /* ------------------------------------------------------------------------
     PUBLIC API
  ------------------------------------------------------------------------ */

  resize(width, height) {
    this.events.dispatchEvent({
      type: "resize",
      width,
      height
    });
  }

  handleResize({ width, height }) {
    this.resize(width, height);
  }

  on(type, callback) {
    this.events.addEventListener(type, callback);
  }

  off(type, callback) {
    this.events.removeEventListener(type, callback);
  }

  getObject() {
    return this.group;
  }

  getEnvironment() {
    return this.environment;
  }

  getBuildings() {
    return this.buildings;
  }

  getTraffic() {
    return this.trafficGroup;
  }

  getLandmarks() {
    return this.landmarks;
  }

  getDistrict(id) {
    return this.districts.get(id);
  }

  setDistrictVisibility(id, visible) {
    const district = this.districts.get(id);

    if (district) {
      district.group.visible = visible;
    }
  }

  setCityVisibility(visible) {
    this.group.visible = visible;
  }

  destroy() {
    this.engine.off(
      "update",
      this.handleEngineUpdate
    );

    this.engine.off(
      "resize",
      this.handleResize
    );

    if (this.handleQuality) {
      window.removeEventListener(
        "santinopole:quality",
        this.handleQuality
      );
    }

    this.environment.destroy();
    this.buildings.destroy();

    this.group.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        const materials = Array.isArray(
          object.material
        )
          ? object.material
          : [object.material];

        materials.forEach((material) => {
          if (material.map) {
            material.map.dispose();
          }

          material.dispose();
        });
      }
    });

    this.scene.remove(this.group);
    this.districts.clear();
    this.traffic.length = 0;
    this.landmarks.length = 0;
  }
}

export { City };
export default City;
