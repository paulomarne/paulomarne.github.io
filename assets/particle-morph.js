/**
 * Original morphing particle cloud for Paulo Marne's portfolio.
 * Canvas 2D square dots. Not derived from any third-party site bundle.
 */
(function () {
  "use strict";

  const canvas = document.getElementById("hero-morph");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.matchMedia("(max-width: 760px)").matches;

  const HOLD = 3.2;
  const EASE = 1.7;
  const CYCLE = HOLD + EASE;

  const STOPS = [
    [86, 212, 221],
    [88, 166, 255],
    [179, 146, 240],
  ];
  const PALETTE = Array.from({ length: 16 }, (_, i) => {
    const t = i / 15;
    const s = t < 0.5 ? 0 : 1;
    const u = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
    const a = STOPS[s];
    const b = STOPS[s + 1];
    const r = Math.round(a[0] + (b[0] - a[0]) * u);
    const g = Math.round(a[1] + (b[1] - a[1]) * u);
    const bl = Math.round(a[2] + (b[2] - a[2]) * u);
    return `rgb(${r},${g},${bl})`;
  });

  let COUNT = 0;
  let curX, curY, curZ, tgtX, tgtY, tgtZ, fromX, fromY, fromZ, phase;
  let scrX, scrY, depth, bucket, hist, offsets, order;

  const SHAPES = ["sphere", "pm", "cloud", "bars", "network", "db", "wave"];
  let shapeIndex = 0;
  let morphT = 0;
  let morphing = false;

  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let yaw = 0.42;
  let pitch = 0.36;
  let targetYawOff = 0;
  let targetPitchOff = 0;
  let yawOff = 0;
  let pitchOff = 0;
  let pointerIn = 0;
  let ptrX = -9999;
  let ptrY = -9999;
  let raf = 0;
  let visible = true;
  let last = performance.now();
  let elapsed = 0;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function alloc(n) {
    COUNT = n;
    curX = new Float32Array(n);
    curY = new Float32Array(n);
    curZ = new Float32Array(n);
    tgtX = new Float32Array(n);
    tgtY = new Float32Array(n);
    tgtZ = new Float32Array(n);
    fromX = new Float32Array(n);
    fromY = new Float32Array(n);
    fromZ = new Float32Array(n);
    phase = new Float32Array(n);
    scrX = new Float32Array(n);
    scrY = new Float32Array(n);
    depth = new Float32Array(n);
    bucket = new Uint8Array(n);
    hist = new Uint32Array(16);
    offsets = new Uint32Array(16);
    order = new Uint32Array(n);
    for (let i = 0; i < n; i++) phase[i] = Math.random() * Math.PI * 2;
  }

  function fillShape(name, ox, oy, oz) {
    const n = COUNT;
    const rnd = (i, salt) => {
      const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };

    if (name === "sphere") {
      for (let i = 0; i < n; i++) {
        const u = rnd(i, 1);
        const v = rnd(i, 2);
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = 0.92 + 0.08 * rnd(i, 3);
        ox[i] = r * Math.sin(phi) * Math.cos(theta);
        oy[i] = r * Math.cos(phi);
        oz[i] = r * Math.sin(phi) * Math.sin(theta);
      }
      return;
    }

    if (name === "pm") {
      // Sample two block letters P and M on a coarse grid, then jitter.
      const cells = [];
      const put = (cx, cy, on) => {
        if (on) cells.push([cx, cy]);
      };
      // P: x 0..4, y 0..8
      for (let y = 0; y <= 8; y++) {
        for (let x = 0; x <= 4; x++) {
          const left = x === 0;
          const top = y === 0 && x < 4;
          const mid = y === 4 && x < 4;
          const rightTop = x === 4 && y > 0 && y < 4;
          put(x - 6.2, 4 - y, left || top || mid || rightTop);
        }
      }
      // M
      for (let y = 0; y <= 8; y++) {
        for (let x = 0; x <= 6; x++) {
          const left = x === 0;
          const right = x === 6;
          const diagL = x === Math.floor(y * 0.75) && y <= 4;
          const diagR = x === 6 - Math.floor(y * 0.75) && y <= 4;
          put(x + 0.6, 4 - y, left || right || diagL || diagR);
        }
      }
      for (let i = 0; i < n; i++) {
        const c = cells[i % cells.length];
        ox[i] = (c[0] / 7) * 1.55 + (rnd(i, 4) - 0.5) * 0.06;
        oy[i] = (c[1] / 5) * 1.15 + (rnd(i, 5) - 0.5) * 0.06;
        oz[i] = (rnd(i, 6) - 0.5) * 0.28;
      }
      return;
    }

    if (name === "cloud") {
      // Soft cloud: three overlapping ellipsoids + wisps.
      const blobs = [
        [0, 0.05, 0, 1.1, 0.55, 0.7],
        [-0.7, -0.05, 0.1, 0.7, 0.45, 0.55],
        [0.75, -0.02, -0.05, 0.75, 0.48, 0.55],
        [0.05, 0.35, 0.05, 0.55, 0.35, 0.4],
      ];
      for (let i = 0; i < n; i++) {
        const b = blobs[i % blobs.length];
        const u = rnd(i, 7);
        const v = rnd(i, 8);
        const w = rnd(i, 9);
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const rr = Math.pow(w, 0.55);
        ox[i] = b[0] + rr * b[3] * Math.sin(phi) * Math.cos(theta);
        oy[i] = b[1] + rr * b[4] * Math.cos(phi);
        oz[i] = b[2] + rr * b[5] * Math.sin(phi) * Math.sin(theta);
      }
      return;
    }

    if (name === "bars") {
      const bars = 7;
      for (let i = 0; i < n; i++) {
        const bi = i % bars;
        const t = Math.floor(i / bars) / Math.max(1, Math.floor(n / bars) - 1);
        const h = 0.35 + 0.9 * Math.abs(Math.sin(bi * 1.1 + 0.4));
        ox[i] = (bi / (bars - 1) - 0.5) * 2.1 + (rnd(i, 10) - 0.5) * 0.08;
        oy[i] = t * h - h * 0.5;
        oz[i] = (rnd(i, 11) - 0.5) * 0.35;
      }
      return;
    }

    if (name === "network") {
      // Hexagon ring + inner nodes + spokes.
      const nodes = [];
      const R = 1.05;
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k - Math.PI / 6;
        nodes.push([R * Math.cos(a), R * Math.sin(a) * 0.85, 0]);
      }
      nodes.push([0, 0, 0]);
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k;
        nodes.push([0.52 * Math.cos(a), 0.45 * Math.sin(a), 0.15]);
      }
      const edges = [];
      for (let k = 0; k < 6; k++) edges.push([k, (k + 1) % 6]);
      for (let k = 0; k < 6; k++) edges.push([6, k]);
      for (let k = 0; k < 6; k++) edges.push([6, 7 + k]);
      for (let k = 0; k < 6; k++) edges.push([k, 7 + k]);

      let e = 0;
      for (let i = 0; i < n; i++) {
        if (i < nodes.length * 18) {
          const nd = nodes[i % nodes.length];
          ox[i] = nd[0] + (rnd(i, 12) - 0.5) * 0.08;
          oy[i] = nd[1] + (rnd(i, 13) - 0.5) * 0.08;
          oz[i] = nd[2] + (rnd(i, 14) - 0.5) * 0.08;
        } else {
          const ed = edges[e % edges.length];
          e++;
          const a = nodes[ed[0]];
          const b = nodes[ed[1]];
          const t = rnd(i, 15);
          ox[i] = a[0] + (b[0] - a[0]) * t;
          oy[i] = a[1] + (b[1] - a[1]) * t;
          oz[i] = a[2] + (b[2] - a[2]) * t;
        }
      }
      return;
    }

    if (name === "db") {
      // Three stacked cylinders (database icon silhouette).
      const cyls = [
        [0, 0.55, 0.85, 0.22],
        [0, 0.0, 0.85, 0.22],
        [0, -0.55, 0.85, 0.22],
      ];
      for (let i = 0; i < n; i++) {
        const c = cyls[i % 3];
        const u = rnd(i, 16);
        const v = rnd(i, 17);
        const ang = 2 * Math.PI * u;
        const onRim = v > 0.22;
        const rr = onRim ? c[2] : c[2] * Math.sqrt(v / 0.22);
        const yy = onRim ? c[1] + (rnd(i, 18) - 0.5) * c[3] * 1.6 : c[1] + (v > 0.5 ? 1 : -1) * c[3];
        ox[i] = c[0] + rr * Math.cos(ang);
        oy[i] = yy;
        oz[i] = rr * Math.sin(ang) * 0.55;
      }
      return;
    }

    // wave — default wavy grid surface
    const cols = Math.ceil(Math.sqrt(n * 1.35));
    const rows = Math.ceil(n / cols);
    for (let i = 0; i < n; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = (c / (cols - 1) - 0.5) * 2.4;
      const z = (r / Math.max(1, rows - 1) - 0.5) * 2.1;
      const y =
        0.22 * Math.sin(2.1 * x) +
        0.16 * Math.cos(2.3 * z) +
        0.1 * Math.sin(1.4 * x + 1.7 * z) -
        0.06;
      ox[i] = x;
      oy[i] = y;
      oz[i] = z;
    }
  }

  function snapshotFrom() {
    fromX.set(curX);
    fromY.set(curY);
    fromZ.set(curZ);
  }

  function setTarget(name) {
    fillShape(name, tgtX, tgtY, tgtZ);
  }

  function initPoints() {
    const n = isMobile() ? 1200 : 2400;
    alloc(n);
    fillShape(SHAPES[0], curX, curY, curZ);
    fromX.set(curX);
    fromY.set(curY);
    fromZ.set(curZ);
    shapeIndex = 0;
    setTarget(SHAPES[0]);
    morphT = 0;
    elapsed = 0;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const want = isMobile() ? 1200 : 2400;
    if (want !== COUNT) initPoints();
  }

  function advanceMorph(dt) {
    elapsed += dt;
    const local = elapsed % CYCLE;
    if (local < HOLD) {
      morphT = 0;
      morphing = false;
      curX.set(tgtX);
      curY.set(tgtY);
      curZ.set(tgtZ);
    } else {
      if (!morphing) {
        snapshotFrom();
        shapeIndex = (shapeIndex + 1) % SHAPES.length;
        setTarget(SHAPES[shapeIndex]);
        morphing = true;
      }
      const t = easeInOutCubic((local - HOLD) / EASE);
      morphT = t;
      for (let i = 0; i < COUNT; i++) {
        curX[i] = fromX[i] + (tgtX[i] - fromX[i]) * t;
        curY[i] = fromY[i] + (tgtY[i] - fromY[i]) * t;
        curZ[i] = fromZ[i] + (tgtZ[i] - fromZ[i]) * t;
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, cssW, cssH);
    const scale = 0.38 * Math.min(cssW, cssH);
    const cx = cssW / 2;
    const cy = cssH / 2 + cssH * 0.02;

    const y = yaw + yawOff;
    const p = pitch + pitchOff;
    const cosY = Math.cos(y);
    const sinY = Math.sin(y);
    const cosP = Math.cos(p);
    const sinP = Math.sin(p);

    for (let i = 0; i < COUNT; i++) {
      let x = curX[i];
      let yy = curY[i];
      let z = curZ[i];
      // tiny idle drift
      x += 0.01 * Math.sin(0.7 * elapsed + phase[i]);
      yy += 0.01 * Math.cos(0.55 * elapsed + phase[i]);

      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      const y2 = yy * cosP - z1 * sinP;
      const z2 = yy * sinP + z1 * cosP;

      const persp = 3.4 / (3.4 - z2);
      scrX[i] = cx + x1 * scale * persp;
      scrY[i] = cy - y2 * scale * persp;
      depth[i] = z2;
    }

    if (pointerIn > 0.01) {
      const radius = 0.16 * Math.min(cssW, cssH);
      const r2 = radius * radius;
      for (let i = 0; i < COUNT; i++) {
        const dx = scrX[i] - ptrX;
        const dy = scrY[i] - ptrY;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const push = (1 - d / radius) * 20 * pointerIn;
          scrX[i] += (dx / d) * push;
          scrY[i] += (dy / d) * push;
        }
      }
    }

    hist.fill(0);
    const band = 2.15 * scale;
    for (let i = 0; i < COUNT; i++) {
      bucket[i] = Math.max(
        0,
        Math.min(
          15,
          Math.round(
            (((scrY[i] - (cy - band / 2)) / band) * 0.75 +
              ((scrX[i] - (cx - band / 2)) / band) * 0.25) *
              15
          )
        )
      );
      hist[bucket[i]]++;
    }
    let run = 0;
    for (let b = 0; b < 16; b++) {
      offsets[b] = run;
      run += hist[b];
    }
    for (let i = 0; i < COUNT; i++) {
      order[offsets[bucket[i]]++] = i;
    }

    let lastStyle = -1;
    run = 0;
    for (let b = 0; b < 16; b++) {
      const start = run;
      const end = start + hist[b];
      run = end;
      if (bucket[order[start]] !== lastStyle || start === end) {
        /* style set inside loop */
      }
      for (let oi = start; oi < end; oi++) {
        const i = order[oi];
        if (bucket[i] !== lastStyle) {
          ctx.fillStyle = PALETTE[bucket[i]];
          lastStyle = bucket[i];
        }
        const t = Math.max(0, Math.min(1, (depth[i] + 1.3) / 2.6));
        const size = 1.25 + 2.35 * t;
        ctx.globalAlpha = 0.28 + 0.72 * t;
        ctx.fillRect(scrX[i] - size / 2, scrY[i] - size / 2, size, size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    if (!reduceMotion) {
      advanceMorph(dt);
      yaw += 0.16 * dt;
      yawOff += (targetYawOff - yawOff) * 0.07;
      pitchOff += (targetPitchOff - pitchOff) * 0.07;
      pointerIn += ((ptrX > -9000 ? 1 : 0) - pointerIn) * 0.12;
    }
    draw();
    if (visible && !reduceMotion) raf = requestAnimationFrame(frame);
    else raf = 0;
  }

  function start() {
    if (!raf && !reduceMotion) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function onPointer(e) {
    const rect = canvas.getBoundingClientRect();
    targetYawOff = (e.clientX / window.innerWidth - 0.5) * 0.5;
    targetPitchOff = (e.clientY / window.innerHeight - 0.5) * 0.28;
    ptrX = e.clientX - rect.left;
    ptrY = e.clientY - rect.top;
    const inside =
      ptrX > -50 &&
      ptrY > -50 &&
      ptrX < rect.width + 50 &&
      ptrY < rect.height + 50;
    if (!inside) {
      ptrX = -9999;
      ptrY = -9999;
    }
  }

  function onLeave() {
    targetYawOff = 0;
    targetPitchOff = 0;
    ptrX = -9999;
    ptrY = -9999;
  }

  initPoints();
  resize();
  draw();

  const ro = new ResizeObserver(() => {
    resize();
    if (reduceMotion) draw();
  });
  ro.observe(canvas);

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduceMotion) start();
      else if (!visible && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    { rootMargin: "80px" }
  );
  io.observe(canvas);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && visible && !reduceMotion) start();
  });

  if (!reduceMotion) {
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    start();
  }
})();
