//========//
// CANVAS //
//========//
const canvas = document.createElement("canvas");
document.body.append(canvas);
canvas.style.position = "absolute";
canvas.style.top = "0";
canvas.style.left = "0";
canvas.style.width = "100%";
canvas.style.height = "100%";

const _context = canvas.getContext("2d");
if (!_context) throw new Error("Failed to get canvas context");
const context = _context;

function handleResize() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  context.clearRect(0, 0, canvas.width, canvas.height);
}

addEventListener("resize", handleResize);
handleResize();

//=======//
// WORLD //
//=======//
const entities = [];

function addEntity(entity) {
  entities.push(entity);
}

function removeEntity(entity) {
  const index = entities.indexOf(entity);
  if (index !== -1) {
    entities.splice(index, 1);
  }
}

requestAnimationFrame(tick);
let previousTickTime = 0;
function tick(time = 0) {
  const deltaTime = time - (previousTickTime || 0);
  previousTickTime = time;

  context.clearRect(0, 0, canvas.width, canvas.height);
  for (const entity of entities) {
    entity.update(deltaTime);
  }
  for (const entity of entities) {
    entity.draw(context);
  }

  requestAnimationFrame(tick);
}

function pickAtom([x, y]) {
  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i];
    if (entity.hits([x, y])) {
      return entity;
    }
  }
  return null;
}

//=========//
// USEFULS //
//=========//
function lerp([a, b], t) {
  return a + (b - a) * t;
}

//=========//
// POINTER //
//=========//
const pointer = {
  x: 0,
  y: 0,
  down: false,
  /** @type {Entity | null} */
  hovering: null,
  /** @type {Entity | null} */
  touching: null,
  /** @type {Entity | null} */
  dragging: null,
};

function triggerHover(entity) {
  const previousHovering = pointer.hovering;

  // Unhover the previous entity (if there is one)
  if (pointer.hovering && pointer.hovering !== entity) {
    pointer.hovering.unhover();
    pointer.hovering = null;
  }

  // Hover the new entity
  if (entity && entity !== previousHovering) {
    entity.hover();
    pointer.hovering = entity;
    if (pointer.down) {
      triggerTouch(entity);
    }
  }
}

function triggerTouch(entity) {
  const touching = entity.touch();
  if (touching !== entity) return triggerTouch(entity);
  pointer.touching = entity;
}

function triggerRelease(entity) {
  entity.release();
  pointer.touching = null;
  pointer.dragging = null;
  triggerHover(null);
  const picked = pickAtom([pointer.x, pointer.y]);
  if (picked) {
    triggerHover(picked);
  }
}

function updatePointerPosition(event) {
  const previousX = pointer.x;
  const previousY = pointer.y;
  pointer.x = event.clientX * devicePixelRatio;
  pointer.y = event.clientY * devicePixelRatio;

  if (pointer.x === previousX && pointer.y === previousY) {
    return;
  }

  if (pointer.touching) {
    pointer.touching.drag();
    pointer.dragging = pointer.touching;
  } else {
    const entity = pickAtom([pointer.x, pointer.y]);
    triggerHover(entity);
  }
}

addEventListener("pointermove", (event) => updatePointerPosition(event));
addEventListener("pointerdown", (event) => {
  pointer.down = true;
  updatePointerPosition(event);
  if (pointer.hovering) {
    triggerTouch(pointer.hovering);
  }
});
addEventListener("pointerup", (event) => {
  pointer.down = false;
  updatePointerPosition(event);
  if (pointer.touching) {
    triggerRelease(pointer.touching);
  }
});

function setCursor(cursor) {
  canvas.style.cursor = cursor;
}

//========//
// ENTITY //
//========//
class Entity {
  draw(context) {}
  update(deltaTime) {}
  hits([x, y]) {
    return false;
  }
  hover() {}
  unhover() {}

  /** @returns {Entity | null} */
  touch() {
    return this;
  }

  release() {}
  drag() {}
}

class Circle extends Entity {
  x = 0;
  y = 0;
  r = 10;
  fillColor = "white";
  strokeColor = "black";
  strokeWidth = 1;

