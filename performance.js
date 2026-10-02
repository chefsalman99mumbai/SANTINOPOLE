/* =========================================================
   SANTINOPOLE DIGITAL
   PERFORMANCE — ADAPTIVE QUALITY SYSTEM
   ========================================================= */

class SantinopolePerformance {
  constructor() {
    this.state = {
      tier: "high",
      quality: 1,
      fps: 60,
      averageFps: 60,
      frameTime: 16.67,
      isMobile: false,
      isTouch: false,
      reducedMotion: false,
      lowPower: false,
      visible: true,
    };

    this.config = {
      high: {
        pixelRatio: 2,
        shadows: true,
        shadowMapSize: 2048,
        particles: 1,
        buildingDetail: 1,
        fog: 1,
        postProcessing: 1,
      },

      medium: {
        pixelRatio: 1.5,
        shadows: true,
        shadowMapSize: 1024,
        particles: 0.65,
        buildingDetail: 0.8,
        fog: 0.8,
        postProcessing: 0.65,
      },

      low: {
        pixelRatio: 1,
        shadows: false,
        shadowMapSize: 512,
        particles: 0.3,
        buildingDetail: 0.55,
        fog: 0.55,
        postProcessing: 0.35,
      },
    };

    this.samples = [];
    this.maxSamples = 60;

    this.lastFrame = performance.now();
    this.lastQualityCheck = performance.now();

    this.callbacks = new Set();

    this.detectEnvironment();
    this.bindVisibility();
  }

  /* =======================================================
     ENVIRONMENT DETECTION
  ======================================================== */

  detectEnvironment() {
    const userAgent =
      navigator.userAgent ||
      navigator.vendor ||
      window.opera ||
      "";

    this.state.isMobile =
      /android|iphone|ipad|ipod|mobile/i.test(
        userAgent
      ) ||
      window.innerWidth <= 768;

    this.state.isTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0;

    this.state.reducedMotion =
      window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      ).matches === true;

    /*
      Conservative mobile baseline.

      We do not automatically destroy quality on
      powerful phones, but we start with a sane
      budget and allow the system to increase it
      later when appropriate.
    */

    if (this.state.isMobile) {
      this.state.tier = "medium";
    }

    /*
      Save battery / low-power environments.

      This is intentionally conservative because
      browser APIs do not expose reliable GPU
      capability information everywhere.
    */

    this.state.lowPower =
      navigator.hardwareConcurrency !== undefined &&
      navigator.hardwareConcurrency <= 4;

    if (this.state.lowPower) {
      this.state.tier =
        this.state.isMobile
          ? "low"
          : "medium";
    }

    if (this.state.reducedMotion) {
      this.state.tier = "low";
    }

