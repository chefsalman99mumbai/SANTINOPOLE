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

    this.boot();
  }

  async boot() {
    try {
      this.setLoader(0.1, "INITIALIZING SANTINOPOLE");

      const canvas =
        document.querySelector("#scene-canvas");

      if (!canvas) {
        throw new Error(
          "SANTINOPOLE: #scene-canvas not found."
        );
      }

      if (!this.supportsWebGL(canvas)) {
        this.showFallback();
        return;
      }

      this.setLoader(
        0.25,
        "STARTING CITY ENGINE"
      );

      this.engine =
        new SantinopoleEngine({
          canvas
        });

      await this.nextFrame();

      this.setLoader(
        0.45,
        "BUILDING THE METROPOLIS"
      );

      this.city =
        new City(
          this.engine,
          performance
        );

      await this.nextFrame();

      this.setLoader(
        0.7,
        "CALIBRATING CINEMATIC CAMERA"
      );

      this.scroll =
        new ScrollExperience(
          this.engine,
          this.city,
          performance
        );

      await this.nextFrame();

      this.setLoader(
        0.88,
        "CONNECTING CITY NAVIGATION"
      );

      this.interface =
        new Interface(
          this.engine,
          this.city,
          this.scroll,
          performance
        );

      this.connectQuality();

      this.setLoader(
        1,
        "WELCOME TO SANTINOPOLE"
      );

      await this.nextFrame();

      this.hideLoader();

      this.ready = true;

      window.dispatchEvent(
        new CustomEvent(
          "santinopole:ready"
        )
      );

      console.log(
        "%c SANTINOPOLE DIGITAL ",
        "background:#111;color:#fff;padding:8px 14px;font-weight:700;"
      );

      console.log(
        "%c WEB • SEO • GROWTH ",
        "color:#8998a3;font-weight:600;"
      );

    } catch (error) {
      console.error(
        "SANTINOPOLE BOOT ERROR:",
        error
      );

      this.showFallback(
        error.message
      );
    }
  }

  supportsWebGL(canvas) {
    try {
      return Boolean(
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl")
      );
    } catch {
      return false;
    }
  }

  connectQuality() {
    window.addEventListener(
      "santinopole:quality",
      (event) => {
        const tier =
          event.detail?.tier;

        if (!tier) return;

        this.engine?.setQuality(tier);
        this.city?.setQuality(tier);
        this.scroll?.setQuality(tier);
        this.interface?.setQuality(tier);
      }
    );

    const tier =
      performance.getTier?.() ||
      "high";

    this.engine?.setQuality(tier);
    this.city?.setQuality(tier);
    this.scroll?.setQuality(tier);
    this.interface?.setQuality(tier);
  }

  setLoader(progress, message) {
    const loader =
      document.querySelector(".loader");

    const progressBar =
      document.querySelector(
        ".loader-progress"
      );

    const status =
      document.querySelector(
        ".loader-status"
      );

    if (loader) {
      loader.style.setProperty(
        "--loader-progress",
        progress
      );
    }

    if (progressBar) {
      progressBar.style.transform =
        `scaleX(${progress})`;
    }

    if (status && message) {
      status.textContent =
        message;
    }
  }

  hideLoader() {
    const loader =
      document.querySelector(".loader");

    if (!loader) return;

    loader.classList.add(
      "is-hidden"
    );

    loader.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  showFallback(message = "") {
    const loader =
      document.querySelector(".loader");

    const fallback =
      document.querySelector(
        ".webgl-fallback"
      );

    if (loader) {
      loader.classList.add(
        "is-hidden"
      );
    }

    if (!fallback) return;

    fallback.hidden = false;
    fallback.classList.add(
      "is-visible"
    );

    const text =
      fallback.querySelector(
        "[data-fallback-message]"
      );

    if (text && message) {
      text.textContent =
        message;
    }
  }

  nextFrame() {
    return new Promise(
      (resolve) => {
        requestAnimationFrame(
          resolve
        );
      }
    );
  }

  destroy() {
    this.interface?.destroy();
    this.scroll?.destroy();
    this.city?.destroy();
    this.engine?.destroy();

    this.interface = null;
    this.scroll = null;
    this.city = null;
    this.engine = null;

    this.ready = false;
  }
}

let app;

function start() {
  if (app) return;

  app =
    new SantinopoleApp();

  window.SANTINOPOLE = {
    get app() {
      return app;
    },

    navigate(section) {
      app?.scroll?.goTo(
        section
      );
    },

    destroy() {
      app?.destroy();
      app = null;
    }
  };
}

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    start,
    {
      once: true
    }
  );
} else {
  start();
}

export {
  SantinopoleApp
};

export default app;
