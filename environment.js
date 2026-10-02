/* =========================================================
   SANTINOPOLE DIGITAL
   ENVIRONMENT — ATMOSPHERIC WORLD SYSTEM
   ========================================================= */

import { THREE } from "./three.js";

/* =========================================================
   ENVIRONMENT
   ========================================================= */

class Environment {
  constructor(
    engine,
    performanceController
  ) {
    this.engine = engine;
    this.performance =
      performanceController;

    this.scene =
      engine.getScene();

    this.camera =
      engine.getCamera();

    this.state = {
      time: 0,
      intensity: 1,
      quality: 1,
    };

    this.objects = {};

    this.create();
  }

  /* =======================================================
     CREATE
  ======================================================== */

  create() {
    this.createWorld();
    this.createSky();
    this.createHorizon();
    this.createGround();
    this.createSun();
    this.createAmbientLight();
    this.createRimLight();
  }

  /* =======================================================
     WORLD
  ======================================================== */

  createWorld() {
    this.scene.background =
      new THREE.Color(
        0x050609
      );

    this.scene.fog =
      new THREE.FogExp2(
        0x07090d,
        0.002
      );
  }

  /* =======================================================
     SKY
  ======================================================== */

  createSky() {
    const geometry =
      new THREE.SphereGeometry(
        2200,
        48,
        32
      );

    const material =
      new THREE.ShaderMaterial({
        side:
          THREE.BackSide,

        depthWrite: false,

        uniforms: {
          topColor: {
            value:
              new THREE.Color(
                0x05070c
              ),
          },

          horizonColor: {
            value:
              new THREE.Color(
                0x1a2029
              ),
          },

          horizonStrength: {
            value: 0.75,
          },

          time: {
            value: 0,
          },
        },

        vertexShader: `
          varying vec3 vWorldPosition;

          void main() {
            vec4 worldPosition =
              modelMatrix *
              vec4(position, 1.0);

            vWorldPosition =
              worldPosition.xyz;

            gl_Position =
              projectionMatrix *
              modelViewMatrix *
              vec4(position, 1.0);
          }
        `,

        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 horizonColor;
          uniform float horizonStrength;
          uniform float time;

          varying vec3 vWorldPosition;

          void main() {

            vec3 direction =
              normalize(vWorldPosition);

            float height =
              max(
                direction.y,
                0.0
              );

            float horizon =
              pow(
                1.0 - height,
                3.5
              );

            vec3 color =
              mix(
                topColor,
                horizonColor,
                horizon *
                horizonStrength
              );

            /*
              Extremely subtle atmospheric
              movement. No obvious animated sky.
            */

            float drift =
              sin(
                time * 0.025 +
                direction.x * 2.0
              ) *
              0.004;

            color += drift;

            gl_FragColor =
              vec4(
                color,
                1.0
              );
          }
        `,
      });

    this.objects.sky =
      new THREE.Mesh(
        geometry,
        material
      );

    this.scene.add(
      this.objects.sky
    );
  }

  /* =======================================================
     HORIZON
  ======================================================== */

  createHorizon() {
    const geometry =
      new THREE.RingGeometry(
        350,
        1600,
        128
      );

    const material =
      new THREE.MeshBasicMaterial({
        color:
          0x303a46,

        transparent: true,

        opacity: 0.08,

        side:
          THREE.DoubleSide,

        depthWrite: false,

        blending:
          THREE.AdditiveBlending,
      });

    this.objects.horizon =
      new THREE.Mesh(
        geometry,
        material
      );

    this.objects.horizon.rotation.x =
      -Math.PI / 2;

    this.objects.horizon.position.y =
      -2;

    this.scene.add(
      this.objects.horizon
    );
  }

  /* =======================================================
     GROUND
  ======================================================== */

  createGround() {
    const geometry =
      new THREE.PlaneGeometry(
        1800,
        1800,
        1,
        1
      );

    const material =
      new THREE.MeshStandardMaterial({
        color:
          0x080909,

        roughness:
          0.92,

        metalness:
          0.08,
      });

    this.objects.ground =
      new THREE.Mesh(
        geometry,
        material
      );

    this.objects.ground.rotation.x =
      -Math.PI / 2;

    this.objects.ground.position.y =
      -1;

    this.objects.ground.receiveShadow =
      true;

    this.scene.add(
      this.objects.ground
    );
  }

  /* =======================================================
     SUN
  ======================================================== */

  createSun() {
    const geometry =
      new THREE.SphereGeometry(
        24,
        24,
        24
      );

    const material =
      new THREE.MeshBasicMaterial({
        color:
          0xd9d4c8,

        transparent: true,

        opacity: 0.82,
      });

    this.objects.sun =
      new THREE.Mesh(
        geometry,
        material
      );

    this.objects.sun.position.set(
      -700,
      430,
      -900
    );

    this.scene.add(
      this.objects.sun
    );

    /*
      Soft atmospheric glow.
    */

    const glowGeometry =
      new THREE.SphereGeometry(
        70,
        24,
        24
      );

    const glowMaterial =
      new THREE.MeshBasicMaterial({
        color:
          0xc9c3b5,

        transparent: true,

        opacity: 0.035,

        blending:
          THREE.AdditiveBlending,

        depthWrite: false,
      });

    this.objects.sunGlow =
      new THREE.Mesh(
        glowGeometry,
        glowMaterial
      );

    this.objects.sunGlow.position.copy(
      this.objects.sun.position
    );

    this.scene.add(
      this.objects.sunGlow
    );
  }

  /* =======================================================
     AMBIENT LIGHT
  ======================================================== */

  createAmbientLight() {
    this.objects.ambient =
      new THREE.HemisphereLight(
        0xdde6ef,
        0x0a0b0e,
        1.1
      );

    this.scene.add(
      this.objects.ambient
    );
  }

  /* =======================================================
     RIM LIGHT
  ======================================================== */

  createRimLight() {
    this.objects.rim =
      new THREE.DirectionalLight(
        0x8da0b5,
        1.4
      );

    this.objects.rim.position.set(
      260,
      220,
      -360
    );

    this.objects.rim.castShadow =
      true;

    const shadowSize =
      this.performance
        ?.getShadowMapSize?.() ||
      1024;

    this.objects.rim.shadow.mapSize.set(
      shadowSize,
      shadowSize
    );

    this.objects.rim.shadow.camera.near =
      10;

    this.objects.rim.shadow.camera.far =
      900;

    this.objects.rim.shadow.camera.left =
      -400;

    this.objects.rim.shadow.camera.right =
      400;

    this.objects.rim.shadow.camera.top =
      400;

    this.objects.rim.shadow.camera.bottom =
      -400;

    this.objects.rim.shadow.bias =
      -0.0001;

    this.scene.add(
      this.objects.rim
    );
  }

  /* =======================================================
     TIME / ATMOSPHERE
  ======================================================== */

  update(
    delta,
    elapsed
  ) {
    this.state.time =
      elapsed;

    /*
      Sky shader.
    */

    if (
      this.objects.sky
        ?.material
        ?.uniforms
        ?.time
    ) {
      this.objects.sky.material
        .uniforms.time.value =
        elapsed;
    }

    /*
      Very subtle horizon movement.
    */

    if (
      this.objects.horizon
    ) {
      this.objects.horizon.rotation.z +=
        delta * 0.001;
    }

    /*
      Extremely slow celestial drift.
    */

    if (
      this.objects.sun
    ) {
      const radius =
        1100;

      const angle =
        elapsed *
        0.00015;

      this.objects.sun.position.x =
        Math.cos(angle) *
        radius -
        200;

      this.objects.sun.position.z =
        Math.sin(angle) *
        radius -
        500;

      this.objects.sunGlow.position.copy(
        this.objects.sun.position
      );
    }
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

    /*
      Fog becomes slightly stronger
      on lower tiers to naturally hide
      distant geometry.
    */

    if (
      this.scene.fog
    ) {
      this.scene.fog.density =
        0.002 *
        (
          state.tier === "low"
            ? 1.45
            : state.tier === "medium"
              ? 1.15
              : 1
        );
    }

    if (
      this.objects.rim
    ) {
      this.objects.rim.intensity =
        state.tier === "low"
          ? 0.8
          : state.tier === "medium"
            ? 1.1
            : 1.4;
    }
  }

  /* =======================================================
     DISTRICT ATMOSPHERE
  ======================================================== */

  setAtmosphere({
    fogDensity,
    fogColor,
    ambientIntensity,
    rimIntensity,
  } = {}) {
    if (
      this.scene.fog &&
      typeof fogDensity ===
        "number"
    ) {
      this.scene.fog.density =
        fogDensity;
    }

    if (
      this.scene.fog &&
      fogColor !== undefined
    ) {
      this.scene.fog.color.set(
        fogColor
      );
    }

    if (
      this.objects.ambient &&
      typeof ambientIntensity ===
        "number"
    ) {
      this.objects.ambient.intensity =
        ambientIntensity;
    }

    if (
      this.objects.rim &&
      typeof rimIntensity ===
        "number"
    ) {
      this.objects.rim.intensity =
        rimIntensity;
    }
  }

  /* =======================================================
     GETTERS
  ======================================================== */

  getObject(
    name
  ) {
    return this.objects[
      name
    ];
  }

  getScene() {
    return this.scene;
  }

  /* =======================================================
     RESIZE
  ======================================================== */

  resize() {
    /*
      Reserved for future adaptive
      atmosphere systems.
    */
  }

  /* =======================================================
     CLEANUP
  ======================================================== */

  destroy() {
    Object.values(
      this.objects
    ).forEach(
      (object) => {
        if (!object) {
          return;
        }

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

        this.scene.remove(
          object
        );
      }
    );

    this.objects = {};
  }
}

/* =========================================================
   EXPORT
   ========================================================= */

export default Environment;
export {
  Environment,
};
