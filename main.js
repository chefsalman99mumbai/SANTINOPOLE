import { SantinopoleEngine } from "./three.js";
import performance from "./performance.js";
import City from "./city.js";
import ScrollExperience from "./scrollexperience.js";
import Interface from "./interface.js";

class SantinopoleApp {
  constructor() {
    this.engine = null;
    this.city = null;
    this.scroll = null;
    this.interface = null;

    this.ready = false;
    this.booted = false;
    this.destroyed = false;

    this.progress = 0;

    this.boot();
  }

  /* ------------------------------------------------------------------------
     BOOT
  ------------------------------------------------------------------------ */

  async boot() {
    if (this.booted || this.destroyed) {
      return;
    }

    this.booted = true;

    try {
      this.setLoader(
        0.04,
        "INITIALIZING SANTINOPOLE"
      );

      await this.waitFrame();

      if (!this.supportsWebGL()) {
        this.showFallback(
          "WebGL is unavailable on this device."
        );

        return;
      }

      this.setLoader(
        0.12,
        "CALIBRATING CITY ENGINE"
      );

      this.engine =
        new SantinopoleEngine({
          canvas:
            document.querySelector(
              "#scene-canvas"
            )
        });

      this.connectEngineEvents();

      this.setLoader(
        0.28,
        "BUILDING THE METROPOLIS"
      );

      await this.waitFrame();

      this.city =
        new City(
          this.engine,
          performance
        );

      this.setLoader(
        0.52,
        "ACTIVATING SANTINOPOLITANS"
      );

      await this.waitFrame();

      this.scroll =
        new ScrollExperience(
          this.engine,
          this.city,
          performance
        );

      this.setLoader(
        0.72,
        "CALIBRATING CITY NAVIGATION"
      );

      await this.waitFrame();

      this.interface =
        new Interface(
          this.engine,
          this.city,
          this.scroll,
          performance
        );

      this.setLoader(
        0.88,
        "CONNECTING THE CITY"
      );

      this.connectSystems();

      await this.waitFrame();

      this.setLoader(
        1,
        "WELCOME TO SANTINOPOLE"
      );

      this.reveal();

      this.ready = true;

      window.dispatchEvent(
        new CustomEvent(
          "santinopole:ready",
          {
            detail: {
              app: this
            }
          }
        )
      );
    } catch (error) {
      console.error(
        "[SANTINOPOLE]",
        error
      );

      this.handleBootFailure(error);
    }
  }

  /* ------------------------------------------------------------------------
     ENGINE EVENTS
  ------------------------------------------------------------------------ */

  connectEngineEvents() {
    if (!this.engine) return;

    this.engine.on(
      "ready",
      () => {
        this.eventsReady = true;
      }
    );

    this.engine.on(
      "resize",
      ({ width, height }) => {
        this.city?.resize(
          width,
          height
        );

        this.scroll?.resize(
          width,
          height
        );

        this.interface?.resize(
          width,
          height
        );
      }
    );
  }

  /* ------------------------------------------------------------------------
     SYSTEM CONNECTION
  ------------------------------------------------------------------------ */

  connectSystems() {
    this.qualityHandler =
      ({ detail }) => {
        if (!detail?.tier) return;

        this.engine?.setQuality(
          detail.tier
        );

        this.city?.setQuality(
          detail.tier
        );

        this.scroll?.setQuality(
          detail.tier
        );

        this.interface?.setQuality(
          detail.tier
        );
      };

    window.addEventListener(
      "santinopole:quality",
      this.qualityHandler
    );

    /*
      Apply the current quality state
      immediately rather than waiting for
      the performance monitor to change tier.
    */

    const tier =
      performance.getTier?.() ||
      "high";

    this.engine?.setQuality(tier);
    this.city?.setQuality(tier);
    this.scroll?.setQuality(tier);
    this.interface?.setQuality(tier);
  }

  /* ------------------------------------------------------------------------
     LOADER
  ------------------------------------------------------------------------ */

