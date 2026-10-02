import { THREE } from "./three.js";
import Environment from "./environment.js";
import Buildings from "./buildings.js";

class SeededRandom {
  constructor(seed = 12345) {
    this.seed =
      seed >>> 0;
  }

  next() {
    this.seed =
      (
        1664525 *
        this.seed +
        1013904223
      ) >>> 0;

    return this.seed /
      4294967296;
  }

  range(min, max) {
    return (
      min +
      (max - min) *
        this.next()
    );
  }

  int(min, max) {
    return Math.floor(
      this.range(
        min,
        max + 1
      )
    );
  }

  pick(array) {
    return array[
      Math.floor(
        this.next() *
          array.length
      )
    ];
  }
}

class City {
  constructor(
    engine,
    performance
  ) {
    this.engine =
      engine;

    this.performance =
      performance;

    this.scene =
      engine.getScene();

    this.events =
      new THREE.EventDispatcher();

    this.group =
      new THREE.Group();

    this.group.name =
      "SANTINOPOLE_CITY";

    this.scene.add(
      this.group
    );

    this.clock = {
      elapsed: 0,
      delta: 0
    };

    this.quality =
      performance?.getTier?.() ||
      "high";

    this.districts =
      new Map();

    this.landmarks = [];

    this.random =
      new SeededRandom(
        847291
      );

    this.environment =
      new Environment(
        engine,
        performance
      );

    this.group.add(
      this.environment.getObject()
    );

    this.buildings =
      new Buildings(
        engine,
        performance
      );

    this.group.add(
      this.buildings.getObject()
    );

    this.createGround();
    this.createRoadNetwork();
    this.createCityGrid();
    this.createDistrictRegistry();
    this.createLandmarks();
    this.createTraffic();
    this.createStreetLights();
    this.createAtmosphericDepth();

    this.handleUpdate =
      this.handleUpdate.bind(this);

    this.handleResize =
      this.handleResize.bind(this);

    engine.on(
      "update",
      this.handleUpdate
    );

    engine.on(
      "resize",
      this.handleResize
    );

    this.handleQuality =
      ({ detail }) => {
        if (
          detail?.tier
        ) {
          this.setQuality(
            detail.tier
          );
        }
      };

    window.addEventListener(
      "santinopole:quality",
      this.handleQuality
    );

    this.setQuality(
      this.quality
    );
  }

  createGround() {
    const geometry =
      new THREE.PlaneGeometry(
        3200,
        3200
      );

    const material =
      new THREE.MeshStandardMaterial({
        color: 0x111419,
        roughness: 0.94,
        metalness: 0.08
      });

    this.ground =
      new THREE.Mesh(
        geometry,
        material
      );

    this.ground.rotation.x =
      -Math.PI / 2;

    this.ground.position.y =
      -2;

    this.ground.receiveShadow =
      true;

    this.ground.name =
      "SANTINOPOLE_GROUND";

    this.group.add(
      this.ground
    );
  }

  createRoadNetwork() {
    const roads =
      new THREE.Group();

    roads.name =
      "ROAD_NETWORK";

    const material =
      new THREE.MeshStandardMaterial({
        color: 0x191c20,
        roughness: 0.82,
        metalness: 0.2
      });

    const roadWidth = 18;
    const roadLength = 1450;

    const horizontal =
      new THREE.InstancedMesh(
        new THREE.BoxGeometry(
          roadLength,
          0.35,
          roadWidth
        ),
        material,
        13
      );

    const vertical =
      new THREE.InstancedMesh(
        new THREE.BoxGeometry(
          roadWidth,
          0.35,
          roadLength
        ),
        material,
        13
      );

    const matrix =
      new THREE.Matrix4();

    const positions = [
      -720,
      -600,
      -480,
      -360,
      -240,
      -120,
      0,
      120,
      240,
      360,
      480,
      600,
      720
    ];

    positions.forEach(
      (position, index) => {
        matrix.makeTranslation(
          0,
          -0.8,
          position
        );

        horizontal.setMatrixAt(
          index,
          matrix
        );

        matrix.makeTranslation(
          position,
          -0.79,
          0
        );

        vertical.setMatrixAt(
          index,
          matrix
        );
      }
    );

    horizontal.instanceMatrix.needsUpdate =
      true;

    vertical.instanceMatrix.needsUpdate =
      true;

    roads.add(
      horizontal,
      vertical
    );

    this.group.add(
      roads
    );

    this.roads =
      roads;
  }

