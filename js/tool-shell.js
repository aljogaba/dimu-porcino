/* =====================================================
   TOOL SHELL · Header compacto al hacer scroll v2
   Laboratorio de Sistemas Porcícolas
   ===================================================== */

(() => {
  const init = () => {
    const header = document.querySelector(".site-header");
    if (!header) return;

    const root = document.documentElement;
    const compactAt = Number(header.dataset.compactAt || 80);
    const expandAt = Number(header.dataset.expandAt || 28);

    let compact = header.classList.contains("is-compact");
    let ticking = false;

    const getScrollY = () =>
      window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

    const setCompact = (next) => {
      if (next === compact) return;
      compact = next;
      header.classList.toggle("is-compact", compact);
      header.dataset.compact = compact ? "true" : "false";
      root.classList.toggle("tool-shell-header-compact", compact);
    };

    const update = () => {
      const y = getScrollY();
      const nextCompact = compact ? y > expandAt : y > compactAt;
      setCompact(nextCompact);
      ticking = false;
    };

    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    header.dataset.shellReady = "true";
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    window.addEventListener("load", requestUpdate, { passive: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
