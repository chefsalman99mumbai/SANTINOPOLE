/* =========================================================
   SANTINOPOLE DIGITAL
   BUILDINGS — PROCEDURAL ARCHITECTURE SYSTEM
   ========================================================= */

import { THREE } from "./three.js";

/* =========================================================
   SEEDED RANDOMNESS
   ========================================================= */

class SeededRandom {
  constructor(seed = 12345) {
    this.seed = seed;
  }

  next() {
    this.seed =
      (this.seed * 1664525 + 1013904223) %
      4294967296;

    return this.seed / 4294967296;
  }

  range(min, max) {
    return (
      min +
      (max - min) *
        this.next()
    );
  }

  integer(min, max) {
    return Math.floor(
      this.range(
        min,
        max + 1
      )
    );
  }

  pick(array) {
    return array[
      this.integer(
        0,
        array.length - 1
      )
    ];
  }
}

/* =========================================================
   BUILDING SYSTEM
   ========================================================= */

class Buildings {
  constructor(
    engine,
    performanceController
  ) {
    this.engine = engine;
    this.performance =
      performanceController;

    this.scene =
      engine.getScene();

    this.random =
      new SeededRandom(
        82417
      );

    this.group =
      new THREE.Group();

    this.group.name =
      "santinopole-buildings";

    this.scene.add(
      this.group
    );

    this.state = {
      quality: 1,
      detail: 1,
    };

    this.materials = {};
    this.geometries = {};

    this.buildingCount = 0;

    this.createMaterials();
    this.createSharedGeometry();
  }

  /* =======================================================
     MATERIALS
  ======================================================== */

  createMaterials() {
    this.materials.concrete =
      new THREE.MeshStandardMaterial({
        color: 0x77736c,
        roughness: 0.72,
        metalness: 0.08,
      });

    this.materials.lightConcrete =
      new THREE.MeshStandardMaterial({
        color: 0xa7a29a,
        roughness: 0.68,
        metalness: 0.06,
      });

    this.materials.dark =
      new THREE.MeshStandardMaterial({
        color: 0x202326,
        roughness: 0.52,
        metalness: 0.24,
      });

    this.materials.glass =
      new THREE.MeshPhysicalMaterial({
        color: 0x667783,
        roughness: 0.18,
        metalness: 0.42,
        transmission: 0.08,
        transparent: true,
        opacity: 0.82,
      });

    this.materials.window =
      new THREE.MeshBasicMaterial({
        color: 0xbfc9cf,
        transparent: true,
        opacity: 0.32,
      });

    this.materials.roof =
      new THREE.MeshStandardMaterial({
        color: 0x303236,
        roughness: 0.78,
        metalness: 0.12,
      });

    this.materials.accent =
      new THREE.MeshStandardMaterial({
        color: 0x8c867a,
        roughness: 0.48,
        metalness: 0.3,
      });
  }

  /* =======================================================
     SHARED GEOMETRY
  ======================================================== */

  createSharedGeometry() {
    this.geometries.unitBox =
      new THREE.BoxGeometry(
        1,
        1,
        1
      );

    this.geometries.unitPlane =
      new THREE.PlaneGeometry(
        1,
        1
      );
  }

  /* =======================================================
     CITY BLOCK
  ======================================================== */

  createBlock({
    centerX = 0,
    centerZ = 0,
    width = 160,
    depth = 160,
    rows = 4,
    columns = 4,
    district = "standard",
  } = {}) {
    const block =
      new THREE.Group();

    block.name =
      `block-${this.buildingCount}`;

    const spacingX =
      width / columns;

    const spacingZ =
      depth / rows;

    const inset =
      Math.min(
        spacingX,
        spacingZ
      ) * 0.17;

    for (
      let row = 0;
      row < rows;
      row++
    ) {
      for (
        let column = 0;
        column < columns;
        column++
      ) {
        const x =
          centerX -
          width / 2 +
          spacingX *
            (column + 0.5);

        const z =
          centerZ -
          depth / 2 +
          spacingZ *
            (row + 0.5);

        const building =
          this.createBuilding({
            x,
            z,
            width:
              spacingX -
              inset,
            depth:
              spacingZ -
              inset,
            district,
          });

        block.add(
          building
        );
      }
    }

    this.group.add(
      block
    );

    return block;
  }

