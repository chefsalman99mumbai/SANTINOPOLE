import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";

class SantinopoleEngine {
  constructor(options = {}) {
    this.canvas =
      options.canvas ||
      document.querySelector("#scene-canvas");

    if (!this.canvas) {
      throw new Error(
        "SANTINOPOLE: #scene-canvas was not found."
      );
    }

    this.events = new THREE.EventDispatcher();

    this.state = {
      running: false,
      visible: !document.hidden,
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: 1,
      frame: 0,
      fps: 60,
      delta: 0,
      elapsed: 0,
      quality: "high"
    };

    this.timer = new THREE.Timer();

    this.maxDelta = 1 / 30;

    this.scene = new THREE.Scene();

    this.scene.background =
      new THREE.Color(0x05070a);

    this.scene.fog =
      new THREE.FogExp2(
        0x070a0e,
        0.00068
      );

    this.camera =
      new THREE.PerspectiveCamera(
        48,
        this.state.width /
          this.state.height,
        0.1,
        5000
      );

    this.camera.position.set(
      0,
      180,
      420
    );

    this.camera.lookAt(
      0,
      80,
      0
    );

    this.renderer =
      this.createRenderer();

    this.setupLighting();
    this.setupAtmosphere();

    this.handleResize =
      this.handleResize.bind(this);

    this.handleVisibility =
      this.handleVisibility.bind(this);

    this.render =
      this.render.bind(this);

    window.addEventListener(
      "resize",
      this.handleResize,
      {
        passive: true
      }
    );

    document.addEventListener(
      "visibilitychange",
      this.handleVisibility
    );

    this.resize();

    this.state.running = true;

    requestAnimationFrame(
      this.render
    );

    this.events.dispatchEvent({
      type: "ready",
      engine: this
    });
  }

