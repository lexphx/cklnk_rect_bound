const pad = 40;
let k = 3;
const k_choice = [3, 4, 5];
let cpts = 20;
const palette = [
  [10, 50, 255],
  [10, 255, 50],
  [255, 50, 50],
  [128, 128, 128],
  [230, 245, 40],
];
let view = { s: 1, ox: 0, oy: 0 };
let pts = [];
let kSel;
let ptsInpt;
let ptColor = [];
let legend = "";
let selRect = null;
let isDrawing = false;
let rectStart = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  kSel = createSelect();
  k_choice.forEach((v) => kSel.option(v));
  kSel.selected(k);
  kSel.position(windowWidth - kSel.width - 20, 10);
  pts = generateGridPoints(cpts);
  recolorPoints();
  ptsInpt = createInput(cpts);
  ptsInpt.attribute("type", "number");
  ptsInpt.attribute("min", 5);
  ptsInpt.attribute("max", 200);
  ptsInpt.size(40);
  ptsInpt.position(windowWidth - ptsInpt.width - 50, 10);
  ptsInpt.changed(() => {
    const n = int(ptsInpt.value());
    pts = generateGridPoints(n);
    recolorPoints();
    computeView();
  });
  computeView();
}

function draw() {
  nk = kSel ? int(kSel.value()) : k;
  if (nk != k) {
    k = nk;
    recolorPoints();
  }
  background(255);
  noStroke();
  for (let i = 0; i < pts.length; i++) {
    const s = toScreen(pts[i]);
    const [r, g, b] = palette[ptColor[i] % palette.length];
    fill(r, g, b);
    circle(s.x, s.y, 6);
  }

  legend = "";

  if (selRect) {
    const stats = analyzeWorstMonoRect(selRect);

    // draw the rectangle
    const s1 = toScreen({ x: selRect.xmin, y: selRect.ymin });
    const s2 = toScreen({ x: selRect.xmax, y: selRect.ymax });
    noFill();
    const [rr, gg, bb] = palette[stats.colorIndex % palette.length];
    stroke(rr, gg, bb);
    strokeWeight(2);
    rect(s1.x, s1.y, s2.x - s1.x, s2.y - s1.y);

    // highlight points of that color inside the rect
    noStroke();
    fill(rr, gg, bb, 90);
    for (let i = 0; i < pts.length; i++) {
      const P = pts[i];
      if (ptColor[i] !== stats.colorIndex) continue;
      if (
        P.x >= selRect.xmin &&
        P.x <= selRect.xmax &&
        P.y >= selRect.ymin &&
        P.y <= selRect.ymax
      ) {
        const s = toScreen(P);
        circle(s.x, s.y, 12);
      }
    }

    const est = k * Math.log(k);
    const cHat = stats.M / est;
    legend = `M = ${stats.M} | k ln k ≈ ${est.toFixed(1)} | ĉ ≈ ${cHat.toFixed(
      2
    )}`;
  } else {
    legend = "Draw a rectangle to inspect a region.";
  }

  drawLegendBoxes();
}

function drawLegendBoxes() {
  const x0 = 12,
    y0 = 14;
  textSize(14);
  textAlign(LEFT, CENTER);

  const padX = 8,
    padY = 6;
  const w = textWidth(legend) + 2 * padX;
  noStroke();
  fill(255, 230);
  rect(x0 - padX, y0 - padY, w, 24, 6);

  fill(20);
  text(legend, x0, y0 + 5);
}

windowResized = function () {
  resizeCanvas(windowWidth, windowHeight);
  computeView();
  kSel.position(windowWidth - kSel.width - 20, 10);
  ptsInpt.position(windowWidth - ptsInpt.width - 50, 10);
};

