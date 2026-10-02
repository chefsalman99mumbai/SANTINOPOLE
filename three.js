/* =========================================================
   SANTINOPOLE DIGITAL
   THREE.JS — CORE 3D ENGINE
   ========================================================= */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";

/* =========================================================
   ENGINE
   ========================================================= */

class SantinopoleEngine {
  constructor() {
    this.canvas = document.querySelector("#scene-canvas");

    if (!this.canvas) {
      throw new Error(
        "[SANTINOPOLE] #scene-canvas was not found."
      );
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    this.viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    };

    this.state = {
      ready: false,
      destroyed: false,
      elapsed: 0,
      delta: 0,
    };

    this.events = new THREE.EventDispatcher();

    this.init();
  }

  /* =======================================================
     INITIALIZATION
  ======================================================== */

  init() {
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.configureRenderer();
    this.createLighting();
    this.createAtmosphere();
    this.bindEvents();

    this.state.ready = true;

    this.events.dispatchEvent({
      type: "ready",
      engine: this,
    });

    this.render();
  }

  /* =======================================================
     SCENE
  ======================================================== */

  createScene() {
    this.scene = new THREE.Scene();

    this.scene.background = new THREE.Color(0x050505);

    this.scene.fog = new THREE.FogExp2(
      0x050505,
      0.0022
    );
  }

  /* =======================================================
     CAMERA
  ======================================================== */

  createCamera() {
    const aspect =
      this.viewport.width /
      this.viewport.height;

    this.camera = new THREE.PerspectiveCamera(
      45,
      aspect,
      0.1,
      5000
    );

    /*
      Initial cinematic position.

      This is deliberately high and distant.
      ScrollExperience will eventually take
      complete control of this camera.
    */

    this.camera.position.set(
      0,
      180,
      420
    );

    this.camera.lookAt(
      0,
      0,
      0
    );
  }

  /* =======================================================
     RENDERER
  ======================================================== */

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,

      antialias: true,

      alpha: false,

      powerPreference: "high-performance",

      logarithmicDepthBuffer: false,

      stencil: false,

      depth: true,
    });
  }

  configureRenderer() {
    const {
      width,
      height,
      pixelRatio,
    } = this.viewport;

    this.renderer.setPixelRatio(
      pixelRatio
    );

    this.renderer.setSize(
      width,
      height,
      false
    );

    this.renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    this.renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    this.renderer.toneMappingExposure =
      1.15;

    this.renderer.shadowMap.enabled = true;

    this.renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;
  }

  /* =======================================================
     LIGHTING
  ======================================================== */

  createLighting() {
    /*
      The first lighting system is intentionally
      restrained.

      We will later move toward:
      - district-specific lighting
      - emissive architecture
      - street lighting
      - window illumination
      - animated advertisements
      - atmospheric light shafts
    */

    const ambient = new THREE.HemisphereLight(
      0xd9e1ea,
      0x101010,
      1.15
    );

    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(
      0xffffff,
      2.8
    );

    key.position.set(
      -180,
      320,
      140
    );

    key.castShadow = true;

    key.shadow.mapSize.set(
      2048,
      2048
    );

    key.shadow.camera.near = 10;
    key.shadow.camera.far = 1000;

    key.shadow.camera.left = -450;
    key.shadow.camera.right = 450;
    key.shadow.camera.top = 450;
    key.shadow.camera.bottom = -450;

    key.shadow.bias = -0.00015;

    this.scene.add(key);

    this.keyLight = key;
  }

  /* =======================================================
     ATMOSPHERE
  ======================================================== */

  createAtmosphere() {
    /*
      Very large atmospheric plane.

      This isn't the final sky system.
      It establishes depth until our procedural
      atmosphere arrives.
    */

    const geometry =
      new THREE.SphereGeometry(
        2400,
        32,
        16
      );

    const material =
      new THREE.MeshBasicMaterial({
        color: 0x07090d,
        side: THREE.BackSide,
      });

    this.atmosphere =
      new THREE.Mesh(
        geometry,
        material
      );

    this.scene.add(
      this.atmosphere
    );
  }

  /* =======================================================
     RESIZE
  ======================================================== */

  resize() {
    if (
      !this.renderer ||
      !this.camera
    ) {
      return;
    }

    this.viewport.width =
      window.innerWidth;

    this.viewport.height =
      window.innerHeight;

    this.viewport.pixelRatio =
      Math.min(
        window.devicePixelRatio || 1,
        2
      );

    this.camera.aspect =
      this.viewport.width /
      this.viewport.height;

    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(
      this.viewport.pixelRatio
    );

    this.renderer.setSize(
      this.viewport.width,
      this.viewport.height,
      false
    );

    this.events.dispatchEvent({
      type: "resize",
      viewport: this.viewport,
    });
  }

  /* =======================================================
     EVENTS
  ======================================================== */

  bindEvents() {
    this.handleResize =
      this.resize.bind(this);

    window.addEventListener(
      "resize",
      this.handleResize,
      {
        passive: true,
      }
    );
  }

  /* =======================================================
     UPDATE
  ======================================================== */

  update() {
    if (
      !this.state.ready ||
      this.state.destroyed
    ) {
      return;
    }

    this.state.delta =
      this.clock.getDelta();

    this.state.elapsed +=
      this.state.delta;

    /*
      Subtle atmospheric movement.

      This gives the scene life even before
      buildings, traffic and citizens arrive.
    */

    if (this.atmosphere) {
      this.atmosphere.rotation.y +=
        this.state.delta * 0.002;
    }

    this.events.dispatchEvent({
      type: "update",
      delta: this.state.delta,
      elapsed: this.state.elapsed,
    });
  }

  /* =======================================================
     RENDER LOOP
  ======================================================== */

  render() {
    if (
      this.state.destroyed
    ) {
      return;
    }

    requestAnimationFrame(
      () => this.render()
    );

    this.update();

    this.renderer.render(
      this.scene,
      this.camera
    );
  }

  /* =======================================================
     PUBLIC API
  ======================================================== */

  add(object) {
    if (!object) {
      return;
    }

    this.scene.add(object);
  }

  remove(object) {
    if (!object) {
      return;
    }

    this.scene.remove(object);
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  getRenderer() {
    return this.renderer;
  }

  getClock() {
    return this.clock;
  }

  getState() {
    return this.state;
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

  /* =======================================================
     CLEANUP
  ======================================================== */

  destroy() {
    this.state.destroyed = true;

    window.removeEventListener(
      "resize",
      this.handleResize
    );

    if (this.renderer) {
      this.renderer.dispose();
    }

    this.scene?.traverse(
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

    this.events.dispatchEvent({
      type: "destroy",
    });
  }
}

/* =========================================================
   EXPORT
   ========================================================= */

export {
  THREE,
  SantinopoleEngine,
};

export default SantinopoleEngine;
