/**
 * Original morphing particle cloud for Paulo Marne's portfolio.
 * Canvas 2D square dots. Not derived from any third-party site bundle.
 */
(function () {
  "use strict";

  const canvas = document.getElementById("hero-morph");
  if (!canvas) return;

  const host = canvas.parentElement || canvas;
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

  const SHAPES = [
    "line",
    "bars",
    "donut",
    "pipeline",
    "cloud",
    "db",
    "network",
    "circuit",
    "code",
    "pm",
    "wave",
  ];
  const FLOW = { pipeline: true, network: true, circuit: true };

  let shapeIndex = 0;
  let morphT = 0;
  let morphing = false;

  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let yaw = 0.16;
  let pitch = 0.18;
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
  let sized = false;
  let resizeQueued = false;

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

  function rnd(i, salt) {
    const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function samplePolyline(points, u) {
    const segs = points.length - 1;
    const x = u * segs;
    const i = Math.min(segs - 1, Math.max(0, Math.floor(x)));
    const t = x - i;
    const a = points[i];
    const b = points[i + 1];
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2] || 0, b[2] || 0, t)];
  }

  function fillShape(name, ox, oy, oz, time) {
    const n = COUNT;
    const tnow = time || 0;

    if (name === "line") {
      const pts = [];
      const steps = 8;
      for (let k = 0; k <= steps; k++) {
        const x = (k / steps - 0.5) * 2.15;
        const rise = (k / steps) * 1.35 - 0.55;
        const wobble = 0.08 * Math.sin(k * 0.9);
        pts.push([x, rise + wobble, 0]);
      }
      for (let i = 0; i < n; i++) {
        const kind = rnd(i, 1);
        if (kind < 0.12) {
          ox[i] = (rnd(i, 2) - 0.5) * 2.2;
          oy[i] = -0.72 + (rnd(i, 3) - 0.5) * 0.04;
          oz[i] = (rnd(i, 4) - 0.5) * 0.06;
        } else if (kind < 0.2) {
          ox[i] = -1.08 + (rnd(i, 5) - 0.5) * 0.04;
          oy[i] = (rnd(i, 6) - 0.5) * 1.55;
          oz[i] = (rnd(i, 7) - 0.5) * 0.06;
        } else if (kind < 0.72) {
          const p = samplePolyline(pts, rnd(i, 8));
          ox[i] = p[0] + (rnd(i, 9) - 0.5) * 0.03;
          oy[i] = p[1] + (rnd(i, 10) - 0.5) * 0.03;
          oz[i] = (rnd(i, 11) - 0.5) * 0.08;
        } else if (kind < 0.88) {
          const ki = Math.floor(rnd(i, 12) * pts.length);
          const p = pts[ki];
          const rad = 0.07 * Math.sqrt(rnd(i, 13));
          const ang = rnd(i, 14) * Math.PI * 2;
          ox[i] = p[0] + rad * Math.cos(ang);
          oy[i] = p[1] + rad * Math.sin(ang);
          oz[i] = (rnd(i, 15) - 0.5) * 0.1;
        } else {
          const u = rnd(i, 16);
          const p = samplePolyline(pts, u);
          const base = samplePolyline(pts, Math.max(0, u - 0.02));
          ox[i] = p[0] + (rnd(i, 17) - 0.5) * 0.05;
          oy[i] = lerp(-0.7, p[1], rnd(i, 18) * 0.85);
          oz[i] = (rnd(i, 19) - 0.5) * 0.12;
          void base;
        }
      }
      return;
    }

    if (name === "bars") {
      const bars = 7;
      for (let i = 0; i < n; i++) {
        const bi = i % bars;
        const t = Math.floor(i / bars) / Math.max(1, Math.floor(n / bars) - 1);
        const h = 0.35 + 0.95 * Math.abs(Math.sin(bi * 1.1 + 0.4));
        ox[i] = (bi / (bars - 1) - 0.5) * 2.05 + (rnd(i, 10) - 0.5) * 0.06;
        oy[i] = t * h - 0.72 + h * 0.02;
        oz[i] = (rnd(i, 11) - 0.5) * 0.28;
      }
      return;
    }

    if (name === "donut") {
      const segments = 4;
      const spans = [0.28, 0.22, 0.3, 0.2];
      let acc = 0;
      const starts = spans.map((s) => {
        const a = acc;
        acc += s;
        return a;
      });
      for (let i = 0; i < n; i++) {
        const si = i % segments;
        const u = starts[si] + rnd(i, 20) * spans[si] * 0.92;
        const ang = u * Math.PI * 2 - Math.PI / 2;
        const rad = 0.72 + rnd(i, 21) * 0.28;
        ox[i] = rad * Math.cos(ang);
        oy[i] = rad * Math.sin(ang) * 0.92;
        oz[i] = (rnd(i, 22) - 0.5) * 0.22;
      }
      return;
    }

    if (name === "pipeline") {
      const boxes = [-1.05, -0.35, 0.35, 1.05];
      const bw = 0.28;
      const bh = 0.2;
      const arrows = [
        [boxes[0] + bw, boxes[1] - bw],
        [boxes[1] + bw, boxes[2] - bw],
        [boxes[2] + bw, boxes[3] - bw],
      ];
      for (let i = 0; i < n; i++) {
        const kind = rnd(i, 23);
        if (kind < 0.55) {
          const bi = Math.floor(rnd(i, 24) * 4);
          ox[i] = boxes[bi] + (rnd(i, 25) - 0.5) * bw * 2;
          oy[i] = (rnd(i, 26) - 0.5) * bh * 2;
          oz[i] = (rnd(i, 27) - 0.5) * 0.16;
        } else {
          const ai = Math.floor(rnd(i, 28) * arrows.length);
          const seg = arrows[ai];
          const u = (rnd(i, 29) + tnow * 0.32) % 1;
          ox[i] = lerp(seg[0], seg[1], u);
          oy[i] = (rnd(i, 30) - 0.5) * 0.06;
          oz[i] = (rnd(i, 31) - 0.5) * 0.08;
          if (rnd(i, 32) > 0.7) {
            const tip = u > 0.72;
            if (tip) {
              oy[i] += (u - 0.72) * (rnd(i, 33) > 0.5 ? 0.12 : -0.12);
            }
          }
        }
      }
      return;
    }

    if (name === "cloud") {
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

    if (name === "db") {
      const cyls = [
        [0, 0.58, 0.82, 0.2],
        [0, 0.02, 0.82, 0.2],
        [0, -0.54, 0.82, 0.2],
      ];
      for (let i = 0; i < n; i++) {
        const c = cyls[i % 3];
        const u = rnd(i, 16);
        const v = rnd(i, 17);
        const ang = 2 * Math.PI * u;
        const onRim = v > 0.18;
        const rr = onRim ? c[2] : c[2] * Math.sqrt(v / 0.18);
        const yy = onRim
          ? c[1] + (rnd(i, 18) - 0.5) * c[3] * 1.7
          : c[1] + (v > 0.5 ? 1 : -1) * c[3];
        ox[i] = c[0] + rr * Math.cos(ang);
        oy[i] = yy;
        oz[i] = rr * Math.sin(ang) * 0.48;
      }
      return;
    }

    if (name === "network") {
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

      for (let i = 0; i < n; i++) {
        if (i < nodes.length * 22) {
          const nd = nodes[i % nodes.length];
          ox[i] = nd[0] + (rnd(i, 12) - 0.5) * 0.09;
          oy[i] = nd[1] + (rnd(i, 13) - 0.5) * 0.09;
          oz[i] = nd[2] + (rnd(i, 14) - 0.5) * 0.09;
        } else {
          const ed = edges[i % edges.length];
          const a = nodes[ed[0]];
          const b = nodes[ed[1]];
          const t = (rnd(i, 15) + tnow * 0.22) % 1;
          ox[i] = a[0] + (b[0] - a[0]) * t;
          oy[i] = a[1] + (b[1] - a[1]) * t;
          oz[i] = a[2] + (b[2] - a[2]) * t;
        }
      }
      return;
    }

    if (name === "circuit") {
      const traces = [];
      for (let k = -2; k <= 2; k++) {
        const y = k * 0.22;
        traces.push([[-1.15, y, 0], [-0.5, y, 0]]);
        traces.push([[1.15, y, 0], [0.5, y, 0]]);
      }
      for (let k = -2; k <= 2; k++) {
        const x = k * 0.18;
        traces.push([[x, 1.05, 0], [x, 0.5, 0]]);
        traces.push([[x, -1.05, 0], [x, -0.5, 0]]);
      }
      for (let i = 0; i < n; i++) {
        const kind = rnd(i, 41);
        if (kind < 0.5) {
          ox[i] = (rnd(i, 42) - 0.5) * 0.88;
          oy[i] = (rnd(i, 43) - 0.5) * 0.88;
          oz[i] = (rnd(i, 44) - 0.5) * 0.1;
        } else if (kind < 0.66) {
          const pin = Math.floor(rnd(i, 45) * 10) - 2;
          const axis = rnd(i, 46) > 0.5;
          const side = rnd(i, 47) > 0.5 ? 1 : -1;
          if (axis) {
            ox[i] = side * 0.52 + (rnd(i, 48) - 0.5) * 0.1;
            oy[i] = pin * 0.18 + (rnd(i, 49) - 0.5) * 0.05;
          } else {
            ox[i] = pin * 0.16 + (rnd(i, 50) - 0.5) * 0.05;
            oy[i] = side * 0.52 + (rnd(i, 51) - 0.5) * 0.1;
          }
          oz[i] = (rnd(i, 52) - 0.5) * 0.06;
        } else {
          const tr = traces[Math.floor(rnd(i, 53) * traces.length)];
          const u = (rnd(i, 54) + tnow * 0.28) % 1;
          const p = samplePolyline(tr, u);
          ox[i] = p[0] + (rnd(i, 55) - 0.5) * 0.025;
          oy[i] = p[1] + (rnd(i, 56) - 0.5) * 0.025;
          oz[i] = 0;
        }
      }
      return;
    }

    if (name === "code") {
      const glyphs = [
        [[0.06, 0.78, 0], [-0.62, 0, 0], [0.06, -0.78, 0]],
        [[0.22, 0.74, 0], [-0.22, -0.74, 0]],
        [[-0.06, 0.78, 0], [0.62, 0, 0], [-0.06, -0.78, 0]],
      ];
      const shift = [-0.7, 0, 0.7];
      for (let i = 0; i < n; i++) {
        const gi = i % 3;
        const p = samplePolyline(glyphs[gi], rnd(i, 54));
        const nx = gi === 1 ? -0.22 : (p[1] > 0 ? 0.35 : -0.35);
        const ny = gi === 1 ? 0.08 : (gi === 0 ? 0.25 : -0.25);
        const mag = Math.hypot(nx, ny) || 1;
        const thick = (rnd(i, 55) - 0.5) * 0.2;
        ox[i] = shift[gi] + p[0] + (nx / mag) * thick;
        oy[i] = p[1] + (ny / mag) * thick * 0.4;
        oz[i] = (rnd(i, 56) - 0.5) * 0.16;
      }
      return;
    }

    if (name === "pm") {
      const strokes = [
        [[-1.2, 0.95, 0], [-1.2, -0.95, 0]],
        [[-1.2, 0.95, 0], [-0.42, 0.95, 0], [-0.18, 0.72, 0], [-0.18, 0.28, 0], [-0.42, 0.05, 0], [-1.2, 0.05, 0]],
        [[0.12, -0.95, 0], [0.12, 0.95, 0]],
        [[1.22, -0.95, 0], [1.22, 0.95, 0]],
        [[0.12, 0.95, 0], [0.67, -0.05, 0], [1.22, 0.95, 0]],
      ];
      for (let i = 0; i < n; i++) {
        const st = strokes[i % strokes.length];
        const p = samplePolyline(st, rnd(i, 4));
        ox[i] = p[0] + (rnd(i, 5) - 0.5) * 0.09;
        oy[i] = p[1] + (rnd(i, 6) - 0.5) * 0.09;
        oz[i] = (rnd(i, 7) - 0.5) * 0.16;
      }
      return;
    }

    const cols = Math.ceil(Math.sqrt(n * 1.35));
    const rows = Math.ceil(n / cols);
    for (let i = 0; i < n; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = (c / (cols - 1) - 0.5) * 2.4;
      const z = (r / Math.max(1, rows - 1) - 0.5) * 2.1;
      const y =
        0.22 * Math.sin(2.1 * x + tnow * 0.6) +
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
    fillShape(name, tgtX, tgtY, tgtZ, 0);
  }

  function initPoints() {
    const n = isMobile() ? 1200 : 2400;
    alloc(n);
    fillShape(SHAPES[shapeIndex] || SHAPES[0], curX, curY, curZ, 0);
    fromX.set(curX);
    fromY.set(curY);
    fromZ.set(curZ);
    setTarget(SHAPES[shapeIndex] || SHAPES[0]);
    morphT = 0;
    elapsed = 0;
  }

  function resize() {
    const rect = host.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 8 || h < 8) {
      if (!resizeQueued) {
        resizeQueued = true;
        requestAnimationFrame(() => {
          resizeQueued = false;
          resize();
        });
      }
      return;
    }
    const nextDpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    cssW = w;
    cssH = h;
    dpr = nextDpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const bw = Math.max(1, Math.round(w * dpr));
    const bh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const want = isMobile() ? 1200 : 2400;
    if (!sized) {
      sized = true;
      initPoints();
    } else if (want !== COUNT) {
      initPoints();
    }
  }

  function advanceMorph(dt) {
    elapsed += dt;
    const local = elapsed % CYCLE;
    if (local < HOLD) {
      morphT = 0;
      morphing = false;
      const name = SHAPES[shapeIndex];
      if (FLOW[name] && !reduceMotion) {
        fillShape(name, curX, curY, curZ, elapsed);
      } else {
        curX.set(tgtX);
        curY.set(tgtY);
        curZ.set(tgtZ);
      }
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
    if (!sized || cssW < 8 || cssH < 8 || !COUNT) return;
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

  resize();
  if (sized) draw();

  const ro = new ResizeObserver(() => {
    resize();
    if (reduceMotion) draw();
  });
  ro.observe(host);
  if (host !== canvas) ro.observe(document.querySelector(".hero") || host);

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
  io.observe(host);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && visible && !reduceMotion) start();
  });

  window.addEventListener("resize", resize, { passive: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      resize();
      if (reduceMotion) draw();
    });
  }

  if (!reduceMotion) {
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    start();
  }

  window.__heroMorphSet = function (name) {
    const i = SHAPES.indexOf(name);
    if (i < 0 || !COUNT) return false;
    shapeIndex = i;
    setTarget(name);
    fillShape(name, curX, curY, curZ, 0.8);
    fromX.set(curX);
    fromY.set(curY);
    fromZ.set(curZ);
    elapsed = 0.4;
    morphing = false;
    draw();
    return true;
  };
})();
