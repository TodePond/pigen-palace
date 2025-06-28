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
  //   context.translate(-canvas.width / 2, -canvas.height / 2);
  //   context.scale(devicePixelRatio, devicePixelRatio);
  //   context.translate(canvas.width / 2, canvas.height / 2);
  for (const entity of entities) {
    entity.update(deltaTime);
    entity.draw(context);
  }
  context.resetTransform();

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
// POINTER //
//=========//
const pointer = {
  x: 0,
  y: 0,
  down: false,
  /** @type {Entity | null} */
  hovering: null,
};

function triggerHover() {
  const entity = pickAtom([pointer.x, pointer.y]);
  const previousHovering = pointer.hovering;
  if (pointer.hovering && pointer.hovering !== entity) {
    pointer.hovering.unhover();
    pointer.hovering = null;
  }
  if (entity && entity !== previousHovering) {
    const hovering = entity.hover();
    pointer.hovering = hovering;
  }
}

function updatePointerPosition(event) {
  pointer.x = event.clientX * devicePixelRatio;
  pointer.y = event.clientY * devicePixelRatio;
  triggerHover();
}

addEventListener("pointermove", (event) => updatePointerPosition(event));
addEventListener("pointerdown", (event) => {
  pointer.down = true;
  updatePointerPosition(event);
});
addEventListener("pointerup", (event) => {
  pointer.down = false;
  updatePointerPosition(event);
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
  /** @returns {Entity | null} */
  hover() {
    return this;
  }
  unhover() {}

  /** @returns {Entity | null} */
  //   touch() {
  //     return this;
  //   }
}

class Circle extends Entity {
  x = 0;
  y = 0;
  r = 10;
  strokeColor = "black";
  strokeWidth = 1;
  fillColor = "white";

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

const Handle = class extends Circle {
  x = canvas.width / 2;
  y = canvas.height / 2;
  r = 50;
  fillColor = "rgb(240, 240, 255, 1.0)";
  strokeColor = "blue";
  strokeWidth = 2;

  hover() {
    this.r = 55;
    setCursor("grab");
    return this;
  }
  unhover() {
    this.r = 50;
    setCursor("default");
  }
};

const handle = new Handle();
addEntity(handle);