  /* =======================================================
     BUILDING
  ======================================================== */

  createBuilding({
    x = 0,
    z = 0,
    width = 24,
    depth = 24,
    height,
    district = "standard",
  } = {}) {
    const group =
      new THREE.Group();

    const selectedHeight =
      height ??
      this.getHeight(
        district
      );

    const architecture =
      this.getArchitecture(
        district
      );

    group.name =
      `building-${this.buildingCount++}`;

    group.position.set(
      x,
      0,
      z
    );

    /*
      Main mass.
    */

    const body =
      this.createMass(
        width,
        selectedHeight,
        depth,
        architecture
      );

    body.position.y =
      selectedHeight / 2;

    group.add(
      body
    );

    /*
      Architectural crown.
    */

    this.createCrown(
      group,
      width,
      selectedHeight,
      depth,
      architecture
    );

    /*
      Vertical façade rhythm.
    */

    if (
      this.state.detail >
      0.55
    ) {
      this.createFacadeBands(
        group,
        width,
        selectedHeight,
        depth,
        architecture
      );
    }

    /*
      Windows are deliberately
      instanced-like in concept:
      shared geometry/material,
      limited count and grouped.
    */

    if (
      this.state.detail >
      0.65
    ) {
      this.createWindows(
        group,
        width,
        selectedHeight,
        depth,
        architecture
      );
    }

    /*
      Rooftop equipment / terraces.
    */

    if (
      this.state.detail >
      0.45
    ) {
      this.createRooftop(
        group,
        width,
        selectedHeight,
        depth,
        architecture
      );
    }

    /*
      Controlled rotation prevents
      procedural repetition.
    */

    group.rotation.y =
      this.random.range(
        -0.025,
        0.025
      );

    this.applyDistrictScale(
      group,
      district
    );

    return group;
  }

  /* =======================================================
     HEIGHT
  ======================================================== */

  getHeight(
    district
  ) {
    switch (
      district
    ) {
      case "downtown":
        return this.random.range(
          80,
          260
        );

      case "commercial":
        return this.random.range(
          45,
          150
        );

      case "web":
        return this.random.range(
          70,
          210
        );

      case "seo":
        return this.random.range(
          55,
          180
        );

      case "growth":
        return this.random.range(
          90,
          240
        );

      case "historic":
        return this.random.range(
          16,
          48
        );

      case "residential":
        return this.random.range(
          24,
          90
        );

      default:
        return this.random.range(
          25,
          110
        );
    }
  }

  /* =======================================================
     ARCHITECTURAL LANGUAGE
  ======================================================== */

  getArchitecture(
    district
  ) {
    const types = [
      "tower",
      "modern",
      "terraced",
      "glass",
      "stone",
    ];

    let type =
      this.random.pick(
        types
      );

    if (
      district ===
      "historic"
    ) {
      type = "stone";
    }

    if (
      district ===
      "web"
    ) {
      type =
        this.random.pick([
          "glass",
          "tower",
          "modern",
        ]);
    }

    if (
      district ===
      "growth"
    ) {
      type =
        this.random.pick([
          "tower",
          "glass",
          "modern",
        ]);
    }

    return {
      type,

      material:
        this.random.pick([
          "concrete",
          "lightConcrete",
          "dark",
          "glass",
        ]),

      setback:
        this.random.range(
          0.08,
          0.22
        ),

      bands:
        this.random.integer(
          2,
          7
        ),

      windowDensity:
        this.random.range(
          0.35,
          0.72
        ),
    };
  }

  /* =======================================================
     MAIN MASS
  ======================================================== */

  createMass(
    width,
    height,
    depth,
    architecture
  ) {
    const geometry =
      this.geometries.unitBox;

    const material =
      this.materials[
        architecture.material
      ] ||
      this.materials.concrete;

    const mesh =
      new THREE.Mesh(
        geometry,
        material
      );

    mesh.scale.set(
      width,
      height,
      depth
    );

    mesh.castShadow =
      true;

    mesh.receiveShadow =
      true;

    return mesh;
  }

  /* =======================================================
     CROWN
  ======================================================== */

