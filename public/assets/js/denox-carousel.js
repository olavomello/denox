/**
 * DenoX carousel helper — progressive enhancement for [data-carousel].
 *
 * The track works without JavaScript (CSS scroll-snap, swipe/scroll); this
 * script only wires the previous/next buttons and the position counter.
 */
(() => {
  "use strict";

  document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const track = carousel.querySelector("[data-carousel-track]");
    if (!track) return;
    const prev = carousel.querySelector("[data-carousel-prev]");
    const next = carousel.querySelector("[data-carousel-next]");
    const counter = carousel.querySelector("[data-carousel-counter]");
    const total = track.children.length;

    /** Index of the slide currently snapped into view. */
    function index() {
      return Math.round(track.scrollLeft / track.clientWidth);
    }

    /** Scrolls to a slide, clamping to bounds. */
    function go(to) {
      const clamped = Math.max(0, Math.min(total - 1, to));
      track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
    }

    function update() {
      if (counter) counter.textContent = `${index() + 1} / ${total}`;
    }

    if (prev) prev.addEventListener("click", () => go(index() - 1));
    if (next) next.addEventListener("click", () => go(index() + 1));
    track.addEventListener("scroll", update, { passive: true });
    update();
  });
})();