  draw(context) {
    context.fillStyle = this.fillColor;
    context.strokeStyle = this.strokeColor;
    context.lineWidth = this.strokeWidth;
    context.beginPath();
    context.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  hits([x, y]) {
    const distance = Math.hypot(this.x - x, this.y - y);
    return distance <= this.r;
  }
}

class Line extends Entity {
  startX = 0;
  startY = 0;
  endX = 10;
  endY = 0;
  fillColor = "white";
  fillWidth = 0;
  strokeColor = "black";
  strokeWidth = 1;
  lineCap = "round";
  draw(context) {
    const angle = Math.atan2(this.endY - this.startY, this.endX - this.startX);
    // Four points making a fat line
    if (this.fillWidth <= 0) {
      context.strokeStyle = this.strokeColor;
      context.lineWidth = this.strokeWidth;
      context.lineCap = this.lineCap;
      context.beginPath();
      context.moveTo(this.startX, this.startY);
      context.lineTo(this.endX, this.endY);
      context.stroke();
      return;
    }
    const points = [
      [
        this.startX + Math.cos(angle + Math.PI / 2) * this.fillWidth,
        this.startY + Math.sin(angle + Math.PI / 2) * this.fillWidth,
      ],
      [
        this.startX + Math.cos(angle - Math.PI / 2) * this.fillWidth,
        this.startY + Math.sin(angle - Math.PI / 2) * this.fillWidth,
      ],
      [
        this.endX + Math.cos(angle - Math.PI / 2) * this.fillWidth,
        this.endY + Math.sin(angle - Math.PI / 2) * this.fillWidth,
      ],
      [
        this.endX + Math.cos(angle + Math.PI / 2) * this.fillWidth,
        this.endY + Math.sin(angle + Math.PI / 2) * this.fillWidth,
      ],
    ].flat();

    context.fillStyle = this.fillColor;
    context.strokeStyle = this.strokeColor;
    context.lineWidth = this.strokeWidth;
    context.lineCap = this.lineCap;
    context.beginPath();
    context.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      context.lineTo(points[i], points[i + 1]);
    }
    context.closePath();
    context.fill();
    context.stroke();
  }
}

class ConnectedLine extends Line {
  /** @type {Entity & {x: number, y: number} | null} */
  start = null;

  /** @type {Entity & {x: number, y: number} | null} */
  end = null;

  constructor({ start, end }) {
    super();
    this.start = start;
    this.end = end;

    this.update(0);
  }

  update(deltaTime) {
    if (!this.start || !this.end) return;

    this.startX = this.start.x;
    this.startY = this.start.y;
    this.endX = this.end.x;
    this.endY = this.end.y;
  }
}

class Arm extends ConnectedLine {
  strokeColor = "rgb(100, 100, 255, 0.5)";
  strokeWidth = 30;
}

class Pivot extends Circle {
  x = canvas.width / 2;
  y = canvas.height / 2;
  r = 30;
  fillColor = "white";
  strokeColor = "black";
  strokeWidth = 2;

  hits() {
    return false;
  }
}

class End extends Circle {
  x = 0;
  y = 0;
  r = 30;
  fillColor = "white";
  strokeColor = "black";
  strokeWidth = 2;

  /** @type {Handle | null} */
  handle = null;

  hits() {
    return false;
  }

  constructor(handle) {
    super();
    this.handle = handle;
    this.update(0);
  }

  update(deltaTime) {
    if (!this.handle) return;
    this.x = lerp([this.x, this.handle.x], 0.1);
    this.y = lerp([this.y, this.handle.y], 0.1);
  }
}

class Handle extends Circle {
  x = canvas.width / 2 - 200;
  y = canvas.height / 2 + 200;
  r = 50;
  fillColor = "rgb(100, 100, 255, 1.0)";
  strokeColor = "black";
  strokeWidth = 2;
  touchOffsetX = 0;
  touchOffsetY = 0;

  hover() {
    this.r = 55;
    setCursor("grab");
  }

  unhover() {
    this.r = 50;
    setCursor("default");
  }

  touch() {
    setCursor("grabbing");
    this.touchOffsetX = this.x - pointer.x;
    this.touchOffsetY = this.y - pointer.y;
    return this;
  }

  drag() {
    this.x = pointer.x + this.touchOffsetX;
    this.y = pointer.y + this.touchOffsetY;
  }
}

const pivot = new Pivot();
const handle = new Handle();
const end = new End(handle);
const arm = new Arm({ start: pivot, end: end });
const forearm = new Arm({ start: end, end: handle });

addEntity(arm);
addEntity(forearm);
addEntity(end);
addEntity(pivot);
addEntity(handle);
