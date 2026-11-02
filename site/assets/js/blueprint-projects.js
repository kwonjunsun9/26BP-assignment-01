(() => {
  const root = document.getElementById("blueprint-work");
  if (!root?.classList.contains("bp-fan")) return;
  const stage = root.querySelector(".bp-fan-stage");
  const cards = [...root.querySelectorAll(".bp-fan-card")];
  const dialog = document.getElementById("bp-project-dialog");
  const header = document.getElementById("site-header");
  const compact = matchMedia("(max-width: 900px), (max-height: 640px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const motionToggle = document.getElementById("bp-motion");
  let launcher = null;
  let frame = 0;
  let anchorPending = location.hash === "#blueprint-work";
  let anchorTimer = 0;

  function layout() {
    if (compact.matches || !cards.length) {
      root.classList.remove("is-fan");
      return;
    }
    const middle = (cards.length - 1) / 2;
    const spread = Math.min(110, Math.max(0, cards.length - 1) * 14);
    const poses = cards.map((card, index) => {
      const angle =
        cards.length === 1
          ? 0
          : ((index - middle) * spread) / (cards.length - 1);
      const radians = (angle * Math.PI) / 180;
      return {
        card,
        angle,
        radians,
        x: Math.sin(radians) * 600,
        y: (1 - Math.cos(radians)) * 600,
      };
    });
    const points = poses.flatMap((pose) =>
      [-110, 110].flatMap((x) =>
        [-160, 160].map((y) => ({
          x: pose.x + x * Math.cos(pose.radians) - y * Math.sin(pose.radians),
          y: pose.y + x * Math.sin(pose.radians) + y * Math.cos(pose.radians),
        })),
      ),
    );
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));
    const scale = Math.max(
      0.1,
      Math.min(
        1.6,
        (stage.clientWidth - 64) / (maxX - minX),
        (stage.clientHeight - 64) / (maxY - minY),
      ),
    );
    poses.forEach((pose, index) => {
      pose.card.style.setProperty(
        "--card-x",
        `${pose.x - (minX + maxX) / 2}px`,
      );
      pose.card.style.setProperty(
        "--card-y",
        `${pose.y - (minY + maxY) / 2}px`,
      );
      pose.card.style.setProperty("--card-angle", `${pose.angle}deg`);
      pose.card.style.setProperty("--card-z", index + 1);
    });
    root.style.setProperty("--fan-scale", scale);
    root.classList.add("is-fan");
  }

  function scheduleLayout() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(layout);
  }
  function measureHeader() {
    const fixed =
      header && ["fixed", "sticky"].includes(getComputedStyle(header).position);
    root.style.setProperty(
      "--bp-header",
      `${fixed ? Math.ceil(header.getBoundingClientRect().height) : 0}px`,
    );
    scheduleLayout();
  }
  function syncMotion() {
    const off = reduced.matches || !!motionToggle?.checked;
    root.classList.toggle("no-motion", off);
    dialog?.classList.toggle("no-motion", off);
  }

  // Align the section edge to the viewport; the header is reserved inside its padding.
  function settleAnchor() {
    if (!anchorPending) return;
    anchorPending = false;
    const delta = root.getBoundingClientRect().top;
    if (Math.abs(delta) > 1 && Math.abs(delta) < 180) {
      window.scrollTo({
        top: scrollY + delta,
        behavior:
          reduced.matches || motionToggle?.checked ? "instant" : "smooth",
      });
    }
  }
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !link
    )
      return;
    if (
      link.hash === "#blueprint-work" &&
      link.origin === location.origin &&
      link.pathname === location.pathname
    ) {
      anchorPending = true;
      clearTimeout(anchorTimer);
      anchorTimer = setTimeout(settleAnchor, 1500);
    }
  });
  addEventListener(
    "scroll",
    () => {
      if (!anchorPending) return;
      clearTimeout(anchorTimer);
      anchorTimer = setTimeout(settleAnchor, 140);
    },
    { passive: true },
  );
  addEventListener("scrollend", settleAnchor);
  if (anchorPending) anchorTimer = setTimeout(settleAnchor, 800);

  if (typeof dialog?.showModal === "function") {
    cards.forEach((card) => {
      card.setAttribute("aria-haspopup", "dialog");
      card.setAttribute("aria-controls", dialog.id);
      card.addEventListener("click", (event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        launcher = card;
        dialog.querySelector("#bp-dialog-number").textContent =
          `PROJECT ${card.dataset.number}`;
        dialog.querySelector("#bp-dialog-title").textContent =
          card.dataset.title;
        dialog.querySelector("#bp-dialog-category").textContent =
          card.dataset.category || "";
        dialog.querySelector("#bp-dialog-summary").textContent =
          card.dataset.summary ||
          "프로젝트의 자세한 설명은 아래 링크에서 볼 수 있습니다.";
        dialog.querySelector("#bp-dialog-detail").href = card.href;
        cards.forEach((item) =>
          item.classList.toggle("is-selected", item === card),
        );
        dialog.showModal();
        document.documentElement.classList.add("bp-fan-modal-open");
      });
    });
    dialog.addEventListener("close", () => {
      document.documentElement.classList.remove("bp-fan-modal-open");
      cards.forEach((card) => card.classList.remove("is-selected"));
      launcher?.focus({ preventScroll: true });
    });
    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const controls = [
        ...dialog.querySelectorAll("button:not([disabled]), a[href]"),
      ];
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    });
  }
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(scheduleLayout);
    observer.observe(stage);
    if (header) new ResizeObserver(measureHeader).observe(header);
  }
  addEventListener("resize", measureHeader);
  compact.addEventListener("change", scheduleLayout);
  reduced.addEventListener("change", syncMotion);
  motionToggle?.addEventListener("change", syncMotion);
  measureHeader();
  syncMotion();
})();
