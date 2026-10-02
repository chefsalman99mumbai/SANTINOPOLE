import { THREE } from "./three.js";
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.15.0/index.js";

class Interface {
  constructor(engine, city, scroll, performance) {
    this.engine = engine;
    this.city = city;
    this.scroll = scroll;
    this.performance = performance;

    this.events = new THREE.EventDispatcher();

    this.quality =
      performance?.getTier?.() || "high";

    this.isMenuOpen = false;
    this.activeSection = "arrival";

    this.elements = {};

    this.cacheElements();
    this.bindNavigation();
    this.bindMenu();
    this.bindPointerInteractions();
    this.bindScrollState();
    this.bindKeyboard();

    this.handleResize = this.handleResize.bind(this);

    engine.on(
      "resize",
      this.handleResize
    );

    this.handleQuality = ({ detail }) => {
      if (detail?.tier) {
        this.setQuality(detail.tier);
      }
    };

    window.addEventListener(
      "santinopole:quality",
      this.handleQuality
    );

    this.showInterface();
  }

  /* ------------------------------------------------------------------------
     DOM
  ------------------------------------------------------------------------ */

  cacheElements() {
    this.elements = {
      app:
        document.querySelector("#app"),

      header:
        document.querySelector(".site-header"),

      logo:
        document.querySelector(".site-logo"),

      navigation:
        document.querySelector(".site-navigation"),

      navItems:
        Array.from(
          document.querySelectorAll(
            "[data-section]"
          )
        ),

      menuButton:
        document.querySelector(
          "[data-menu-toggle]"
        ),

      menuPanel:
        document.querySelector(
          ".menu-panel"
        ),

      menuLinks:
        Array.from(
          document.querySelectorAll(
            ".menu-panel [data-section]"
          )
        ),

      story:
        document.querySelector("#story"),

      sections:
        Array.from(
          document.querySelectorAll(
            ".story-section"
          )
        ),

      hud:
        document.querySelector(".hud"),

      hudProgress:
        document.querySelector(
          ".hud-progress"
        ),

      hudSection:
        document.querySelector(
          ".hud-section"
        ),

      loader:
        document.querySelector(
          ".loader"
        ),

      loaderProgress:
        document.querySelector(
          ".loader-progress"
        ),

      loaderStatus:
        document.querySelector(
          ".loader-status"
        ),

      fallback:
        document.querySelector(
          ".webgl-fallback"
        )
    };
  }

  /* ------------------------------------------------------------------------
     NAVIGATION
  ------------------------------------------------------------------------ */