  setLoader(progress, status) {
    this.progress =
      Math.max(
        0,
        Math.min(
          1,
          progress
        )
      );

    const loader =
      document.querySelector(
        ".loader"
      );

    const progressElement =
      document.querySelector(
        ".loader-progress"
      );

    const statusElement =
      document.querySelector(
        ".loader-status"
      );

    if (loader) {
      loader.style.setProperty(
        "--loader-progress",
        this.progress
      );
    }

    if (progressElement) {
      progressElement.style.transform =
        `scaleX(${this.progress})`;
    }

    if (statusElement && status) {
      statusElement.textContent =
        status;
    }
  }

  reveal() {
    const loader =
      document.querySelector(
        ".loader"
      );

    if (!loader) {
      this.interface?.showInterface?.();
      return;
    }

    if (
      this.interface?.hideLoader
    ) {
      this.interface.hideLoader();
      return;
    }

    loader.classList.add(
      "is-hidden"
    );

    loader.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  /* ------------------------------------------------------------------------
     WEBGL
  ------------------------------------------------------------------------ */

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
            powerPreference:
              "high-performance"
          }
        ) ||
        canvas.getContext(
          "webgl",
          {
            powerPreference:
              "high-performance"
          }
        );

      return Boolean(context);
    } catch {
      return false;
    }
  }

  /* ------------------------------------------------------------------------
     FALLBACK
  ------------------------------------------------------------------------ */

  showFallback(message) {
    const fallback =
      document.querySelector(
        ".webgl-fallback"
      );

    const loader =
      document.querySelector(
        ".loader"
      );

    if (loader) {
      loader.classList.add(
        "is-hidden"
      );
    }

    if (!fallback) {
      return;
    }

    fallback.hidden = false;
    fallback.classList.add(
      "is-visible"
    );

    const messageElement =
      fallback.querySelector(
        "[data-fallback-message]"
      );

    if (
      messageElement &&
      message
    ) {
      messageElement.textContent =
        message;
    }
  }

  handleBootFailure(error) {
    this.ready = false;

    this.setLoader(
      1,
      "CITY INITIALIZATION FAILED"
    );

    this.showFallback(
      "The SANTINOPOLE experience could not be initialized."
    );

    window.dispatchEvent(
      new CustomEvent(
        "santinopole:error",
        {
          detail: {
            error
          }
        }
      )
    );
  }

  /* ------------------------------------------------------------------------
     UTILITIES
  ------------------------------------------------------------------------ */

  waitFrame() {
    return new Promise(
      (resolve) => {
        requestAnimationFrame(
          () => resolve()
        );
      }
    );
  }

  getState() {
    return {
      ready: this.ready,
      booted: this.booted,
      destroyed: this.destroyed,
      progress: this.progress,
      quality:
        performance.getTier?.() ||
        "unknown"
    };
  }

  /* ------------------------------------------------------------------------
     DESTROY
  ------------------------------------------------------------------------ */

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.ready = false;

    if (this.qualityHandler) {
      window.removeEventListener(
        "santinopole:quality",
        this.qualityHandler
      );
    }

    this.interface?.destroy();
    this.scroll?.destroy();
    this.city?.destroy();
    this.engine?.destroy();

    this.interface = null;
    this.scroll = null;
    this.city = null;
    this.engine = null;
  }
}

/* --------------------------------------------------------------------------
   GLOBAL APPLICATION
--------------------------------------------------------------------------- */

let app = null;

function bootApplication() {
  if (app) return;

  app =
    new SantinopoleApp();

  window.SANTINOPOLE = {
    app,
    performance,

    navigate(section) {
      app?.scroll?.goTo(
        section
      );
    },

    getState() {
      return (
        app?.getState?.() || {
          ready: false
        }
      );
    },

    destroy() {
      app?.destroy();

      app = null;

      delete window.SANTINOPOLE;
    }
  };
}

/* --------------------------------------------------------------------------
   DOCUMENT READY
--------------------------------------------------------------------------- */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    bootApplication,
    {
      once: true
    }
  );
} else {
  bootApplication();
}

/* --------------------------------------------------------------------------
   PAGE LIFECYCLE
--------------------------------------------------------------------------- */

window.addEventListener(
  "pagehide",
  () => {
    app?.destroy();
  },
  {
    once: true
  }
);

window.addEventListener(
  "pageshow",
  () => {
    if (
      !app &&
      !document.hidden
    ) {
      bootApplication();
    }
  }
);

export {
  SantinopoleApp
};

export default app;