  createCrown(
    group,
    width,
    height,
    depth,
    architecture
  ) {
    const crownHeight =
      Math.max(
        2,
        height *
          architecture.setback
      );

    if (
      architecture.type ===
      "tower"
    ) {
      const crown =
        new THREE.Mesh(
          this.geometries.unitBox,
          this.materials.accent
        );

      crown.scale.set(
        width * 0.72,
        crownHeight,
        depth * 0.72
      );

      crown.position.y =
        height +
        crownHeight / 2;

      crown.castShadow =
        true;

      group.add(
        crown
      );

      return;
    }

    if (
      architecture.type ===
      "glass"
    ) {
      const crown =
        new THREE.Mesh(
          this.geometries.unitBox,
          this.materials.glass
        );

      crown.scale.set(
        width * 0.7,
        crownHeight * 1.3,
        depth * 0.7
      );

      crown.position.y =
        height +
        crownHeight * 0.65;

      group.add(
        crown
      );

      return;
    }

    /*
      Flat architectural roof.
    */

    const roof =
      new THREE.Mesh(
        this.geometries.unitBox,
        this.materials.roof
      );

    roof.scale.set(
      width * 0.92,
      1.4,
      depth * 0.92
    );

    roof.position.y =
      height + 0.7;

    roof.castShadow =
      true;

    group.add(
      roof
    );
  }

  /* =======================================================
     FACADE BANDS
  ======================================================== */

  createFacadeBands(
    group,
    width,
    height,
    depth,
    architecture
  ) {
    const count =
      architecture.bands;

    for (
      let i = 0;
      i < count;
      i++
    ) {
      const ratio =
        (i + 1) /
        (count + 1);

      const y =
        height * ratio;

      const bandHeight =
        Math.max(
          0.5,
          height * 0.008
        );

      const band =
        new THREE.Mesh(
          this.geometries.unitBox,
          this.materials.accent
        );

      band.scale.set(
        width * 1.015,
        bandHeight,
        depth * 1.015
      );

      band.position.y =
        y;

      group.add(
        band
      );
    }
  }

  /* =======================================================
     WINDOWS
  ======================================================== */

  createWindows(
    group,
    width,
    height,
    depth,
    architecture
  ) {
    const floors =
      Math.max(
        2,
        Math.floor(
          height / 5
        )
      );

    const horizontal =
      Math.max(
        2,
        Math.floor(
          width / 4
        )
      );

    /*
      Cap the number of windows.

      The city should look dense,
      but never overwhelm the GPU.
    */

    const maxFloors =
      Math.min(
        floors,
        38
      );

    const maxHorizontal =
      Math.min(
        horizontal,
        12
      );

    const windowWidth =
      Math.max(
        0.65,
        width /
          (
            maxHorizontal *
            2.4
          )
      );

    const windowHeight =
      Math.max(
        0.8,
        height /
          (
            maxFloors *
            3.2
          )
      );

    const material =
      this.materials.window;

    for (
      let floor = 0;
      floor < maxFloors;
      floor++
    ) {
      const y =
        windowHeight * 2 +
        floor *
          (
            windowHeight *
            2.6
          );

      if (
        y >
        height * 0.9
      ) {
        break;
      }

      for (
        let column = 0;
        column <
        maxHorizontal;
        column++
      ) {
        if (
          this.random.next() >
          architecture.windowDensity
        ) {
          continue;
        }

        const x =
          -width / 2 +
          windowWidth * 1.6 +
          column *
            (
              width /
              maxHorizontal
            );

        this.addWindow(
          group,
          x,
          y,
          depth / 2 +
            0.02,
          windowWidth,
          windowHeight,
          material
        );

        /*
          Back façade.
        */

        if (
          this.random.next() >
          0.35
        ) {
          this.addWindow(
            group,
            x,
            y,
            -depth / 2 -
              0.02,
            windowWidth,
            windowHeight,
            material
          );
        }
      }
    }
  }

  addWindow(
    group,
    x,
    y,
    z,
    width,
    height,
    material
  ) {
    const window =
      new THREE.Mesh(
        this.geometries.unitBox,
        material
      );

    window.scale.set(
      width,
      height,
      0.08
    );

    window.position.set(
      x,
      y,
      z
    );

    group.add(
      window
    );
  }

  /* =======================================================
     ROOFTOP
  ======================================================== */