  createCityGrid() {
    const grid =
      new THREE.Group();

    grid.name =
      "CITY_GRID";

    const material =
      new THREE.MeshBasicMaterial({
        color: 0x3a4046,
        transparent: true,
        opacity: 0.22
      });

    const geometry =
      new THREE.BoxGeometry(
        0.8,
        0.05,
        92
      );

    const vertical =
      new THREE.InstancedMesh(
        geometry,
        material,
        62
      );

    const horizontal =
      new THREE.InstancedMesh(
        new THREE.BoxGeometry(
          92,
          0.05,
          0.8
        ),
        material,
        62
      );

    const matrix =
      new THREE.Matrix4();

    for (
      let i = 0;
      i < 62;
      i++
    ) {
      const position =
        -915 + i * 30;

      matrix.makeTranslation(
        position,
        -0.57,
        0
      );

      vertical.setMatrixAt(
        i,
        matrix
      );

      matrix.makeTranslation(
        0,
        -0.56,
        position
      );

      horizontal.setMatrixAt(
        i,
        matrix
      );
    }

    vertical.instanceMatrix.needsUpdate =
      true;

    horizontal.instanceMatrix.needsUpdate =
      true;

    grid.add(
      vertical,
      horizontal
    );

    this.grid =
      grid;

    this.group.add(
      grid
    );
  }

  createDistrictRegistry() {
    const definitions = [
      {
        id: "downtown",
        type: "downtown",
        position: [0, 0],
        size: 260,
        density: 1
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

    definitions.forEach(
      (definition) => {
        const district =
          this.buildings.getDistrict(
            definition.id
          );

        this.districts.set(
          definition.id,
          {
            id:
              definition.id,

            type:
              definition.type,

            position:
              new THREE.Vector3(
                definition.position[0],
                0,
                definition.position[1]
              ),

            size:
              definition.size,

            density:
              definition.density,

            group:
              district
          }
        );
      }
    );
  }

  createLandmarks() {
    this.createCentralTower();
    this.createCivicPlaza();
    this.createObservationSpire();
    this.createWaterfrontStructure();
  }

  createCentralTower() {
    const group =
      new THREE.Group();

    group.name =
      "SANTINOPOLE_TOWER";

    const body =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          56,
          340,
          56
        ),
        new THREE.MeshPhysicalMaterial({
          color: 0x20272e,
          roughness: 0.28,
          metalness: 0.76,
          clearcoat: 0.3
        })
      );

    body.position.y =
      170;

    body.castShadow = true;
    body.receiveShadow = true;

    group.add(
      body
    );

    const crown =
      new THREE.Mesh(
        new THREE.ConeGeometry(
          32,
          95,
          8
        ),
        new THREE.MeshPhysicalMaterial({
          color: 0x14191f,
          roughness: 0.2,
          metalness: 0.84
        })
      );

    crown.position.y =
      387;

    crown.castShadow =
      true;

    group.add(
      crown
    );

    const ringGeometry =
      new THREE.TorusGeometry(
        39,
        1.4,
        8,
        48
      );

    const ringMaterial =
      new THREE.MeshBasicMaterial({
        color: 0xa6bbc5,
        transparent: true,
        opacity: 0.68
      });

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const ring =
        new THREE.Mesh(
          ringGeometry,
          ringMaterial
        );

      ring.rotation.x =
        Math.PI / 2;

      ring.position.y =
        105 + i * 72;

      group.add(
        ring
      );
    }

    this.landmarks.push(
      group
    );