function computeView() {
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;
  for (const p of pts) {
    minX = min(minX, p.x);
    minY = min(minY, p.y);
    maxX = max(maxX, p.x);
    maxY = max(maxY, p.y);
  }
  const rangeX = maxX - minX || 1; // if all x are equal || 1
  const rangeY = maxY - minY || 1; // if all y are equal || 1
  // Uniform scale so everything fits
  const sx = (width - 2 * pad) / rangeX;
  const sy = (height - 2 * pad) / rangeY;
  const s = min(sx, sy);
  // Ranges
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  // Offsets so the data is centered
  const ox = width / 2 - s * cx;
  const oy = height / 2 - s * cy;

  view.s = s;
  view.ox = ox;
  view.oy = oy;
}

function toScreen(p) {
  return { x: view.s * p.x + view.ox, y: view.s * p.y + view.oy };
}

function fromScreen(x, y) {
  return {
    x: (x - view.ox) / view.s,
    y: (y - view.oy) / view.s,
  };
}

function generateGridPoints(nPerSide = 20, step = 1) {
  const pts = [];
  for (let i = 0; i < nPerSide; i++) {
    for (let j = 0; j < nPerSide; j++) {
      pts.push({
        x: i * step,
        y: j * step,
      });
    }
  }
  return pts;
}

function recolorPoints() {
  ptColor = pts.map(() => floor(random(k)));
}

function countInRect(points, xmin, xmax, ymin, ymax) {
  let cnt = 0;
  for (const P of points) {
    if (P.x >= xmin && P.x <= xmax && P.y >= ymin && P.y <= ymax) cnt++;
  }
  return cnt;
}

function worstMonoRect(pointsOfColor) {
  if (pointsOfColor.length === 0) return { M: 0, rect: null };

  const xs = [...new Set(pointsOfColor.map((p) => p.x))];
  const ys = [...new Set(pointsOfColor.map((p) => p.y))];

  let best = 1,
    bestRect = null;
  for (let ix1 = 0; ix1 < xs.length; ix1++) {
    for (let ix2 = ix1; ix2 < xs.length; ix2++) {
      const xmin = xs[ix1],
        xmax = xs[ix2];
      for (let iy1 = 0; iy1 < ys.length; iy1++) {
        for (let iy2 = iy1; iy2 < ys.length; iy2++) {
          const ymin = ys[iy1],
            ymax = ys[iy2];
          const m = countInRect(pointsOfColor, xmin, xmax, ymin, ymax);
          if (m > best) {
            best = m;
            bestRect = { xmin, xmax, ymin, ymax };
          }
        }
      }
    }
  }
  return { M: best, rect: bestRect };
}

function analyzeWorstMonoRect(rect) {
  const counts = Array(k).fill(0);

  for (let i = 0; i < pts.length; i++) {
    const P = pts[i];
    if (
      P.x >= rect.xmin &&
      P.x <= rect.xmax &&
      P.y >= rect.ymin &&
      P.y <= rect.ymax
    ) {
      counts[ptColor[i]]++;
    }
  }

  let bestM = 0;
  let bestColor = 0;
  for (let ci = 0; ci < k; ci++) {
    if (counts[ci] >= bestM) {
      bestM = counts[ci];
      bestColor = ci;
    }
  }

  return { M: bestM, colorIndex: bestColor };
}

function mousePressed() {
  const w = fromScreen(mouseX, mouseY);
  isDrawing = true;
  rectStart = w;
  selRect = {
    xmin: w.x,
    xmax: w.x,
    ymin: w.y,
    ymax: w.y,
  };
}

function mouseDragged() {
  if (!isDrawing) return;
  const w = fromScreen(mouseX, mouseY);
  selRect = {
    xmin: min(rectStart.x, w.x),
    xmax: max(rectStart.x, w.x),
    ymin: min(rectStart.y, w.y),
    ymax: max(rectStart.y, w.y),
  };
}

function mouseReleased() {
  if (!isDrawing) return;
  isDrawing = false;

  if (!selRect) return;

  // If the user just clicked without dragging, discard the rectangle
  const w = abs(selRect.xmax - selRect.xmin);
  const h = abs(selRect.ymax - selRect.ymin);
  if (w < 1e-6 || h < 1e-6) {
    selRect = null;
  }
}