    this.notify();
  }

  /* =======================================================
     QUALITY
  ======================================================== */

  getConfig() {
    return {
      ...this.config[
        this.state.tier
      ],
    };
  }

  getQuality() {
    return this.state.quality;
  }

  getTier() {
    return this.state.tier;
  }

  getState() {
    return {
      ...this.state,
    };
  }

  /* =======================================================
     FRAME MONITORING
  ======================================================== */

  update() {
    const now =
      performance.now();

    const delta =
      now - this.lastFrame;

    this.lastFrame = now;

    if (
      delta <= 0 ||
      delta > 250
    ) {
      return;
    }

    const fps =
      1000 / delta;

    this.state.fps = fps;

    this.samples.push(
      fps
    );

    if (
      this.samples.length >
      this.maxSamples
    ) {
      this.samples.shift();
    }

    if (
      now -
        this.lastQualityCheck >
      2000
    ) {
      this.evaluateQuality();

      this.lastQualityCheck =
        now;
    }
  }

  /* =======================================================
     QUALITY EVALUATION
  ======================================================== */

  evaluateQuality() {
    if (
      this.samples.length < 30
    ) {
      return;
    }

    const total =
      this.samples.reduce(
        (sum, value) =>
          sum + value,
        0
      );

    const average =
      total /
      this.samples.length;

    this.state.averageFps =
      average;

    /*
      Quality transitions are deliberately
      hysteresis-based.

      We don't want the city constantly jumping
      between quality levels during normal
      frame-rate fluctuations.
    */

    if (
      average < 34 &&
      this.state.tier !== "low"
    ) {
      this.lowerQuality();
      return;
    }

    if (
      average < 48 &&
      this.state.tier === "high"
    ) {
      this.setTier("medium");
      return;
    }

    /*
      Only promote quality when performance is
      comfortably above the threshold.
    */

    if (
      average > 58 &&
      this.state.tier === "low" &&
      !this.state.isMobile &&
      !this.state.lowPower &&
      !this.state.reducedMotion
    ) {
      this.setTier("medium");
      return;
    }

    if (
      average > 58 &&
      this.state.tier === "medium" &&
      !this.state.isMobile &&
      !this.state.lowPower &&
      !this.state.reducedMotion
    ) {
      this.setTier("high");
    }
  }

  /* =======================================================
     QUALITY CONTROL
  ======================================================== */

  lowerQuality() {
    if (
      this.state.tier === "high"
    ) {
      this.setTier("medium");
      return;
    }

    if (
      this.state.tier === "medium"
    ) {
      this.setTier("low");
    }
  }

  setTier(tier) {
    if (
      !this.config[tier]
    ) {
      return;
    }

    if (
      this.state.tier === tier
    ) {
      return;
    }

    this.state.tier =
      tier;

    this.state.quality =
      tier === "high"
        ? 1
        : tier === "medium"
          ? 0.7
          : 0.4;

    this.samples.length = 0;

    this.notify();
  }

  /* =======================================================
     RENDER SETTINGS
  ======================================================== */

  getPixelRatio(
    devicePixelRatio =
      window.devicePixelRatio || 1
  ) {
    const config =
      this.getConfig();

    return Math.min(
      devicePixelRatio,
      config.pixelRatio
    );
  }

  getParticleMultiplier() {
    return this.getConfig()
      .particles;
  }

  getBuildingDetail() {
    return this.getConfig()
      .buildingDetail;
  }

  getFogMultiplier() {
    return this.getConfig()
      .fog;
  }

  getPostProcessingQuality() {
    return this.getConfig()
      .postProcessing;
  }

  shouldUseShadows() {
    return this.getConfig()
      .shadows;
  }

  getShadowMapSize() {
    return this.getConfig()
      .shadowMapSize;
  }

  /* =======================================================
     VISIBILITY
  ======================================================== */

  bindVisibility() {
    this.handleVisibility =
      this.handleVisibilityChange.bind(
        this
      );

    document.addEventListener(
      "visibilitychange",
      this.handleVisibility
    );
  }

  handleVisibilityChange() {
    this.state.visible =
      document.visibilityState ===
      "visible";

    this.notify();
  }

  isVisible() {
    return this.state.visible;
  }

  /* =======================================================
     FRAME CONTROL
  ======================================================== */

  shouldRender() {
    return (
      !document.hidden &&
      this.state.visible
    );
  }

  /* =======================================================
     SUBSCRIPTIONS
  ======================================================== */

  subscribe(callback) {
    if (
      typeof callback !==
      "function"
    ) {
      return () => {};
    }

    this.callbacks.add(
      callback
    );

    callback(
      this.getState()
    );

    return () => {
      this.callbacks.delete(
        callback
      );
    };
  }

  notify() {
    const state =
      this.getState();

    this.callbacks.forEach(
      (callback) => {
        callback(state);
      }
    );

    window.dispatchEvent(
      new CustomEvent(
        "santinopole:quality",
        {
          detail: state,
        }
      )
    );
  }

  /* =======================================================
     DEBUG
  ======================================================== */

  getDebugInfo() {
    return {
      tier: this.state.tier,
      quality:
        this.state.quality,
      fps:
        Math.round(
          this.state.fps
        ),
      averageFps:
        Math.round(
          this.state.averageFps
        ),
      mobile:
        this.state.isMobile,
      touch:
        this.state.isTouch,
      reducedMotion:
        this.state.reducedMotion,
      lowPower:
        this.state.lowPower,
    };
  }

  /* =======================================================
     CLEANUP
  ======================================================== */

  destroy() {
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibility
    );

    this.callbacks.clear();
    this.samples.length = 0;
  }
}

/* =========================================================
   SINGLETON
   ========================================================= */

const performanceController =
  new SantinopolePerformance();

export {
  SantinopolePerformance,
};

export default performanceController;