    this.group.add(
      group
    );
  }

  createCivicPlaza() {
    const group =
      new THREE.Group();

    group.name =
      "CIVIC_PLAZA";

    const platform =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          92,
          92,
          1.5,
          64
        ),
        new THREE.MeshStandardMaterial({
          color: 0x292e33,
          roughness: 0.62,
          metalness: 0.22
        })
      );

    platform.position.set(
      -180,
      -0.1,
      -180
    );

    platform.receiveShadow =
      true;

    group.add(
      platform
    );

    this.landmarks.push(
      group
    );

    this.group.add(
      group
    );
  }

  createObservationSpire() {
    const group =
      new THREE.Group();

    group.name =
      "OBSERVATION_SPIRE";

    const shaft =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          9,
          20,
          250,
          12
        ),
        new THREE.MeshPhysicalMaterial({
          color: 0x2b3339,
          roughness: 0.28,
          metalness: 0.78
        })
      );

    shaft.position.y =
      125;

    group.add(
      shaft
    );

    const beacon =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          11,
          20,
          20
        ),
        new THREE.MeshBasicMaterial({
          color: 0xc6dbe4
        })
      );

    beacon.position.y =
      255;

    group.add(
      beacon
    );

    group.position.set(
      -600,
      0,
      420
    );

    this.landmarks.push(
      group
    );

    this.group.add(
      group
    );
  }

  createWaterfrontStructure() {
    const group =
      new THREE.Group();

    group.name =
      "WATERFRONT_LANDMARK";

    const arc =
      new THREE.Mesh(
        new THREE.TorusGeometry(
          80,
          7,
          16,
          64,
          Math.PI
        ),
        new THREE.MeshPhysicalMaterial({
          color: 0x30383e,
          roughness: 0.28,
          metalness: 0.78
        })
      );

    arc.rotation.z =
      Math.PI;

    arc.position.y =
      70;

    group.add(
      arc
    );

    group.position.set(
      0,
      0,
      650
    );

    this.landmarks.push(
      group
    );

    this.group.add(
      group
    );
  }

  createTraffic() {
    const group =
      new THREE.Group();

    group.name =
      "SANTINOPOLE_TRAFFIC";

    const maxVehicles =
      160;

    const vehicleGeometry =
      new THREE.BoxGeometry(
        3.2,
        1.1,
        6
      );

    const vehicleMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x687177,
        roughness: 0.38,
        metalness: 0.65
      });

    this.vehicleMesh =
      new THREE.InstancedMesh(
        vehicleGeometry,
        vehicleMaterial,
        maxVehicles
      );

    this.vehicleMesh.instanceMatrix.setUsage(
      THREE.DynamicDrawUsage
    );

    group.add(
      this.vehicleMesh
    );

    this.vehicleState = [];

    for (
      let i = 0;
      i < maxVehicles;
      i++
    ) {
      const horizontal =
        i % 2 === 0;

      const state = {
        horizontal,

        road:
          this.random.int(
            -12,
            12
          ) * 60,

        lane:
          this.random.pick([
            -6.5,
            -2.8,
            2.8,
            6.5
          ]),

        direction:
          this.random.next() >
          0.5
            ? 1
            : -1,

        speed:
          this.random.range(
            18,
            42
          ),

        offset:
          this.random.range(
            -700,
            700
          )
      };

      this.vehicleState.push(
        state
      );

      this.updateVehicle(
        i,
        state,
        0
      );
    }

    this.vehicleMesh.instanceMatrix.needsUpdate =
      true;

    this.traffic =
      group;

    this.group.add(
      group
    );
  }

  updateVehicle(
    index,
    state,
    elapsed
  ) {
    let x;
    let z;
    let rotation;

    const travel =
      (
        state.offset +
        elapsed *
          state.speed *
          state.direction
      ) %
      1450;

    const position =
      (
        travel +
        1450
      ) %
        1450 -
      725;

    if (
      state.horizontal
    ) {
      x = position;
      z =
        state.road +
        state.lane;

      rotation =
        state.direction > 0
          ? 0
          : Math.PI;
    } else {
      x =
        state.road +
        state.lane;

      z = position;

      rotation =
        state.direction > 0
          ? Math.PI / 2
          : -Math.PI / 2;
    }

    const matrix =
      new THREE.Matrix4();

    matrix.compose(
      new THREE.Vector3(
        x,
        0.2,
        z
      ),
      new THREE.Quaternion()
        .setFromEuler(
          new THREE.Euler(
            0,
            rotation,
            0
          )
        ),
      new THREE.Vector3(
        1,
        1,
        1
      )
    );

    this.vehicleMesh.setMatrixAt(
      index,
      matrix
    );
  }

  createStreetLights() {
    const group =
      new THREE.Group();

    group.name =
      "STREET_LIGHTS";

    const poles =
      new THREE.InstancedMesh(
        new THREE.CylinderGeometry(
          0.3,
          0.45,
          8,
          8
        ),
        new THREE.MeshStandardMaterial({
          color: 0x3a3f43,
          roughness: 0.55,
          metalness: 0.65
        }),
        200
      );

    const bulbs =
      new THREE.InstancedMesh(
        new THREE.SphereGeometry(
          0.7,
          8,
          8
        ),
        new THREE.MeshBasicMaterial({
          color: 0xd4e3ea
        }),
        200
      );

    const matrix =
      new THREE.Matrix4();

    let index = 0;

    for (
      let x = -600;
      x <= 600;
      x += 120
    ) {
      for (
        let side = -1;
        side <= 1;
        side += 2
      ) {
        if (
          index >= 200
        ) {
          break;
        }

        matrix.makeTranslation(
          x + side * 13,
          3.5,
          0
        );

        poles.setMatrixAt(
          index,
          matrix
        );

        matrix.makeTranslation(
          x + side * 13,
          7.4,
          0
        );

        bulbs.setMatrixAt(
          index,
          matrix
        );

        index++;
      }
    }

    poles.instanceMatrix.needsUpdate =
      true;

    bulbs.instanceMatrix.needsUpdate =
      true;

    group.add(
      poles,
      bulbs
    );

    this.streetLights =
      bulbs;

    this.group.add(
      group
    );
  }

  createAtmosphericDepth() {
    const group =
      new THREE.Group();

    group.name =
      "DISTANT_CITY";

    const geometry =
      new THREE.BoxGeometry(
        30,
        1,
        30
      );

    const material =
      new THREE.MeshStandardMaterial({
        color: 0x252b31,
        roughness: 0.95,
        metalness: 0.04,
        transparent: true,
        opacity: 0.62
      });

    for (
      let i = 0;
      i < 140;
      i++
    ) {
      const height =
        this.random.range(
          30,
          210
        );

      const building =
        new THREE.Mesh(
          geometry,
          material
        );

      const angle =
        this.random.range(
          0,
          Math.PI * 2
        );

      const radius =
        this.random.range(
          850,
          1250
        );

      building.position.set(
        Math.cos(angle) *
          radius,
        height / 2 - 1,
        Math.sin(angle) *
          radius
      );

      building.scale.set(
        this.random.range(
          0.7,
          2.2
        ),
        height / 30,
        this.random.range(
          0.7,
          2.2
        )
      );

      group.add(
        building
      );
    }

    this.distantCity =
      group;

    this.group.add(
      group
    );
  }

  handleUpdate({
    delta,
    elapsed
  }) {
    this.clock.delta =
      delta;

    this.clock.elapsed =
      elapsed;

    this.environment.update(
      delta,
      elapsed
    );

    this.buildings.update(
      delta,
      elapsed
    );

    this.updateTraffic(
      elapsed
    );

    this.updateLights(
      elapsed
    );

    this.updateLandmarks(
      delta,
      elapsed
    );
  }

  updateTraffic(elapsed) {
    if (
      !this.vehicleMesh
    ) {
      return;
    }

    const count =
      this.quality === "high"
        ? 160
        : this.quality === "medium"
          ? 105
          : 60;

    this.vehicleMesh.count =
      count;

    for (
      let i = 0;
      i < count;
      i++
    ) {
      this.updateVehicle(
        i,
        this.vehicleState[i],
        elapsed
      );
    }

    this.vehicleMesh.instanceMatrix.needsUpdate =
      true;
  }

  updateLights(elapsed) {
    if (
      !this.streetLights
    ) {
      return;
    }

    this.streetLights.material.opacity =
      0.7 +
      Math.sin(
        elapsed * 1.6
      ) *
        0.08;
  }

  updateLandmarks(
    delta,
    elapsed
  ) {
    if (
      !this.landmarks.length
    ) {
      return;
    }

    const tower =
      this.landmarks[0];

    tower.rotation.y +=
      delta * 0.012;

    const spire =
      this.landmarks[2];

    if (
      spire?.children[1]
    ) {
      const scale =
        1 +
        Math.sin(
          elapsed * 2.4
        ) *
          0.08;

      spire.children[1]
        .scale
        .setScalar(
          scale
        );
    }
  }

  setQuality(tier = "high") {
    this.quality =
      tier;

    this.environment.setQuality(
      tier
    );

    this.buildings.setQuality(
      tier
    );

    if (
      this.distantCity
    ) {
      this.distantCity.visible =
        tier !== "low";
    }

    if (
      this.grid
    ) {
      this.grid.visible =
        tier !== "low";
    }
  }

  getDistrict(id) {
    return (
      this.districts.get(
        id
      ) || null
    );
  }

  getDistricts() {
    return this.districts;
  }

  getBuildings() {
    return this.buildings;
  }

  getEnvironment() {
    return this.environment;
  }

  getObject() {
    return this.group;
  }

  on(type, callback) {
    this.events.addEventListener(
      type,
      callback
    );
  }

  off(type, callback) {
    this.events.removeEventListener(
      type,
      callback
    );
  }

  resize(width, height) {
    this.events.dispatchEvent({
      type: "resize",
      width,
      height
    });
  }

  handleResize({
    width,
    height
  }) {
    this.resize(
      width,
      height
    );
  }

  setDistrictVisibility(
    id,
    visible
  ) {
    const district =
      this.districts.get(
        id
      );

    if (
      district?.group
    ) {
      district.group.visible =
        visible;
    }
  }

  destroy() {
    this.engine.off(
      "update",
      this.handleUpdate
    );

    this.engine.off(
      "resize",
      this.handleResize
    );

    window.removeEventListener(
      "santinopole:quality",
      this.handleQuality
    );

    this.environment.destroy();
    this.buildings.destroy();

    this.group.traverse(
      (object) => {
        if (
          object.geometry
        ) {
          object.geometry.dispose();
        }

        if (
          object.material
        ) {
          const materials =
            Array.isArray(
              object.material
            )
              ? object.material
              : [object.material];

          materials.forEach(
            (material) => {
              material.dispose();
            }
          );
        }
      }
    );

    this.scene.remove(
      this.group
    );

    this.districts.clear();
    this.landmarks.length = 0;
    this.vehicleState.length = 0;
  }
}

export {
  City,
  SeededRandom
};

export default City;