  createRenderer() {
    const renderer =
      new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false,
        powerPreference:
          "high-performance",
        stencil: false,
        depth: true
      });

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure =
      1.08;

    renderer.shadowMap.enabled = true;

    renderer.shadowMap.type =
      THREE.PCFShadowMap;

    renderer.setPixelRatio(
      this.getPixelRatio()
    );

    return renderer;
  }

  getPixelRatio() {
    const ratio =
      window.devicePixelRatio || 1;

    const width =
      window.innerWidth;

    if (width < 768) {
      return Math.min(ratio, 1.35);
    }

    if (width < 1200) {
      return Math.min(ratio, 1.6);
    }

    return Math.min(ratio, 2);
  }

  setupLighting() {
    this.hemiLight =
      new THREE.HemisphereLight(
        0xc3d3dc,
        0x080a0e,
        1.35
      );

    this.hemiLight.name =
      "SANTINOPOLE_HEMISPHERE";

    this.scene.add(
      this.hemiLight
    );

    this.sunLight =
      new THREE.DirectionalLight(
        0xe0e8ec,
        2.7
      );

    this.sunLight.name =
      "SANTINOPOLE_SUN";

    this.sunLight.position.set(
      -420,
      760,
      280
    );

    this.sunLight.castShadow = true;

    this.sunLight.shadow.mapSize.set(
      2048,
      2048
    );

    this.sunLight.shadow.camera.near =
      10;

    this.sunLight.shadow.camera.far =
      1800;

    this.sunLight.shadow.camera.left =
      -750;

    this.sunLight.shadow.camera.right =
      750;

    this.sunLight.shadow.camera.top =
      750;

    this.sunLight.shadow.camera.bottom =
      -750;

    this.sunLight.shadow.bias =
      -0.00015;

    this.sunLight.shadow.normalBias =
      0.025;

    this.scene.add(
      this.sunLight
    );

    this.fillLight =
      new THREE.DirectionalLight(
        0x718b9c,
        0.4
      );

    this.fillLight.position.set(
      500,
      280,
      -500
    );

    this.scene.add(
      this.fillLight
    );
  }

  setupAtmosphere() {
    const geometry =
      new THREE.SphereGeometry(
        1800,
        32,
        16
      );

    const material =
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,

        uniforms: {
          topColor: {
            value:
              new THREE.Color(
                0x17232e
              )
          },

          horizonColor: {
            value:
              new THREE.Color(
                0x35434d
              )
          },

          bottomColor: {
            value:
              new THREE.Color(
                0x05070a
              )
          },

          offset: {
            value: 0.05
          },

          exponent: {
            value: 0.72
          }
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
              viewMatrix *
              worldPosition;
          }
        `,

        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 horizonColor;
          uniform vec3 bottomColor;

          uniform float offset;
          uniform float exponent;

          varying vec3 vWorldPosition;

          void main() {
            float h =
              normalize(
                vWorldPosition
              ).y;

            float upper =
              smoothstep(
                offset,
                1.0,
                max(h, 0.0)
              );

            float lower =
              smoothstep(
                -0.35,
                offset,
                h
              );

            vec3 upperColor =
              mix(
                horizonColor,
                topColor,
                pow(
                  upper,
                  exponent
                )
              );

            vec3 finalColor =
              mix(
                bottomColor,
                upperColor,
                lower
              );

            gl_FragColor =
              vec4(
                finalColor,
                1.0
              );
          }
        `
      });

    this.atmosphere =
      new THREE.Mesh(
        geometry,
        material
      );

    this.atmosphere.name =
      "SANTINOPOLE_ATMOSPHERE";

    this.atmosphere.frustumCulled =
      false;

    this.scene.add(
      this.atmosphere
    );
  }

  render(timestamp) {
    if (!this.state.running) {
      return;
    }

    requestAnimationFrame(
      this.render
    );

    if (!this.state.visible) {
      return;
    }

    this.timer.update(
      timestamp
    );

    const rawDelta =
      this.timer.getDelta();

    const delta =
      Math.min(
        rawDelta,
        this.maxDelta
      );

    this.state.delta =
      delta;

    this.state.elapsed +=
      delta;

    this.state.frame++;

    this.updateFPS(delta);

    this.events.dispatchEvent({
      type: "update",
      delta,
      elapsed:
        this.state.elapsed,
      frame:
        this.state.frame
    });

    this.renderer.render(
      this.scene,
      this.camera
    );
  }

  updateFPS(delta) {
    if (delta <= 0) return;

    const fps =
      1 / delta;

    this.state.fps +=
      (fps -
        this.state.fps) *
      0.04;
  }

  handleResize() {
    this.resize();
  }

  resize(width, height) {
    const w =
      width ||
      window.innerWidth;

    const h =
      height ||
      window.innerHeight;

    if (w <= 0 || h <= 0) {
      return;
    }

    this.state.width = w;
    this.state.height = h;

    this.state.pixelRatio =
      this.getPixelRatio();

    this.camera.aspect =
      w / h;

    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(
      this.state.pixelRatio
    );

    this.renderer.setSize(
      w,
      h,
      false
    );

    this.events.dispatchEvent({
      type: "resize",
      width: w,
      height: h,
      pixelRatio:
        this.state.pixelRatio
    });
  }

  handleVisibility() {
    this.state.visible =
      !document.hidden;

    if (this.state.visible) {
      this.timer.reset();
    }

    this.events.dispatchEvent({
      type: "visibility",
      visible:
        this.state.visible
    });
  }

  setQuality(tier = "high") {
    const settings = {
      high: {
        pixelRatio:
          Math.min(
            window.devicePixelRatio || 1,
            2
          ),
        shadowMap: 2048,
        shadows: true,
        exposure: 1.08
      },

      medium: {
        pixelRatio:
          Math.min(
            window.devicePixelRatio || 1,
            1.5
          ),
        shadowMap: 1024,
        shadows: true,
        exposure: 1.02
      },

      low: {
        pixelRatio:
          Math.min(
            window.devicePixelRatio || 1,
            1.15
          ),
        shadowMap: 512,
        shadows: false,
        exposure: 0.96
      }
    };

    const config =
      settings[tier] ||
      settings.high;

    this.renderer.setPixelRatio(
      config.pixelRatio
    );

    this.renderer.shadowMap.enabled =
      config.shadows;

    this.sunLight.castShadow =
      config.shadows;

    this.sunLight.shadow.mapSize.set(
      config.shadowMap,
      config.shadowMap
    );

    this.renderer.toneMappingExposure =
      config.exposure;

    this.state.pixelRatio =
      config.pixelRatio;

    this.state.quality =
      tier;

    this.resize();
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
    return this.timer;
  }

  getState() {
    return {
      ...this.state
    };
  }

  add(object) {
    if (object) {
      this.scene.add(object);
    }

    return object;
  }

  remove(object) {
    if (object) {
      this.scene.remove(object);
    }
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

  destroy() {
    if (!this.state.running) {
      return;
    }

    this.state.running = false;

    window.removeEventListener(
      "resize",
      this.handleResize
    );

    document.removeEventListener(
      "visibilitychange",
      this.handleVisibility
    );

    this.scene.traverse(
      (object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }

        if (object.material) {
          const materials =
            Array.isArray(
              object.material
            )
              ? object.material
              : [object.material];

          materials.forEach(
            (material) => {
              if (material.map) {
                material.map.dispose();
              }

              material.dispose();
            }
          );
        }
      }
    );

    this.renderer.dispose();

    this.renderer.forceContextLoss?.();

    this.events =
      new THREE.EventDispatcher();
  }
}

export {
  THREE,
  SantinopoleEngine
};

export default SantinopoleEngine;
