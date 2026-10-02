import { THREE } from "./three.js";
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.15.0/index.js";
import ScrollTrigger from "https://cdn.jsdelivr.net/npm/gsap@3.15.0/ScrollTrigger.js";

gsap.registerPlugin(ScrollTrigger);

class ScrollExperience {
  constructor(engine, city, performance) {
    this.engine = engine;
    this.city = city;
    this.performance = performance;

    this.camera = engine.getCamera();
    this.scene = engine.getScene();

    this.story = document.querySelector("#story");

    this.progress = 0;
    this.activeSection = "arrival";
    this.quality = performance?.getTier?.() || "high";

    this.baseCamera = {
      position: new THREE.Vector3(0, 180, 420),
      target: new THREE.Vector3(0, 80, 0)
    };

    this.cameraState = {
      position: new THREE.Vector3(),
      target: new THREE.Vector3(),
      lookAt: new THREE.Vector3()
    };

    this.cameraState.position.copy(
      this.baseCamera.position
    );

    this.cameraState.target.copy(
      this.baseCamera.target
    );

    this.lookTarget = new THREE.Object3D();
    this.scene.add(this.lookTarget);

    this.scrollTimeline = null;
    this.sectionTriggers = [];

    this.drift = {
      x: 0,
      y: 0,
      z: 0,
      rotation: 0
    };

    this.pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0
    };

