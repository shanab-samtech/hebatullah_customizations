(function () {
  const REPORT_NAME = "Profit and Loss Statement"; // exact report name
  const FROZEN_COLS = 2; // how many left columns to freeze

  // inject base CSS once
  function ensureBaseCSS() {
    if (document.getElementById("sticky-col-style")) return;

    const css = `
      /* frozen columns */
      .dt-sticky { position: sticky; background: #fff; z-index: 2; }
      /* frozen column header */
      .dt-header .dt-sticky { z-index: 4; box-shadow: 2px 0 2px -1px rgba(0,0,0,0.08); }

      /* sticky header row */
      .dt-header .dt-row .dt-cell {
        position: sticky;
        top: 0;
        background: #fff;
        z-index: 5;
      }

      /* dropdown fix */
      .dt-dropdown__list {
        z-index: 12316 !important;
      }
    `;
    const s = document.createElement("style");
    s.id = "sticky-col-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  function isPnLRoute() {
    const r = frappe.get_route();
    return (
      r &&
      r[0] === "query-report" &&
      decodeURIComponent(r[1] || "") === REPORT_NAME
    );
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

    // freeze left columns
    let offset = 0;
    for (let i = 1; i <= FROZEN_COLS; i++) {
      const headerCells = table.querySelectorAll(
        `.dt-header .dt-row .dt-cell:nth-child(${i})`
      );
      const bodyCells = table.querySelectorAll(
        `.dt-scrollable .dt-row .dt-cell:nth-child(${i})`
      );
      [...headerCells, ...bodyCells].forEach((cell) => {
        cell.classList.add("dt-sticky");
        cell.style.left = offset + "px";
      });
      const hdr = table.querySelector(
        `.dt-header .dt-row .dt-cell:nth-child(${i})`
      );
      const w = hdr ? Math.ceil(hdr.getBoundingClientRect().width) : 200;
      offset += w;
    }
  }

  function fixDropdown() {
    // dropdown is dynamically created, so check each time
    document.querySelectorAll(".dt-dropdown__list").forEach((dropdown) => {
      dropdown.style.zIndex = "12316";
    });
  }

  function boot() {
    ensureBaseCSS();

    const runIfPnL = () => {
      if (!isPnLRoute()) return;

      // apply sticky columns and header
      setTimeout(applySticky, 50);

      // fix dropdown z-index
      setTimeout(fixDropdown, 50);

      // observe re-renders (paging, sorting, filters)
      const wrap = document.querySelector(".report-wrapper") || document.body;
      if (!wrap._stickyObserver) {
        const mo = new MutationObserver(() => {
          applySticky();
          fixDropdown();
        });
        mo.observe(wrap, { childList: true, subtree: true });
        wrap._stickyObserver = mo;
      }

      // apply on window resize
      if (!window._stickyResizeBound) {
        window.addEventListener(
          "resize",
          frappe.utils.throttle(() => {
            applySticky();
            fixDropdown();
          }, 200)
        );
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
