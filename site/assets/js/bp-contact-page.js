(() => {
  const scene = document.querySelector("[data-contact-scene]");
  const motionClass = "bp-contact-motion";
  if (!scene) {
    document.documentElement.classList.remove(motionClass);
    return;
  }

  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const animations = new Set();
  let completed = false;

  const finish = () => {
    completed = true;
    scene.dataset.state = "complete";
    document.documentElement.classList.remove(motionClass);
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  };

  const animate = (element, keyframes, options) => {
    const animation = element.animate(keyframes, { fill: "both", ...options });
    animations.add(animation);
    return animation.finished;
  };

  // A change to the OS preference also stops an animation already in progress.
  preference.addEventListener("change", (event) => {
    if (event.matches) finish();
  });

  const start = async () => {
    if (completed) return;

    let imageReady = false;
    try {
      const image = new Image();
      image.src = scene.querySelector("image").href.baseVal;
      await image.decode();
      imageReady = true;
      if (completed) return;
      if (preference.matches || !Element.prototype.animate) {
        finish();
        return;
      }

      // The heading and contact links are visible throughout. Only paint moves.
      scene.dataset.state = "dropping";
      const drops = Array.from(scene.querySelectorAll("[data-contact-drop]"));
      const splashes = scene.querySelectorAll("[data-contact-splash]");
      const falling = drops.map((drop, index) => {
        const delay = 350 + Number(drop.dataset.delay);
        const fall = animate(
          drop,
          [
            {
              opacity: 0,
              transform: "translateY(-1120px) scale(0.65, 1.3)",
              offset: 0,
            },
            {
              opacity: 1,
              transform: "translateY(-1100px) scale(0.65, 1.3)",
              offset: 0.08,
            },
            {
              opacity: 1,
              transform: "translateY(0) scale(0.85, 1.15)",
              offset: 0.94,
            },
            {
              opacity: 0,
              transform: "translateY(5px) scale(1.6, 0.3)",
              offset: 1,
            },
          ],
          { duration: 800, delay, easing: "cubic-bezier(0.45, 0, 0.8, 0.55)" },
        );

        const splash = animate(
          splashes[index],
          [
            { opacity: 0, transform: "scale(0.2)" },
            { opacity: 0.9, transform: "scale(1.25)", offset: 0.35 },
            { opacity: 0, transform: "scale(1.8, 0.5)" },
          ],
          { duration: 340, delay: delay + 760, easing: "ease-out" },
        );
        return Promise.all([fall, splash]);
      });

      await Promise.all(falling);
      if (completed) return;

      scene.dataset.state = "painting";
      await animate(
        scene.querySelector(".bp-contact-reveal"),
        [{ strokeDashoffset: "1" }, { strokeDashoffset: "0" }],
        { duration: 2300, easing: "cubic-bezier(0.3, 0.05, 0.25, 1)" },
      );
      finish();
    } catch (error) {
      finish();
      if (!imageReady) {
        // Never enlarge a browser's broken-image icon inside the paint mask.
        scene.dataset.state = "error";
        console.error("CONTACT artwork could not be decoded.", error);
      }
    }
  };

  // Do not consume the one-shot entrance while the tab is in the background.
  if (document.hidden) {
    document.addEventListener("visibilitychange", function onVisible() {
      if (!document.hidden) {
        document.removeEventListener("visibilitychange", onVisible);
        start();
      }
    });
  } else {
    start();
  }
})();
