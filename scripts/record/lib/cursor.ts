/**
 * Injected into every recorded page: a fake cursor that follows synthetic
 * mouse events (Playwright moves never render a real cursor) plus a click
 * ripple, hidden scrollbars, and hidden Next.js dev-tools portal.
 */
export const CURSOR_INIT_SCRIPT = `
(() => {
  if (window.__recCursorInstalled) return;
  window.__recCursorInstalled = true;

  const install = () => {
    const style = document.createElement("style");
    style.textContent = \`
      *::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; }
      nextjs-portal { display: none !important; }
      #__rec_cursor {
        position: fixed; top: 0; left: 0; width: 22px; height: 22px;
        z-index: 2147483647; pointer-events: none;
        transform: translate(-4px, -3px);
        filter: drop-shadow(0 1px 2px rgba(0,0,0,.45));
        transition: none;
      }
      .__rec_ripple {
        position: fixed; width: 34px; height: 34px; border-radius: 50%;
        border: 2.5px solid #8FE3C8; z-index: 2147483646; pointer-events: none;
        transform: translate(-50%, -50%) scale(.4); opacity: .9;
        animation: __rec_ripple_anim .45s ease-out forwards;
      }
      @keyframes __rec_ripple_anim {
        to { transform: translate(-50%, -50%) scale(1.25); opacity: 0; }
      }
    \`;
    document.head.appendChild(style);

    const cur = document.createElement("div");
    cur.id = "__rec_cursor";
    cur.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none">' +
      '<path d="M5.5 3.2 19 11.4l-6.2 1.3-2.9 5.7L5.5 3.2Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    cur.style.display = "none";
    document.documentElement.appendChild(cur);

    let x = 0, y = 0;
    document.addEventListener("mousemove", (e) => {
      x = e.clientX; y = e.clientY;
      cur.style.display = "block";
      cur.style.transform = "translate(" + (x - 4) + "px, " + (y - 3) + "px)";
    }, true);

    document.addEventListener("mousedown", (e) => {
      const r = document.createElement("div");
      r.className = "__rec_ripple";
      r.style.left = e.clientX + "px";
      r.style.top = e.clientY + "px";
      document.documentElement.appendChild(r);
      setTimeout(() => r.remove(), 500);
    }, true);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();
`;
