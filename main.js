/* =========================================================
   SANTINOPOLE DIGITAL
   MAIN — APPLICATION ORCHESTRATOR
   ========================================================= */

import SantinopoleEngine from "./three.js";
import performanceController from "./performance.js";

/* =========================================================
   OPTIONAL SYSTEM IMPORTS
   ========================================================= */

import City from "./city.js";
import ScrollExperience from "./scrollexperience.js";
import Interface from "./interface.js";

/* =========================================================
   APPLICATION
   ========================================================= */

class SantinopoleApp {
  constructor() {
    this.engine = null;
    this.city = null;
    this.scroll = null;
    this.interface = null;

    this.ready = false;
    this.destroyed = false;

    this.systems = [];
  }

  /* =======================================================
     BOOT
  ======================================================== */

  async boot() {
    try {
      this.setLoadingState(0);

      /*
        WebGL check before creating the renderer.
      */

      if (!this.supportsWebGL()) {
        this.showWebGLFallback();
        return;
      }

      this.setLoadingState(15);

      /*
        CORE ENGINE
      */

      this.engine =
        new SantinopoleEngine();

      this.setLoadingState(30);

      /*
        CITY
      */

      this.city =
        new City(
          this.engine,
          performanceController
        );

      this.systems.push(
        this.city
      );

      this.setLoadingState(50);

      /*
        CINEMATIC SCROLL SYSTEM
      */

      this.scroll =
        new ScrollExperience(
          this.engine,
          this.city,
          performanceController
        );

      this.systems.push(
        this.scroll
      );

      this.setLoadingState(70);

      /*
        INTERFACE
      */

      this.interface =
        new Interface(
          this.engine,
          this.city,
          this.scroll,
          performanceController
        );

      this.systems.push(
        this.interface
      );

      this.setLoadingState(90);

      /*
        CONNECT SYSTEMS
      */

      this.connectSystems();

      this.setLoadingState(100);

      this.ready = true;

      await this.revealExperience();

      console.log(
        "%cSANTINOPOLE DIGITAL",
        "font-size:18px;font-weight:600;letter-spacing:4px;"
      );

      console.log(
        "%cWEB • SEO • GROWTH",
        "font-size:10px;letter-spacing:3px;opacity:.6;"
      );

    } catch (error) {
      console.error(
        "[SANTINOPOLE] Boot failure:",
        error
      );

      this.showFallbackError(
        error
      );
    }
  }

  /* =======================================================
     SYSTEM CONNECTION
  ======================================================== */

  connectSystems() {
    /*
      Engine resize event.
    */

    this.engine.on(
      "resize",
      () => {
        this.city?.resize?.();
        this.scroll?.resize?.();
        this.interface?.resize?.();
      }
    );

    /*
      Performance changes.
    */

    performanceController.subscribe(
      (state) => {
        this.city?.setQuality?.(
          state
        );

        this.scroll?.setQuality?.(
          state
        );

        this.interface?.setQuality?.(
          state
        );
      }
    );

    /*
      City ready event.
    */

    this.city?.on?.(
      "ready",
      () => {
        document.body.classList.add(
          "city-ready"
        );
      }
    );

    /*
      Global application events.
    */

    window.addEventListener(
      "santinopole:navigate",
      (event) => {
        this.handleNavigation(
          event.detail
        );
      }
    );
  }

  /* =======================================================
     WEBGL DETECTION
  ======================================================== */

  supportsWebGL() {
    try {
      const canvas =
        document.createElement(
          "canvas"
        );

      const context =
        canvas.getContext(
          "webgl2",
          {
            failIfMajorPerformanceCaveat:
              false,
          }
        ) ||
        canvas.getContext(
          "webgl",
          {
            failIfMajorPerformanceCaveat:
              false,
          }
        );

      return Boolean(
        context
      );
    } catch {
      return false;
    }
  }

  /* =======================================================
     LOADING
  ======================================================== */

  setLoadingState(
    progress
  ) {
    const progressBar =
      document.querySelector(
        "#loader-progress"
      );

    if (progressBar) {
      progressBar.style.width =
        `${Math.min(
          100,
          Math.max(
            0,
            progress
          )
        )}%`;
    }

    const status =
      document.querySelector(
        ".loader-status"
      );

    if (!status) {
      return;
    }

    if (progress < 25) {
      status.textContent =
        "INITIALIZING CITY";
    } else if (progress < 50) {
      status.textContent =
        "BUILDING INFRASTRUCTURE";
    } else if (progress < 75) {
      status.textContent =
        "CONNECTING DISTRICTS";
    } else if (progress < 100) {
      status.textContent =
        "CALIBRATING EXPERIENCE";
    } else {
      status.textContent =
        "CITY ONLINE";
    }
  }

  /* =======================================================
     REVEAL
  ======================================================== */

  async revealExperience() {
    const loader =
      document.querySelector(
        "#loader"
      );

    if (!loader) {
      return;
    }

    await new Promise(
      (resolve) => {
        requestAnimationFrame(
          () => {
            requestAnimationFrame(
              resolve
            );
          }
        );
      }
    );

    loader.style.transition =
      "opacity 1200ms cubic-bezier(0.16,1,0.3,1)";

    loader.style.opacity = "0";

    document.body.classList.remove(
      "is-loading"
    );

    setTimeout(
      () => {
        loader.remove();
      },
      1300
    );
  }

  /* =======================================================
     NAVIGATION
  ======================================================== */

  handleNavigation(
    destination
  ) {
    if (
      !destination
    ) {
      return;
    }

    if (
      typeof destination ===
      "string"
    ) {
      this.scroll?.goTo?.(
        destination
      );

      return;
    }

    if (
      destination.section
    ) {
      this.scroll?.goTo?.(
        destination.section
      );
    }
  }

  /* =======================================================
     FALLBACK
  ======================================================== */

  showWebGLFallback() {
    const fallback =
      document.querySelector(
        "#webgl-fallback"
      );

    const loader =
      document.querySelector(
        "#loader"
      );

    if (loader) {
      loader.remove();
    }

    if (fallback) {
      fallback.hidden = false;
    }

    document.body.classList.remove(
      "is-loading"
    );
  }

  showFallbackError(
    error
  ) {
    console.error(
      "[SANTINOPOLE] Fatal:",
      error
    );

    const loader =
      document.querySelector(
        "#loader"
      );

    if (loader) {
      loader.style.opacity =
        "0";
    }

    document.body.classList.remove(
      "is-loading"
    );
  }

  /* =======================================================
     DESTROY
  ======================================================== */

  destroy() {
    if (
      this.destroyed
    ) {
      return;
    }

    this.destroyed =
      true;

    this.systems.forEach(
      (system) => {
        system?.destroy?.();
      }
    );

    this.engine?.destroy?.();

    performanceController.destroy();

    this.engine = null;
    this.city = null;
    this.scroll = null;
    this.interface = null;
    this.systems.length = 0;
  }
}

/* =========================================================
   GLOBAL APP INSTANCE
   ========================================================= */

const app =
  new SantinopoleApp();

/*
  Expose a controlled debug handle.

  This is useful during development without
  polluting the application architecture.
*/

window.SANTINOPOLE = {
  app,
  performance:
    performanceController,
};

/* =========================================================
   START
   ========================================================= */

document.body.classList.add(
  "is-loading"
);

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    () => app.boot(),
    {
      once: true,
    }
  );
} else {
  app.boot();
}

/* =========================================================
   HOT-RELOAD / PAGE CLEANUP
   ========================================================= */

window.addEventListener(
  "pagehide",
  () => {
    app.destroy();
  },
  {
    once: true,
  }
);

export default app;
