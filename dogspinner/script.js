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
    entity.act(deltaTime);
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
  x = 0;
  y = 0;
  draw(context) {}
  update(deltaTime) {}
  hits([x, y]) {
    return false;
  }
  hover() {}
  unhover() {}
  constrain([x, y]) {
    return [x, y];
  }

  /** @returns {Entity | null} */
  touch() {
    return this;
  }

  release() {}
  drag() {}

  /** @type {Entity[]} */
  reactors = [];
  react(deltaTime) {}
  act(deltaTime) {
    this.update(deltaTime);
    for (const reactor of this.reactors) {
      reactor.react();
    }
  }
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
  lineCap = "butt";
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

    this.start?.reactors.push(this);
    this.end?.reactors.push(this);

    this.react();
  }

  react() {
    if (!this.start || !this.end) return;

    this.startX = this.start.x;
    this.startY = this.start.y;
    this.endX = this.end.x;
    this.endY = this.end.y;
  }
}

class Arm extends ConnectedLine {
  strokeColor = "black";
  strokeWidth = 2;
  fillWidth = 20;
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
  r = 20;
  fillColor = "white";
  strokeColor = "black";
  strokeWidth = 2;

  /** @type {Handle | null} */
  handle = null;

  /** @type {Handle | null} */
  pivot = null;

  hits() {
    return false;
  }

  constructor({ handle, pivot }) {
    super();
    this.handle = handle;
    this.pivot = pivot;
    this.update(0);
  }

  speed = 0.2;
  update(deltaTime) {
    if (!this.handle) return;
    const x = lerp([this.x, this.handle.x], this.speed);
    const y = lerp([this.y, this.handle.y], this.speed);

    const constrained = this.constrain([x, y]);
    this.x = constrained[0];
    this.y = constrained[1];
  }

  constrain([x, y]) {
    if (!this.pivot) return [x, y];
    // Constrain the end to be within a certain distance from the pivot
    const distance = Math.hypot(this.pivot.x - x, this.pivot.y - y);
    const maxDistance = 400; // Maximum distance from the pivot
    if (distance > maxDistance) {
      const angle = Math.atan2(y - this.pivot.y, x - this.pivot.x);
      x = this.pivot.x + Math.cos(angle) * maxDistance;
      y = this.pivot.y + Math.sin(angle) * maxDistance;
    }
    const minDistance = 350; // Minimum distance from the pivot
    if (distance < minDistance) {
      const angle = Math.atan2(y - this.pivot.y, x - this.pivot.x);
      x = this.pivot.x + Math.cos(angle) * minDistance;
      y = this.pivot.y + Math.sin(angle) * minDistance;
    }
    return [x, y];
  }
}

class Handle extends Circle {
  x = canvas.width / 2 - 300;
  y = canvas.height / 2 + 300;
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
const end = new End({ handle, pivot });
const arm = new Arm({ start: pivot, end: end });
const forearm = new Arm({ start: end, end: handle });

addEntity(arm);
addEntity(forearm);
addEntity(end);
addEntity(pivot);
addEntity(handle);