  bindNavigation() {
    const items = [
      ...this.elements.navItems,
      ...this.elements.menuLinks
    ];

    items.forEach((item) => {
      item.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          const section =
            item.dataset.section;

          if (!section) return;

          this.navigate(section);

          if (this.isMenuOpen) {
            this.closeMenu();
          }
        }
      );
    });
  }

  navigate(section) {
    this.setActiveSection(section);

    window.dispatchEvent(
      new CustomEvent(
        "santinopole:navigate",
        {
          detail: {
            section
          }
        }
      )
    );

    this.events.dispatchEvent({
      type: "navigate",
      section
    });
  }

  setActiveSection(section) {
    this.activeSection = section;

    document.documentElement.dataset.section =
      section;

    const items = [
      ...this.elements.navItems,
      ...this.elements.menuLinks
    ];

    items.forEach((item) => {
      const active =
        item.dataset.section === section;

      item.classList.toggle(
        "is-active",
        active
      );

      item.setAttribute(
        "aria-current",
        active
          ? "page"
          : "false"
      );
    });

    if (this.elements.hudSection) {
      this.elements.hudSection.textContent =
        this.formatSectionName(
          section
        );
    }
  }

  formatSectionName(section) {
    return section
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  /* ------------------------------------------------------------------------
     MENU
  ------------------------------------------------------------------------ */

  bindMenu() {
    const button =
      this.elements.menuButton;

    if (!button) return;

    button.addEventListener(
      "click",
      () => {
        this.toggleMenu();
      }
    );

    document.addEventListener(
      "click",
      (event) => {
        if (
          !this.isMenuOpen ||
          !this.elements.menuPanel
        ) {
          return;
        }

        const insidePanel =
          this.elements.menuPanel.contains(
            event.target
          );

        const insideButton =
          button.contains(event.target);

        if (
          !insidePanel &&
          !insideButton
        ) {
          this.closeMenu();
        }
      }
    );
  }

  toggleMenu() {
    if (this.isMenuOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    if (!this.elements.menuPanel) return;

    this.isMenuOpen = true;

    document.documentElement.classList.add(
      "menu-open"
    );

    this.elements.menuPanel.classList.add(
      "is-open"
    );

    this.elements.menuPanel.setAttribute(
      "aria-hidden",
      "false"
    );

    if (this.elements.menuButton) {
      this.elements.menuButton.setAttribute(
        "aria-expanded",
        "true"
      );
    }

    gsap.killTweensOf(
      this.elements.menuPanel
    );

    gsap.fromTo(
      this.elements.menuPanel,
      {
        opacity: 0,
        y: -18,
        scale: 0.985
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        ease: "power3.out"
      }
    );

    gsap.fromTo(
      this.elements.menuLinks,
      {
        opacity: 0,
        y: 16
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.55,
        stagger: 0.055,
        delay: 0.08,
        ease: "power3.out"
      }
    );
  }

  closeMenu() {
    if (!this.elements.menuPanel) return;

    this.isMenuOpen = false;

    document.documentElement.classList.remove(
      "menu-open"
    );

    this.elements.menuPanel.classList.remove(
      "is-open"
    );

    this.elements.menuPanel.setAttribute(
      "aria-hidden",
      "true"
    );

    if (this.elements.menuButton) {
      this.elements.menuButton.setAttribute(
        "aria-expanded",
        "false"
      );
    }

    gsap.killTweensOf(
      this.elements.menuPanel
    );

    gsap.to(
      this.elements.menuPanel,
      {
        opacity: 0,
        y: -12,
        duration: 0.35,
        ease: "power2.in"
      }
    );
  }

  /* ------------------------------------------------------------------------
     POINTER MICRO-INTERACTION
  ------------------------------------------------------------------------ */

  bindPointerInteractions() {
    this.interactiveElements = [
      ...document.querySelectorAll(
        "a, button, [data-section]"
      )
    ];

    this.interactiveElements.forEach(
      (element) => {
        element.addEventListener(
          "mouseenter",
          () => {
            this.pointerEnter(element);
          }
        );

        element.addEventListener(
          "mouseleave",
          () => {
            this.pointerLeave(element);
          }
        );
      }
    );
  }

  pointerEnter(element) {
    if (
      this.quality === "low" ||
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      return;
    }

    gsap.killTweensOf(element);

    gsap.to(element, {
      y: -2,
      duration: 0.3,
      ease: "power2.out"
    });
  }

  pointerLeave(element) {
    gsap.killTweensOf(element);

    gsap.to(element, {
      y: 0,
      duration: 0.35,
      ease: "power2.out"
    });
  }

  /* ------------------------------------------------------------------------
     SCROLL STATE
  ------------------------------------------------------------------------ */

  bindScrollState() {
    this.scrollUpdate = () => {
      if (!this.scroll) return;

      const progress =
        this.scroll.getProgress?.() || 0;

      this.updateProgress(progress);
    };

    this.scroll?.on?.(
      "section",
      ({ id }) => {
        this.setActiveSection(id);
        this.animateSectionTransition();
      }
    );

    this.engine.on(
      "update",
      this.scrollUpdate
    );
  }

  updateProgress(progress) {
    const value =
      THREE.MathUtils.clamp(
        progress,
        0,
        1
      );

    if (this.elements.hudProgress) {
      this.elements.hudProgress.style.setProperty(
        "--progress",
        value
      );
    }

    if (this.elements.hud) {
      this.elements.hud.dataset.progress =
        value.toFixed(3);
    }
  }

  animateSectionTransition() {
    const section =
      this.elements.sections.find(
        (element) =>
          element.id ===
          this.activeSection ||
          element.dataset.section ===
          this.activeSection
      );

    if (!section) return;

    const eyebrow =
      section.querySelector(
        ".section-eyebrow"
      );

    const heading =
      section.querySelector(
        "h1, h2, h3"
      );

    const body =
      section.querySelector(
        ".section-copy, p"
      );

    const targets = [
      eyebrow,
      heading,
      body
    ].filter(Boolean);

    if (!targets.length) return;

    gsap.killTweensOf(targets);

    gsap.fromTo(
      targets,
      {
        opacity: 0,
        y: 18,
        filter:
          "blur(5px)"
      },
      {
        opacity: 1,
        y: 0,
        filter:
          "blur(0px)",
        duration: 0.8,
        stagger: 0.055,
        ease: "power3.out"
      }
    );
  }

  /* ------------------------------------------------------------------------
     KEYBOARD
  ------------------------------------------------------------------------ */

  bindKeyboard() {
    this.keydown = (event) => {
      if (event.key === "Escape") {
        if (this.isMenuOpen) {
          this.closeMenu();
        }
      }

      if (
        event.key === "m" ||
        event.key === "M"
      ) {
        this.toggleMenu();
      }
    };

    window.addEventListener(
      "keydown",
      this.keydown
    );
  }

  /* ------------------------------------------------------------------------
     LOADER
  ------------------------------------------------------------------------ */

  setLoaderProgress(progress) {
    const value =
      THREE.MathUtils.clamp(
        progress,
        0,
        1
      );

    if (this.elements.loaderProgress) {
      this.elements.loaderProgress.style.setProperty(
        "--progress",
        value
      );

      this.elements.loaderProgress.style.transform =
        `scaleX(${value})`;
    }
  }

  setLoaderStatus(message) {
    if (
      this.elements.loaderStatus
    ) {
      this.elements.loaderStatus.textContent =
        message;
    }
  }

  hideLoader() {
    const loader =
      this.elements.loader;

    if (!loader) return;

    gsap.timeline({
      onComplete: () => {
        loader.classList.add(
          "is-hidden"
        );

        loader.setAttribute(
          "aria-hidden",
          "true"
        );
      }
    })
      .to(loader, {
        opacity: 0,
        duration: 0.8,
        ease: "power2.inOut"
      })
      .to(
        this.elements.app,
        {
          opacity: 1,
          duration: 1,
          ease: "power2.out"
        },
        "-=0.35"
      );
  }

  /* ------------------------------------------------------------------------
     INTERFACE REVEAL
  ------------------------------------------------------------------------ */

  showInterface() {
    const elements = [
      this.elements.header,
      this.elements.hud
    ].filter(Boolean);

    if (!elements.length) return;

    gsap.set(elements, {
      opacity: 0,
      y: -12
    });

    gsap.to(elements, {
      opacity: 1,
      y: 0,
      duration: 1,
      stagger: 0.12,
      delay: 0.4,
      ease: "power3.out"
    });

    this.setActiveSection(
      this.activeSection
    );
  }

  /* ------------------------------------------------------------------------
     QUALITY
  ------------------------------------------------------------------------ */

  setQuality(tier = "high") {
    this.quality = tier;

    document.documentElement.dataset.quality =
      tier;

    const isLow =
      tier === "low";

    const isMedium =
      tier === "medium";

    if (this.elements.hud) {
      this.elements.hud.classList.toggle(
        "is-minimal",
        isLow
      );
    }

    if (this.elements.navigation) {
      this.elements.navigation.classList.toggle(
        "is-compact",
        isMedium || isLow
      );
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

    const mobile =
      width < 768;

    document.documentElement.classList.toggle(
      "is-mobile",
      mobile
    );
  }

  /* ------------------------------------------------------------------------
     EVENTS
  ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------
     DESTROY
  ------------------------------------------------------------------------ */

  destroy() {
    this.engine.off(
      "resize",
      this.handleResize
    );

    this.engine.off(
      "update",
      this.scrollUpdate
    );

    window.removeEventListener(
      "keydown",
      this.keydown
    );

    window.removeEventListener(
      "santinopole:quality",
      this.handleQuality
    );

    const items = [
      ...this.elements.navItems,
      ...this.elements.menuLinks
    ];

    items.forEach((item) => {
      item.replaceWith(
        item.cloneNode(true)
      );
    });

    this.interactiveElements?.forEach(
      (element) => {
        element.replaceWith(
          element.cloneNode(true)
        );
      }
    );

    gsap.killTweensOf(
      Object.values(this.elements)
    );

    this.closeMenu();
  }
}

export { Interface };
export default Interface;
