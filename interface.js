// Navigation, HUD, chapter choreography, loader, pointer and magnetic CTAs.
const SECTIONS = [
  { id: 'arrival', p: 0, label: 'Arrival' }, { id: 'descent', p: 0.08, label: 'Descent' },
  { id: 'streets', p: 0.3, label: 'The Streets' }, { id: 'web', p: 0.4, label: 'Web District' },
  { id: 'seo', p: 0.52, label: 'SEO District' }, { id: 'growth', p: 0.63, label: 'Growth District' },
  { id: 'citizens', p: 0.74, label: 'Santinopolitans' }, { id: 'reveal', p: 0.9, label: 'City Reveal' },
];

export class Interface {
  constructor({ onPointer, reduced = false } = {}) {
    this.reduced = reduced; this.index = -1; this.onPointer = onPointer;
    const $ = (s) => document.querySelector(s);
    this.chapters = [...document.querySelectorAll('.chapter')];
    this.links = [...document.querySelectorAll('[data-go]')];
    this.el = { bar: $('#loader-bar'), label: $('#loader-label'), loader: $('#loader'), district: $('#hud-district'), fill: $('#hud-fill'), pct: $('#hud-pct') };
    this.fill = gsap.quickSetter(this.el.fill, 'scaleX');
    this.links.forEach((a) => a.addEventListener('click', (e) => {
      if (a.dataset.go === undefined || a.getAttribute('href').startsWith('mailto')) return;
      e.preventDefault();
      const max = document.documentElement.scrollHeight - innerHeight;
      scrollTo({ top: parseFloat(a.dataset.go) * max, behavior: reduced ? 'auto' : 'smooth' });
    }));
    this._move = (e) => this.onPointer && this.onPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    addEventListener('pointermove', this._move, { passive: true });
    document.querySelectorAll('[data-magnetic]').forEach((b) => {
      const qx = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' }), qy = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' });
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * 0.25); qy((e.clientY - r.top - r.height / 2) * 0.35); });
      b.addEventListener('pointerleave', () => { qx(0); qy(0); });
    });
  }
  setLoader(pct, label) { this.el.bar.style.transform = `scaleX(${pct})`; if (label) this.el.label.textContent = label; }
  hideLoader() {
    gsap.to(this.el.loader, { opacity: 0, duration: this.reduced ? 0 : 1.2, ease: 'power2.inOut', onComplete: () => { this.el.loader.style.display = 'none'; } });
    this.setProgress(0, true);
  }
  setProgress(p, force) {
    this.fill(p); this.el.pct.textContent = String(Math.round(p * 100)).padStart(3, '0');
    let i = 0; SECTIONS.forEach((s, n) => { if (p >= s.p) i = n; });
    if (i !== this.index || force) this._show(i);
  }
  _show(i) {
    const prev = this.chapters[this.index], next = this.chapters[i], d = this.reduced ? 0 : 1;
    this.index = i; this.el.district.textContent = SECTIONS[i].label;
    if (prev && prev !== next) { prev.setAttribute('aria-hidden', 'true'); gsap.to(prev, { opacity: 0, y: -24, duration: 0.5 * d, ease: 'power2.in', onComplete: () => prev.classList.remove('active') }); }
    next.classList.add('active'); next.removeAttribute('aria-hidden');
    gsap.fromTo(next, { opacity: 0, y: 0 }, { opacity: 1, duration: 0.3 * d });
    gsap.fromTo(next.querySelectorAll('.reveal'), { opacity: 0, y: 36, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1 * d, stagger: 0.14 * d, ease: 'expo.out', delay: 0.35 * d, overwrite: true });
    const mark = SECTIONS[i].p;
    this.links.forEach((a) => a.classList.toggle('on', a.closest('nav') && Math.abs(parseFloat(a.dataset.go) - mark) < 0.08 && a.textContent !== 'About'));
  }
  destroy() { removeEventListener('pointermove', this._move); }
}
