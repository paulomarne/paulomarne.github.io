(() => {
  document.documentElement.classList.add("js");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const phrases = [
    "Staff Engineer / Solutions Architect",
    "Arquiteturas end-to-end em AWS, GCP e Azure",
    "Plataformas de IA, RAG e sistemas distribuídos",
    "Mobile nativo, híbrido e governança (TOGAF, C4, ADR)"
  ];
  const typed = document.getElementById("typed");
  if (typed) {
    if (reduce) {
      typed.textContent = phrases[0];
    } else {
      let pi = 0, ci = 0, dir = 1;
      const tick = () => {
        const word = phrases[pi];
        ci += dir;
        typed.textContent = word.slice(0, ci);
        if (dir === 1 && ci === word.length) {
          dir = -1;
          setTimeout(tick, 1600);
          return;
        }
        if (dir === -1 && ci === 0) {
          dir = 1;
          pi = (pi + 1) % phrases.length;
        }
        setTimeout(tick, dir === 1 ? 42 : 24);
      };
      tick();
    }
  }

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
    ["aws-ml-readiness.png", "Pin do curso AWS ML Readiness"],
    ["aws-cloud-practitioner-essentials.png", "Pin do curso AWS Cloud Practitioner Essentials"],
    ["aws-k8s-serverless.png", "Pin do treinamento Kubernetes AWS"],
    ["azure-az900.png", "Pin Azure AZ-900"],
    ["azure-az305.png", "Pin Azure AZ-305"],
    ["azure-sc200.png", "Pin Azure SC-200"],
    ["aws-pin-1.png", "Pin extra AWS 1"],
    ["aws-pin-2.png", "Pin extra AWS 2"],
    ["aws-pin-3.png", "Pin extra AWS 3"],
    ["aws-pin-4.png", "Pin extra AWS 4"],
    ["azure-pin-1.png", "Pin extra Azure 1"],
    ["azure-pin-2.png", "Pin extra Azure 2"],
    ["azure-pin-3.png", "Pin extra Azure 3"],
    ["azure-pin-4.png", "Pin extra Azure 4"]
  ];
  const pinGrid = document.getElementById("pinGrid");
  const renderWaiting = () => {
    pinNames.slice(0, 6).forEach(([name]) => {
      const slot = document.createElement("div");
      slot.className = "pin-slot glass waiting";
      slot.innerHTML = "<span>Aguardando pin</span><div class=\"fname\">" + name + "</div>";
      pinGrid.appendChild(slot);
    });
  };
  if (pinGrid) {
    fetch("assets/certs/pins.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { files: [] }))
      .then((data) => {
        const listed = new Set((data && data.files) || []);
        const selected = pinNames.filter(([name]) => listed.has(name));
        if (!selected.length) {
          renderWaiting();
          return;
        }
        selected.forEach(([name, label]) => {
          const slot = document.createElement("div");
          slot.className = "pin-slot glass";
          const img = document.createElement("img");
          img.alt = label;
          img.src = "assets/certs/" + name;
          img.addEventListener("error", () => slot.setAttribute("hidden", ""));
          slot.appendChild(img);
          pinGrid.appendChild(slot);
        });
      })
      .catch(renderWaiting);
  }

  const canvas = document.getElementById("particles");
  if (!canvas || reduce) {
    if (canvas) canvas.style.display = "none";
    return;
  }
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, dots = [], raf = 0;
  const resize = () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const n = Math.min(90, Math.floor((w * h) / 18000));
    dots = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35
    }));
  };
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(88,166,255,0.7)";
    dots.forEach((d) => {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0 || d.x > w) d.vx *= -1;
      if (d.y < 0 || d.y > h) d.vy *= -1;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = "rgba(88,166,255,0.12)";
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const a = dots[i], b = dots[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 110) {
          ctx.globalAlpha = 1 - dist / 110;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
    raf = requestAnimationFrame(draw);
  };
  window.addEventListener("resize", resize);
  resize();
  draw();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else draw();
  });
})();
