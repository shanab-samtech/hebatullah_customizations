(function () {
  const REPORT_NAME = "Profit and Loss Statement";      // exact report name
  const FROZEN_COLS = 2;                      // how many left columns to freeze

  // inject base CSS once
  function ensureBaseCSS() {
    if (document.getElementById("sticky-col-style")) return;
    const css = `
      .dt-sticky { position: sticky; background:#fff; z-index: 2; }
      .dt-header .dt-sticky { z-index: 4; box-shadow: 2px 0 2px -1px rgba(0,0,0,0.08); }
    `;
    const s = document.createElement("style");
    s.id = "sticky-col-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  function isPnLRoute() {
    const r = frappe.get_route();
    return r && r[0] === "query-report" && decodeURIComponent(r[1] || "") === REPORT_NAME;
  }

  function applySticky() {
    if (!isPnLRoute()) return;

    const table = document.querySelector(".datatable");
    if (!table) return;

    // clear previous
    table.querySelectorAll(".dt-sticky").forEach((el) => {
      el.style.left = "";
      el.classList.remove("dt-sticky");
    });

    // helper to mark all cells (header + body) for a given 1-based column index
    const markCol = (idx, leftPx) => {
      const headerCells = table.querySelectorAll(`.dt-header .dt-row .dt-cell:nth-child(${idx})`);
      const bodyCells   = table.querySelectorAll(`.dt-scrollable .dt-row .dt-cell:nth-child(${idx})`);
      [...headerCells, ...bodyCells].forEach((cell) => {
        cell.classList.add("dt-sticky");
        cell.style.left = leftPx + "px";
      });
    };

    // measure cumulative widths from header cells (handles resizes and user drag)
    let offset = 0;
    for (let i = 1; i <= FROZEN_COLS; i++) {
      markCol(i, offset);
      const hdr = table.querySelector(`.dt-header .dt-row .dt-cell:nth-child(${i})`);
      const w = hdr ? Math.ceil(hdr.getBoundingClientRect().width) : 200;
      offset += w;
    }
  }

  function boot() {
    ensureBaseCSS();

    // Run when we land on the report (after it renders)
    const runIfPnL = () => {
      if (!isPnLRoute()) return;
      // Datatable renders async; wait a tick
      setTimeout(applySticky, 50);
      // Observe re-renders (paging/sorting/filters)
      const wrap = document.querySelector(".report-wrapper") || document.body;
      if (!wrap._stickyObserver) {
        const mo = new MutationObserver(() => applySticky());
        mo.observe(wrap, { childList: true, subtree: true });
        wrap._stickyObserver = mo;
      }
      // Re-apply on window resize
      if (!window._stickyResizeBound) {
        window.addEventListener("resize", frappe.utils.throttle(applySticky, 200));
        window._stickyResizeBound = true;
      }
    };

    // on first load
    frappe.after_ajax(runIfPnL);
    // on route changes
    frappe.router.on("change", runIfPnL);
  }

  // wait for frappe to be ready
  if (window.frappe) {
    if (frappe.ready) frappe.ready(boot);
    else document.addEventListener("DOMContentLoaded", boot);
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