  createRooftop(
    group,
    width,
    height,
    depth,
    architecture
  ) {
    const equipmentCount =
      this.random.integer(
        1,
        3
      );

    for (
      let i = 0;
      i < equipmentCount;
      i++
    ) {
      const equipment =
        new THREE.Mesh(
          this.geometries.unitBox,
          this.materials.dark
        );

      const size =
        this.random.range(
          1.5,
          4
        );

      equipment.scale.set(
        size,
        size *
          this.random.range(
            0.4,
            1.2
          ),
        size
      );

      equipment.position.set(
        this.random.range(
          -width * 0.3,
          width * 0.3
        ),
        height +
          size,
        this.random.range(
          -depth * 0.3,
          depth * 0.3
        )
      );

      equipment.castShadow =
        true;

      group.add(
        equipment
      );
    }
  }

  /* =======================================================
     DISTRICT SCALE
  ======================================================== */

  applyDistrictScale(
    building,
    district
  ) {
    if (
      district ===
      "downtown"
    ) {
      building.scale.multiplyScalar(
        this.random.range(
          0.95,
          1.15
        )
      );
    }

    if (
      district ===
      "historic"
    ) {
      building.scale.multiplyScalar(
        this.random.range(
          0.85,
          1.05
        )
      );
    }

    if (
      district ===
      "growth"
    ) {
      building.scale.multiplyScalar(
        this.random.range(
          1.0,
          1.18
        )
      );
    }
  }

  /* =======================================================
     CITY CLUSTER
  ======================================================== */

  createDistrict({
    name = "district",
    x = 0,
    z = 0,
    width = 600,
    depth = 600,
    rows = 7,
    columns = 7,
    district = "standard",
  } = {}) {
    const districtGroup =
      new THREE.Group();

    districtGroup.name =
      name;

    const blockWidth =
      width /
      columns;

    const blockDepth =
      depth /
      rows;

    for (
      let row = 0;
      row < rows;
      row++
    ) {
      for (
        let column = 0;
        column < columns;
        column++
      ) {
        const block =
          this.createBlock({
            centerX:
              x -
              width / 2 +
              blockWidth *
                (column + 0.5),

            centerZ:
              z -
              depth / 2 +
              blockDepth *
                (row + 0.5),

            width:
              blockWidth *
              0.9,

            depth:
              blockDepth *
              0.9,

            rows:
              this.state.detail >
              0.65
                ? 3
                : 2,

            columns:
              this.state.detail >
              0.65
                ? 3
                : 2,

            district,
          });

        districtGroup.add(
          block
        );
      }
    }

    this.group.add(
      districtGroup
    );

    return districtGroup;
  }

  /* =======================================================
     QUALITY
  ======================================================== */

  setQuality(
    state
  ) {
    if (!state) {
      return;
    }

    this.state.quality =
      state.quality ??
      1;

    this.state.detail =
      state.buildingDetail ??
      this.performance
        ?.getBuildingDetail?.() ??
      1;
  }

  /* =======================================================
     UPDATE
  ======================================================== */

  update(
    delta,
    elapsed
  ) {
    /*
      Architecture itself remains mostly
      static for performance.

      Dynamic city life belongs in City.js.
    */

    if (
      !this.group
    ) {
      return;
    }

    /*
      Almost imperceptible city breathing.
    */

    const drift =
      Math.sin(
        elapsed * 0.08
      ) *
      0.00008;

    this.group.rotation.y +=
      drift * delta;
  }

  /* =======================================================
     GETTERS
  ======================================================== */

  getGroup() {
    return this.group;
  }

  getBuildingCount() {
    return this.buildingCount;
  }

  /* =======================================================
     CLEANUP
  ======================================================== */

  destroy() {
    this.group.traverse(
      (object) => {
        if (
          object.geometry
        ) {
          /*
            Shared geometries are disposed
            only once below.
          */
        }
      }
    );

    Object.values(
      this.materials
    ).forEach(
      (material) => {
        material.dispose();
      }
    );

    Object.values(
      this.geometries
    ).forEach(
      (geometry) => {
        geometry.dispose();
      }
    );

    this.scene.remove(
      this.group
    );

    this.materials = {};
    this.geometries = {};
  }
}

/* =========================================================
   EXPORT
   ========================================================= */

export {
  Buildings,
  SeededRandom,
};

export default Buildings;