    this.setup();
  }

  /* ------------------------------------------------------------------------
     SETUP
  ------------------------------------------------------------------------ */

  setup() {
    this.collectSections();
    this.setupPointer();
    this.createTimeline();
    this.createSectionTriggers();
    this.bindNavigation();

    this.handleUpdate = this.handleUpdate.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.engine.on("update", this.handleUpdate);
    this.engine.on("resize", this.handleResize);

    this.handleQuality = ({ detail }) => {
      if (detail?.tier) {
        this.setQuality(detail.tier);
      }
    };

    window.addEventListener(
      "santinopole:quality",
      this.handleQuality
    );

    this.snapInitialCamera();
  }

  collectSections() {
    if (!this.story) return;

    this.sections = Array.from(
      this.story.querySelectorAll(".story-section")
    );

    if (!this.sections.length) {
      this.sections = Array.from(
        this.story.children
      );
    }
  }

  setupPointer() {
    this.pointerMove = (event) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;

      this.pointer.targetX =
        (event.clientX / width - 0.5) * 2;

      this.pointer.targetY =
        (event.clientY / height - 0.5) * 2;
    };

    window.addEventListener(
      "pointermove",
      this.pointerMove,
      { passive: true }
    );
  }

  /* ------------------------------------------------------------------------
     MASTER CAMERA TIMELINE
  ------------------------------------------------------------------------ */

  createTimeline() {
    if (!this.story) return;

    const proxy = {
      progress: 0
    };

    this.timelineProxy = proxy;

    this.scrollTimeline = gsap.timeline({
      paused: true,
      defaults: {
        ease: "none"
      },
      onUpdate: () => {
        this.progress = proxy.progress;
      }
    });

    /*
      The timeline is intentionally continuous.

      We do not teleport between sections.
      Every section overlaps the next, allowing the camera to feel
      like one uninterrupted cinematic shot.
    */

    this.scrollTimeline.to(
      proxy,
      {
        progress: 0.12,
        duration: 1
      },
      0
    );

    this.scrollTimeline.to(
      this.cameraState.position,
      {
        x: 0,
        y: 480,
        z: 680,
        duration: 1
      },
      0
    );

    this.scrollTimeline.to(
      this.cameraState.target,
      {
        x: 0,
        y: 80,
        z: 0,
        duration: 1
      },
      0
    );

    /*
      ARRIVAL → DESCENT
    */

    this.scrollTimeline.to(
      proxy,
      {
        progress: 0.24,
        duration: 1
      },
      1
    );

    this.scrollTimeline.to(
      this.cameraState.position,
      {
        x: -120,
        y: 250,
        z: 440,
        duration: 1
      },
      1
    );

    this.scrollTimeline.to(
      this.cameraState.target,
      {
        x: 0,
        y: 105,
        z: -20,
        duration: 1
      },
      1
    );

    /*
      DESCENT → STREETS
    */

    this.scrollTimeline.to(
      proxy,
      {
        progress: 0.37,
        duration: 1
      },
      2
    );

    this.scrollTimeline.to(
      this.cameraState.position,
      {
        x: -48,
        y: 28,
        z: 170,
        duration: 1
      },
      2
    );

    this.scrollTimeline.to(
      this.cameraState.target,
      {
        x: 40,
        y: 18,
        z: -40,
        duration: 1
      },
      2
    );

    /*
      STREETS → WEB
    */

    this.scrollTimeline.to(
      proxy,
      {
        progress: 0.50,
        duration: 1
      },
      3
    );

    this.scrollTimeline.to(
      this.cameraState.position,
      {
        x: -255,
        y: 24,
        z: 80,
        duration: 1
      },
      3
    );

    this.scrollTimeline.to(
      this.cameraState.target,
      {
        x: -330,
        y: 48,
        z: -100,
        duration: 1
      },
      3
    );

    /*
      WEB → SEO
    */

    this.scrollTimeline.to(
      proxy,
      {
        progress: 0.63,
        duration: 1
      },
      4
    );

    this.scrollTimeline.to(
      this.cameraState.position,
      {
        x: -300,
        y: 75,
        z: 210,
        duration: 1
      },
      4
    );

    this.scrollTimeline.to(
      this.cameraState.target,
      {
        x: -300,
        y: 60,
        z: 350,
        duration: 1
      },
      4
    );

    /*
      SEO → GROWTH
    */

    this.scrollTimeline.to(
      proxy,
      {
        progress: 0.76,
        duration: 1
      },
      5
    );

    this.scrollTimeline.to(
      this.cameraState.position,
      {
        x: 280,
        y: 82,
        z: 260,
        duration: 1
      },
      5
    );

    this.scrollTimeline.to(
      this.cameraState.target,
      {
        x: 340,
        y: 78,
        z: 350,
        duration: 1
      },
      5
    );

    /*
      GROWTH → SANTINOPOLITANS
    */

    this.scrollTimeline.to(
      proxy,
      {
        progress: 0.88,
        duration: 1
      },
      6
    );

    this.scrollTimeline.to(
      this.cameraState.position,
      {
        x: 180,
        y: 160,
        z: 420,
        duration: 1
      },
      6
    );

    this.scrollTimeline.to(
      this.cameraState.target,
      {
        x: 0,
        y: 90,
        z: 40,
        duration: 1
      },
      6
    );

    /*
      SANTINOPOLITANS → FINAL REVEAL
    */

    this.scrollTimeline.to(
      proxy,
      {
        progress: 1,
        duration: 1
      },
      7
    );

    this.scrollTimeline.to(
      this.cameraState.position,
      {
        x: 0,
        y: 650,
        z: 850,
        duration: 1
      },
      7
    );

    this.scrollTimeline.to(
      this.cameraState.target,
      {
        x: 0,
        y: 60,
        z: 0,
        duration: 1
      },
      7
    );

    this.scrollTrigger = ScrollTrigger.create({
      trigger: this.story,
      start: "top top",
      end: "bottom bottom",
      scrub: this.quality === "low" ? 0.55 : 0.9,
      onUpdate: (self) => {
        this.setProgress(self.progress);
      }
    });
  }

  /* ------------------------------------------------------------------------
     SECTION STATES
  ------------------------------------------------------------------------ */

  createSectionTriggers() {
    if (!this.sections?.length) return;

    this.sectionTriggers.forEach((trigger) => {
      trigger.kill();
    });

    this.sectionTriggers = [];

    this.sections.forEach((section) => {
      const id =
        section.dataset.section ||
        section.id ||
        section.getAttribute("data-id");

      if (!id) return;

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: "top center",
        end: "bottom center",

        onEnter: () => {
          this.activateSection(id);
        },

        onEnterBack: () => {
          this.activateSection(id);
        }
      });

      this.sectionTriggers.push(trigger);
    });
  }

  activateSection(id) {
    if (this.activeSection === id) return;

    const previous = this.activeSection;

    this.activeSection = id;

    document.documentElement.dataset.section = id;

    this.events?.dispatchEvent({
      type: "section",
      id,
      previous
    });

    this.animateDistrictFocus(id);
  }

  animateDistrictFocus(id) {
    const districtMap = {
      arrival: null,
      descent: "downtown",
      streets: "commercial",
      web: "web",
      seo: "seo",
      growth: "growth",
      santinopolitans: null,
      reveal: null
    };

    const targetDistrict =
      districtMap[id];

    this.city.getDistricts?.().forEach(
      (district) => {
        const isTarget =
          !targetDistrict ||
          district.id === targetDistrict;

        gsap.to(district.group.scale, {
          x: isTarget ? 1 : 0.985,
          y: isTarget ? 1 : 0.985,
          z: isTarget ? 1 : 0.985,
          duration: 1.2,
          ease: "power2.out"
        });
      }
    );
  }

  /* ------------------------------------------------------------------------
     PROGRESS
  ------------------------------------------------------------------------ */

  setProgress(progress) {
    const value = THREE.MathUtils.clamp(
      progress,
      0,
      1
    );

    this.progress = value;

    if (this.timelineProxy) {
      this.timelineProxy.progress = value;
      this.scrollTimeline?.progress(value);
    }
  }

  getProgress() {
    return this.progress;
  }

  /* ------------------------------------------------------------------------
     NAVIGATION
  ------------------------------------------------------------------------ */

  bindNavigation() {
    this.handleNavigation = (event) => {
      const id =
        event.detail?.section ||
        event.detail?.target;

      if (!id) return;

      this.goTo(id);
    };

    window.addEventListener(
      "santinopole:navigate",
      this.handleNavigation
    );
  }

  goTo(sectionId) {
    const section = document.getElementById(
      sectionId
    );

    if (!section) return;

    const trigger =
      ScrollTrigger.getAll().find(
        (item) =>
          item.trigger === section
      );

    if (trigger) {
      const y =
        trigger.start +
        window.scrollY;

      gsap.to(window, {
        scrollTo: y,
        duration: 1.6,
        ease: "power3.inOut"
      });

      return;
    }

    const rect =
      section.getBoundingClientRect();

    gsap.to(window, {
      scrollTo:
        window.scrollY +
        rect.top,
      duration: 1.6,
      ease: "power3.inOut"
    });
  }

  /* ------------------------------------------------------------------------
     CINEMATIC MICRO-MOTION
  ------------------------------------------------------------------------ */

  handleUpdate({ delta, elapsed }) {
    this.pointer.x +=
      (this.pointer.targetX -
        this.pointer.x) *
      Math.min(delta * 4, 1);

    this.pointer.y +=
      (this.pointer.targetY -
        this.pointer.y) *
      Math.min(delta * 4, 1);

    const pointerStrength =
      this.quality === "low"
        ? 0.8
        : 2.2;

    const driftX =
      Math.sin(elapsed * 0.08) *
      0.8;

    const driftY =
      Math.sin(elapsed * 0.11) *
      0.35;

    const driftZ =
      Math.cos(elapsed * 0.07) *
      0.65;

    this.drift.x =
      driftX +
      this.pointer.x * pointerStrength;

    this.drift.y =
      driftY -
      this.pointer.y * pointerStrength * 0.55;

    this.drift.z =
      driftZ;

    const desiredX =
      this.cameraState.position.x +
      this.drift.x;

    const desiredY =
      this.cameraState.position.y +
      this.drift.y;

    const desiredZ =
      this.cameraState.position.z +
      this.drift.z;

    this.camera.position.x +=
      (desiredX -
        this.camera.position.x) *
      Math.min(delta * 5, 1);

    this.camera.position.y +=
      (desiredY -
        this.camera.position.y) *
      Math.min(delta * 5, 1);

    this.camera.position.z +=
      (desiredZ -
        this.camera.position.z) *
      Math.min(delta * 5, 1);

    this.lookTarget.position.lerp(
      this.cameraState.target,
      Math.min(delta * 4.5, 1)
    );

    this.camera.lookAt(
      this.lookTarget.position
    );

    /*
      Subtle cinematic lens breathing.
      Small enough to feel photographic,
      never enough to become distracting.
    */

    const baseFov = 48;

    const cinematicFov =
      baseFov +
      Math.sin(elapsed * 0.16) * 0.35;

    this.camera.fov +=
      (cinematicFov -
        this.camera.fov) *
      Math.min(delta * 2, 1);

    this.camera.updateProjectionMatrix();
  }

  /* ------------------------------------------------------------------------
     INITIAL STATE
  ------------------------------------------------------------------------ */

  snapInitialCamera() {
    this.camera.position.copy(
      this.baseCamera.position
    );

    this.cameraState.position.copy(
      this.baseCamera.position
    );

    this.cameraState.target.copy(
      this.baseCamera.target
    );

    this.camera.lookAt(
      this.baseCamera.target
    );
  }

  /* ------------------------------------------------------------------------
     QUALITY
  ------------------------------------------------------------------------ */

  setQuality(tier = "high") {
    this.quality = tier;

    if (this.scrollTrigger) {
      this.scrollTrigger.vars.scrub =
        tier === "low"
          ? 0.55
          : tier === "medium"
            ? 0.75
            : 0.9;

      this.scrollTrigger.refresh();
    }
  }

  /* ------------------------------------------------------------------------
     RESIZE
  ------------------------------------------------------------------------ */

  handleResize({ width, height }) {
    this.resize(width, height);
  }

  resize(width, height) {
    if (!width || !height) return;

    this.camera.aspect =
      width / height;

    this.camera.updateProjectionMatrix();

    ScrollTrigger.refresh();
  }

  /* ------------------------------------------------------------------------
     EVENTS
  ------------------------------------------------------------------------ */

  on(type, callback) {
    if (!this.events) {
      this.events =
        new THREE.EventDispatcher();
    }

    this.events.addEventListener(
      type,
      callback
    );
  }

  off(type, callback) {
    if (!this.events) return;

    this.events.removeEventListener(
      type,
      callback
    );
  }

  /* ------------------------------------------------------------------------
     DESTROY
  ------------------------------------------------------------------------ */

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
      "pointermove",
      this.pointerMove
    );

    window.removeEventListener(
      "santinopole:navigate",
      this.handleNavigation
    );

    if (this.handleQuality) {
      window.removeEventListener(
        "santinopole:quality",
        this.handleQuality
      );
    }

    if (this.scrollTrigger) {
      this.scrollTrigger.kill();
    }

    this.sectionTriggers.forEach(
      (trigger) => trigger.kill()
    );

    this.sectionTriggers.length = 0;

    this.scrollTimeline?.kill();

    ScrollTrigger.getAll().forEach(
      (trigger) => trigger.kill()
    );

    gsap.killTweensOf(
      this.cameraState.position
    );

    gsap.killTweensOf(
      this.cameraState.target
    );

    gsap.killTweensOf(window);

    this.scene.remove(
      this.lookTarget
    );
  }
}

export { ScrollExperience };
export default ScrollExperience;
