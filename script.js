(() => {
  document.documentElement.classList.add("js");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const i18n = () => window.SiteI18n;

  let typedTimer = 0;
  const clearTyped = () => {
    if (typedTimer) {
      clearTimeout(typedTimer);
      typedTimer = 0;
    }
  };

  const startTyped = () => {
    const typed = document.getElementById("typed");
    if (!typed || !i18n()) return;
    const phrases = i18n().list("typedPhrases");
    clearTyped();
    if (!phrases.length) return;
    if (reduce) {
      typed.textContent = phrases[0];
      return;
    }
    let pi = 0, ci = 0, dir = 1;
    const tick = () => {
      const word = phrases[pi] || "";
      ci += dir;
      typed.textContent = word.slice(0, Math.max(0, ci));
      if (dir === 1 && ci >= word.length) {
        dir = -1;
        typedTimer = setTimeout(tick, 1600);
        return;
      }
      if (dir === -1 && ci <= 0) {
        dir = 1;
        ci = 0;
        pi = (pi + 1) % phrases.length;
      }
      typedTimer = setTimeout(tick, dir === 1 ? 42 : 24);
    };
    tick();
  };

  const nav = document.getElementById("nav");
  const menuBtn = document.getElementById("menuBtn");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("#menu a").forEach((a) => {
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  const reveals = document.querySelectorAll(".reveal");
  if (reduce) {
    reveals.forEach((el) => el.classList.add("in"));
  } else if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  if (!reduce) {
    document.querySelectorAll(".tilt").forEach((card) => {
      card.addEventListener("mousemove", (ev) => {
        const r = card.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width - 0.5;
        const y = (ev.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  const pinNames = [
    ["aws-ml-readiness.png", "pinAltMl"],
    ["aws-cloud-practitioner-essentials.png", "pinAltCp"],
    ["aws-k8s-serverless.png", "pinAltK8s"],
    ["azure-az900.png", "pinAltAz900"],
    ["azure-az305.png", "pinAltAz305"],
    ["azure-sc200.png", "pinAltSc200"],
    ["aws-pin-1.png", "pinAltAws1"],
    ["aws-pin-2.png", "pinAltAws2"],
    ["aws-pin-3.png", "pinAltAws3"],
    ["aws-pin-4.png", "pinAltAws4"],
    ["azure-pin-1.png", "pinAltAzure1"],
    ["azure-pin-2.png", "pinAltAzure2"],
    ["azure-pin-3.png", "pinAltAzure3"],
    ["azure-pin-4.png", "pinAltAzure4"]
  ];

  let pinMode = "idle";
  let selectedPins = [];
  const pinGrid = document.getElementById("pinGrid");
  const t = (key) => (i18n() ? i18n().t(key) : key);

  const renderWaiting = () => {
    if (!pinGrid) return;
    pinMode = "waiting";
    pinGrid.replaceChildren();
    pinNames.slice(0, 6).forEach(([name]) => {
      const slot = document.createElement("div");
      slot.className = "pin-slot glass waiting";
      const span = document.createElement("span");
      span.setAttribute("data-i18n", "pinWaiting");
      span.textContent = t("pinWaiting");
      const fname = document.createElement("div");
      fname.className = "fname";
      fname.textContent = name;
      slot.append(span, fname);
      pinGrid.appendChild(slot);
    });
  };

  const renderSelected = () => {
    if (!pinGrid) return;
    pinMode = "selected";
    pinGrid.replaceChildren();
    selectedPins.forEach(([name, key]) => {
      const slot = document.createElement("div");
      slot.className = "pin-slot glass";
      const img = document.createElement("img");
      img.alt = t(key);
      img.setAttribute("data-i18n-attr", "alt:" + key);
      img.src = "assets/certs/" + name;
      img.addEventListener("error", () => slot.setAttribute("hidden", ""));
      slot.appendChild(img);
      pinGrid.appendChild(slot);
    });
  };

  const refreshPins = () => {
    if (pinMode === "waiting") renderWaiting();
    else if (pinMode === "selected") renderSelected();
  };

  if (pinGrid) {
    fetch("assets/certs/pins.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { files: [] }))
      .then((data) => {
        const listed = new Set((data && data.files) || []);
        selectedPins = pinNames.filter(([name]) => listed.has(name));
        if (!selectedPins.length) {
          renderWaiting();
          return;
        }
        renderSelected();
      })
      .catch(renderWaiting);
  }

  startTyped();
  window.addEventListener("site:langchange", () => {
    startTyped();
    refreshPins();
  });
})();
