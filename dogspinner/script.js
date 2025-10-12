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
canvas.style.imageRendering = "pixelated";

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

addEventListener("resize", () => {
  for (const entity of entities) {
    entity.resize();
  }
});

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

function lerpPoint([a, b], t) {
  return [lerp([a[0], b[0]], t), lerp([a[1], b[1]], t)];
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
function triggerAllReactors(deltaTime = 0) {
  for (const entity of entities) {
    entity.react(deltaTime);
  }
}

class Entity {
  x = 0;
  y = 0;

  constructor() {
    this.resize();
  }

  /**
   * Draw the entity to the canvas.
   * @param {CanvasRenderingContext2D} context
   */
  draw(context) {}

  /**
   * Update the entity. Called every frame.
   * @param {number} deltaTime
   */
  update(deltaTime) {}

  /**
   * Hit test a point against the entity.
   * @param {[number, number]} point - [x, y]
   * @returns {boolean}
   */
  hits([x, y]) {
    return false;
  }

  /**
   * Called when the pointer starts hovering over the entity.
   */
  hover() {}

  /**
   * Called when the pointer stops hovering over the entity.
   */
  unhover() {}

  /**
   * Limit the entity's position to a certain range.
   * @param {[number, number]} point - [x, y]
   * @returns {[number, number]} - [x, y]
   */
  constrain([x, y]) {
    return [x, y];
  }

  /**
   * Called when the pointer starts touching the entity.
   * @returns {Entity | null} - the entity that was touched, or null to not touch the entity
   */
  touch() {
    return this;
  }

  /**
   * Called when the pointer stops touching the entity.
   */
  release() {}

  /**
   * Called when the pointer starts dragging the entity.
   */
  drag() {}

  /**
   * If the entity should derive any state from other things, define it here.
   * @param {number} deltaTime - Time since the last frame
   */
  react(deltaTime) {}

  /**
   * Entities that should react in response to this entity's state.
   * @type {Entity[]}
   **/
  reactors = [];

  /**
   * Called when the window is resized.
   */
  resize() {}

  /**
   * Update the entity and all of its reactors.
   * @param {number} deltaTime - Time since the last frame
   */
  act(deltaTime) {
    this.update(deltaTime);
    for (const reactor of this.reactors) {
      reactor.react(deltaTime);
    }
  }

  /**
   * Update all of the entity's reactors.
   */
  updateReactors() {
    for (const reactor of this.reactors) {
      reactor.react(0);
    }
  }
}

class Circle extends Entity {
  r = 10;
  fillColor = "white";
  strokeColor = "black";
  strokeWidth = 1;

  pinX = 0;
  pinY = 0;

  draw(context) {
    context.fillStyle = this.fillColor;
    context.strokeStyle = this.strokeColor;
    context.lineWidth = this.strokeWidth;
    context.beginPath();
    context.arc(this.x + this.pinX, this.y + this.pinY, this.r, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  hits([x, y]) {
    const distance = Math.hypot(this.x + this.pinX - x, this.y + this.pinY - y);
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
  // strokeColor = "transparent";
  strokeColor = "red";
  strokeWidth = 2;
  fillColor = "transparent";
  fillWidth = 20;
}

class Pivot extends Circle {
  r = 30;
  fillColor = "transparent";
  strokeColor = "transparent";
  strokeWidth = 2;

  hits() {
    return false;
  }

  resize() {
    this.x = canvas.width / 2;
    this.y = (canvas.height / 3) * 2.25;
  }
}

class End extends Entity {
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
  }

  speed = 0;
  update(deltaTime) {
    if (!this.handle) return;
    const speed = Math.max(0, this.speed);
    const x = lerp([this.x, this.handle.x], speed);
    const y = lerp([this.y, this.handle.y], speed);

    const constrained = this.constrain([x, y]);
    this.x = constrained[0];
    this.y = constrained[1];
  }

  /**
   * @param {[number, number]} point - [x, y]
   * @returns {[number, number]} - [x, y]
   */
  constrain([x, y]) {
    if (!this.pivot) return [x, y];
    if (!this.handle) return [x, y];
    // Constrain the end to be within a certain distance from the pivot
    const distance = Math.hypot(this.pivot.x - x, this.pivot.y - y);
    const maxDistance = getArmLength(); // Maximum distance from the pivot
    let angle = Math.atan2(y - this.pivot.y, x - this.pivot.x);
    // if (distance > maxDistance) {
    //   x = this.pivot.x + Math.cos(angle) * maxDistance;
    //   y = this.pivot.y + Math.sin(angle) * maxDistance;
    // }
    // const minDistance = 350; // Minimum distance from the pivot
    // if (distance < minDistance) {
    //   const angle = Math.atan2(y - this.pivot.y, x - this.pivot.x);
    //   x = this.pivot.x + Math.cos(angle) * minDistance;
    //   y = this.pivot.y + Math.sin(angle) * minDistance;
    // }

    let angleOfHandleAroundPivot = Math.atan2(
      this.handle.y - this.pivot.y,
      this.handle.x - this.pivot.x
    );

    const signAngleOfHandleAroundPivot = Math.sign(angleOfHandleAroundPivot);
    const signAngle = Math.sign(angle);

    if (
      Math.abs(angleOfHandleAroundPivot) > Math.PI / 2 &&
      Math.abs(angle) > Math.PI / 2 &&
      signAngleOfHandleAroundPivot !== signAngle
    ) {
      if (signAngleOfHandleAroundPivot < 0) {
        angleOfHandleAroundPivot += Math.PI * 2;
      } else {
        angleOfHandleAroundPivot -= Math.PI * 2;
      }
    }

    const angleDifferenceBetweenHandleAndEnd = angle - angleOfHandleAroundPivot;

    // If the angle difference is too large, rotate it a bit
    const maxAngleDifference = 0;
    // const maxAngleDifference = 0.02;
    if (Math.abs(angleDifferenceBetweenHandleAndEnd) > maxAngleDifference) {
      const direction = angleDifferenceBetweenHandleAndEnd > 0 ? 1 : -1;
      const newAngle =
        angleOfHandleAroundPivot + direction * maxAngleDifference;
      x = this.pivot.x + Math.cos(newAngle) * distance;
      y = this.pivot.y + Math.sin(newAngle) * distance;
    }

    const handleDistanceFromPivot = Math.hypot(
      this.handle.x - this.pivot.x,
      this.handle.y - this.pivot.y
    );

    const newAngle = Math.atan2(y - this.pivot.y, x - this.pivot.x);

    // Make the distance between the end and the pivot be the same as the distance between the handle and the pivot
    if (distance !== handleDistanceFromPivot) {
      x = this.pivot.x + Math.cos(newAngle) * handleDistanceFromPivot;
      y = this.pivot.y + Math.sin(newAngle) * handleDistanceFromPivot;
    }

    return [x, y];
  }
}

const BASE_ARM_LENGTH = 275;
const BASE_HANDLE_RADIUS = 60;
const BASE_HANDLE_RADIUS_HOVER = 5;

function getArmLength() {
  const mobileBreakpoint =
    canvas.width < MOBILE_BREAKPOINT_WIDTH * devicePixelRatio;
  const shortBreakpoint =
    canvas.height < SHORT_BREAKPOINT_HEIGHT * devicePixelRatio;
  if (mobileBreakpoint && shortBreakpoint) {
    return BASE_ARM_LENGTH * 0.7 * 0.7;
  }
  if (mobileBreakpoint || shortBreakpoint) {
    return BASE_ARM_LENGTH * 0.7;
  }
  return BASE_ARM_LENGTH;
}
function getHandleRadius() {
  if (
    canvas.width < MOBILE_BREAKPOINT_WIDTH * devicePixelRatio ||
    canvas.height < SHORT_BREAKPOINT_HEIGHT * devicePixelRatio
  ) {
    return BASE_HANDLE_RADIUS * 1;
  }
  return BASE_HANDLE_RADIUS * 1.1;
}
function getHandleRadiusHover() {
  if (
    canvas.width < MOBILE_BREAKPOINT_WIDTH * devicePixelRatio ||
    canvas.height < SHORT_BREAKPOINT_HEIGHT * devicePixelRatio
  ) {
    return BASE_HANDLE_RADIUS_HOVER * 0.7;
  }
  return BASE_HANDLE_RADIUS_HOVER;
}

class Handle extends Circle {
  x = canvas.width / 2;
  y = canvas.height;
  r = getHandleRadius();
  fillColor = "transparent";
  strokeColor = "transparent";
  // fillColor = "rgb(100, 100, 255, 1.0)";
  // strokeColor = "blue";
  strokeWidth = 2;
  touchOffsetX = 0;
  touchOffsetY = 0;

  /** @type {Pivot | null} */
  pivot = null;

  /** @type {End | null} */
  end = null;

  constructor({ pivot }) {
    super();
    this.pivot = pivot;
    pivot.reactors.push(this);
  }

  isHovered = false;
  isTouched = false;

  hover() {
    this.r = getHandleRadius() + getHandleRadiusHover();
    setCursor("grab");
    this.isHovered = true;
    this.updateReactors();
  }

  resize() {
    this.r = getHandleRadius();
  }

  unhover() {
    this.r = getHandleRadius();
    setCursor("default");
    this.isHovered = false;
    this.updateReactors();
  }

  update(deltaTime) {}

  touch() {
    setCursor("grabbing");
    this.isTouched = true;
    this.touchOffsetX = this.x - pointer.x; // + this.pinX;
    this.touchOffsetY = this.y - pointer.y; // + this.pinY;
    this.r = getHandleRadius();
    this.updateReactors();
    this.hasTouched = true;
    return this;
  }

  hasDragged = false;
  drag() {
    this.hasDragged = true;
    const x = pointer.x + this.touchOffsetX;
    const y = pointer.y + this.touchOffsetY;

    const constrained = this.constrain([x, y]);
    this.x = constrained[0];
    this.y = constrained[1];
  }

  react() {
    const constrained = this.constrain([this.x, this.y]);
    this.x = constrained[0];
    this.y = constrained[1];
  }

  stretch = 0.9;

  /**
   * @param {[number, number]} point - [x, y]
   * @returns {[number, number]} - [x, y]
   */
  constrain([x, y]) {
    if (!this.pivot) return [x, y];
    // Constrain the end to be within a certain distance from the pivot
    const positionIfItWere400Exactly = [
      this.pivot.x +
        Math.cos(Math.atan2(y - this.pivot.y, x - this.pivot.x)) *
          getArmLength(),
      this.pivot.y +
        Math.sin(Math.atan2(y - this.pivot.y, x - this.pivot.x)) *
          getArmLength(),
    ];

    // Ease between the current position and the position if it were ARM_LENGTH exactly
    x = lerp([x, positionIfItWere400Exactly[0]], this.stretch);
    y = lerp([y, positionIfItWere400Exactly[1]], this.stretch);

    return [x, y];
  }

  release() {
    const constrained = this.constrain([this.x, this.y]);
    this.x = constrained[0];
    this.y = constrained[1];
    this.isTouched = false;
    // if (!this.pivot) return;
    // /** @type [number, number] */
    // const positionIfItWere400Exactly = [
    //   this.pivot.x +
    //     Math.cos(Math.atan2(this.y - this.pivot.y, this.x - this.pivot.x)) *
    //       ARM_LENGTH,
    //   this.pivot.y +
    //     Math.sin(Math.atan2(this.y - this.pivot.y, this.x - this.pivot.x)) *
    //       ARM_LENGTH,
    // ];

    // // Snap to the position if it were ARM_LENGTH exactly
    // this.x = positionIfItWere400Exactly[0];
    // this.y = positionIfItWere400Exactly[1];
    this.updateReactors();
  }
}

const MOBILE_BREAKPOINT_WIDTH = 500;
const SHORT_BREAKPOINT_HEIGHT = 650;

class AnimatedSprite extends Entity {
  /**
   *
   * @param {object} options
   * @param {string[]} options.frames
   * @param {number} options.fps
   */
  constructor({ frames, fps }) {
    super();

    this.fps = fps;
    this.sprites = frames.map((frame) => new Sprite({ src: frame }));
    const firstSprite = this.sprites[0];
    if (!firstSprite) {
      throw new Error("Frames array must have at least one frame");
    }
    this.dummy.image.onload = () => {};
    firstSprite.image.addEventListener("load", () => {
      this.dummy.image = firstSprite.image;
      this.dummy.src = firstSprite.src;
      this.dummy.width = firstSprite.width;
      this.dummy.height = firstSprite.height;
    });
  }

  /**
   * @param {Sprite} child
   */
  updateChildFromDummy(child) {
    for (const key in this.dummy) {
      if (key === "src") continue;
      if (key === "image") continue;
      child[key] = this.dummy[key];
    }
  }

  dummy = new Sprite({ src: "assets/placeholder-dog.gif" });

  /** @type {Sprite[]} */
  sprites = [];

  /** @type {number} */
  currentFrame = 0;

  /** @type {number} */
  time = 0;

  /** @type {number} */
  frameRate = 0;

  /** @param {number} deltaTime */
  update(deltaTime) {
    // deltatime is milliseconds
    // fps is frames per second
    // so we need to convert deltatime to frames
    const msPerFrame = 1000 / this.fps;
    this.time += deltaTime;
    while (this.time >= msPerFrame) {
      this.currentFrame = (this.currentFrame + 1) % this.sprites.length;
      this.time -= msPerFrame;
    }
  }

  draw(context) {
    const currentSprite = this.sprites[this.currentFrame];
    if (!currentSprite) return;
    this.updateChildFromDummy(currentSprite);
    currentSprite.draw(context);
  }
}

class Sprite extends Entity {
  x = 0;
  y = 0;
  src = "";
  image = new Image();

  width = 0;
  height = 0;

  scale = 1;

  mobileScale = 1;
  desktopScale = 1;
  shortScale = 1;

  cropBottom = 0;
  cropTop = 0;
  cropLeft = 0;
  cropRight = 0;

  rotation = 0;

  anchorX = 0.5;
  anchorY = 0.5;

  pinRotation = 0;
  pinX = 0;
  pinY = 0;

  visible = true;

  constructor({ src }) {
    super();
    this.src = src;
    this.image.src = src;
    this.image.onload = () => {
      this.width = this.image.width;
      this.height = this.image.height;
    };
  }

  /**
   * Get the manually set scale, scaled by the breakpoint scale.
   */
  getScaledScale() {
    let horizontalModifier = 1;
    if (canvas.width < MOBILE_BREAKPOINT_WIDTH * devicePixelRatio) {
      horizontalModifier = this.mobileScale;
    } else {
      horizontalModifier = this.desktopScale;
    }

    let verticalModifier = 1;
    if (canvas.height < SHORT_BREAKPOINT_HEIGHT * devicePixelRatio) {
      verticalModifier = this.shortScale;
    }

    return this.scale * horizontalModifier * verticalModifier;
  }

  /**
   * @param {CanvasRenderingContext2D} context
   */
  draw(context) {
    if (!this.image.complete || !this.visible) return;
    const sx = this.cropLeft * this.image.width;
    const sy = this.cropTop * this.image.height;
    const cropHorizontal = this.cropLeft + this.cropRight;
    const cropVertical = this.cropTop + this.cropBottom;
    const sw = this.image.width * (1 - cropHorizontal);
    const sh = this.image.height * (1 - cropVertical);

    const width = this.width * this.getScaledScale();
    const height = this.height * this.getScaledScale();
    const cropWidth = width * (1 - cropHorizontal);
    const cropHeight = height * (1 - cropVertical);
    context.save();
    context.translate(this.pinX, this.pinY);
    context.rotate(this.pinRotation);
    context.translate(-this.pinX, -this.pinY);

    context.translate(this.x, this.y);
    context.rotate(this.rotation);

    context.drawImage(
      this.image,
      sx,
      sy,
      sw,
      sh,
      -width * this.anchorX,
      -height * this.anchorY,
      cropWidth,
      cropHeight
    );
    context.restore();
  }
}

//========//
// FRAMES //
//========//
/**
 * @param {object} options
 * @param {string} options.base - base path, e.g. "assets/dog/dog-"
 * @param {number} options.count - number of frames
 * @param {string} options.type - file type, e.g. "png"
 * @param {number} options.pad - number of digits to pad the frame number with
 * @returns {string[]}
 */
function getFramePaths({ base, count, type, pad }) {
  return Array.from(
    { length: count },
    (_, i) => `${base}${i.toString().padStart(pad, "0")}.${type}`
  );
}

//===========//
// INSTANCES //
//===========//
{
  const pivot = new Pivot();
  const handle = new Handle({ pivot });
  const end = new End({ handle, pivot });
  const arm = new Arm({ start: pivot, end: end });

  const titleBoil = new AnimatedSprite({
    frames: [
      "assets/title/title-0.png",
      "assets/title/title-1.png",
      "assets/title/title-2.png",
    ],
    fps: 8,
  });
  titleBoil.dummy.mobileScale = 0.75;
  titleBoil.dummy.cropBottom = 0.7;
  titleBoil.dummy.shortScale = 0.7;

  const handleBoil = new AnimatedSprite({
    frames: [
      "assets/handle/handle-0.png",
      "assets/handle/handle-1.png",
      "assets/handle/handle-2.png",
    ],
    fps: 8,
  });
  handleBoil.dummy.anchorY = 0.2;
  handleBoil.dummy.anchorX = 0.473036896878;
  handleBoil.dummy.shortScale = 0.7;
  handleBoil.dummy.mobileScale = 0.7;

  const blipBoil = new AnimatedSprite({
    frames: getFramePaths({
      base: "assets/blip/251012-Dogspinner-Anim-Handle-BLIP-Export Uncropped_",
      count: 14,
      type: "png",
      pad: 5,
    }),
    fps: 8,
  });

  blipBoil.dummy.visible = false;

  function copyHandleBoilToBlipBoil() {
    blipBoil.dummy.anchorX = handleBoil.dummy.anchorX;
    blipBoil.dummy.anchorY = handleBoil.dummy.anchorY;
    blipBoil.dummy.shortScale = handleBoil.dummy.shortScale;
    blipBoil.dummy.mobileScale = handleBoil.dummy.mobileScale;

    blipBoil.dummy.x = handleBoil.dummy.x;
    blipBoil.dummy.y = handleBoil.dummy.y;
    blipBoil.dummy.rotation = handleBoil.dummy.rotation;
    blipBoil.dummy.pinX = handleBoil.dummy.pinX;
    blipBoil.dummy.pinY = handleBoil.dummy.pinY;
    blipBoil.dummy.scale = handleBoil.dummy.scale;
    blipBoil.dummy.pinRotation = handleBoil.dummy.pinRotation;
  }

  copyHandleBoilToBlipBoil();

  setTimeout(() => {
    if (handle.hasDragged) return;
    blipBoil.dummy.visible = true;
  }, 6500);

  const holeBoil = new AnimatedSprite({
    frames: getFramePaths({
      base: "assets/hole/251012-Dogspinner-Anim-Handle-HOLE-Export_",
      count: 3,
      type: "png",
      pad: 5,
    }),
    fps: 8,
  });

  // holeBoil.dummy.anchorY = 0.2;
  // holeBoil.dummy.anchorX = 0.473036896878;
  holeBoil.dummy.mobileScale = 0.7;
  holeBoil.dummy.shortScale = 0.7;

  const armBoil = new AnimatedSprite({
    frames: getFramePaths({
      base: "assets/arm/251012-Dogspinner-Anim-Handle Base-LINE-Export_",
      count: 3,
      type: "png",
      pad: 5,
    }),
    fps: 8,
  });

  armBoil.dummy.react = () => {
    const rotation =
      Math.atan2(arm.endY - arm.startY, arm.endX - arm.startX) - Math.PI / 2;
    armBoil.dummy.rotation = rotation;
    handleBoil.dummy.y = handle.y;
    handleBoil.dummy.x = handle.x;

    const a = [arm.startX, arm.startY];
    const b = [handleBoil.dummy.x, handleBoil.dummy.y];
    const lerped = lerpPoint([a, b], 0.97);

    if (handle.isHovered && !handle.isTouched) {
      handleBoil.dummy.scale = 1;
      // handleBoil.dummy.scale = 1.05;
    } else {
      handleBoil.dummy.scale = 1;
    }

    handleBoil.dummy.x = lerped[0] - 3 * handleBoil.dummy.getScaledScale();
    handleBoil.dummy.y = lerped[1] - 262 * handleBoil.dummy.getScaledScale();
    copyHandleBoilToBlipBoil();
    if (handle.hasDragged) {
      blipBoil.dummy.visible = false;
    }
  };
  handle.reactors.push(armBoil.dummy);
  arm.reactors.push(armBoil.dummy);

  armBoil.dummy.anchorY = 0.2;
  armBoil.dummy.anchorX = 0.473036896878;
  armBoil.dummy.mobileScale = 0.7;
  armBoil.dummy.shortScale = 0.7;

  const idleAnimation = new AnimatedSprite({
    frames: getFramePaths({
      base: "assets/idle/250701-Dogspinner-Anim-Idle-v2_",
      count: 18,
      type: "png",
      pad: 5,
    }),
    fps: 8,
  });
  idleAnimation.dummy.mobileScale = 0.75;
  idleAnimation.dummy.shortScale = 0.7;

  const runAnimation = new AnimatedSprite({
    frames: getFramePaths({
      base: "assets/run/250701-Dogspinner-Anim-Run1-v2_",
      count: 8,
      type: "png",
      pad: 5,
    }),
    fps: 12,
  });
  runAnimation.dummy.mobileScale = 0.75;
  runAnimation.dummy.shortScale = 0.7;

  const spinAnimation = new AnimatedSprite({
    frames: getFramePaths({
      base: "assets/spin/250701-Dogspinner-Anim-RunHiSpeed-v2_",
      count: 3,
      type: "png",
      pad: 5,
    }),
    fps: 12,
  });
  spinAnimation.dummy.mobileScale = 0.75;
  spinAnimation.dummy.shortScale = 0.7;

  const tiredAnimation = new AnimatedSprite({
    frames: getFramePaths({
      base: "assets/tired/250701-Dogspinner-Anim-Tired-v2_",
      count: 5,
      type: "png",
      pad: 5,
    }),
    fps: 12,
  });
  tiredAnimation.dummy.mobileScale = 0.75;
  tiredAnimation.dummy.shortScale = 0.7;

  function handleResize() {
    titleBoil.dummy.x = canvas.width / 2;
    titleBoil.dummy.y = Math.max(280, canvas.height / 3);

    armBoil.dummy.x = canvas.width / 2;
    armBoil.dummy.y = canvas.height * 0.75;

    handleBoil.dummy.x = canvas.width / 2;
    handleBoil.dummy.y = canvas.height * 0.75;

    idleAnimation.dummy.x = canvas.width / 2;
    idleAnimation.dummy.y = canvas.height / 3;

    runAnimation.dummy.x = canvas.width / 2;
    runAnimation.dummy.y = canvas.height / 3;

    spinAnimation.dummy.x = canvas.width / 2;
    spinAnimation.dummy.y = canvas.height / 3;

    tiredAnimation.dummy.x = canvas.width / 2;
    tiredAnimation.dummy.y = canvas.height / 3;

    const isScaledHandle =
      canvas.width < MOBILE_BREAKPOINT_WIDTH * devicePixelRatio ||
      canvas.height < SHORT_BREAKPOINT_HEIGHT * devicePixelRatio;
    handle.pinX = 90 * (isScaledHandle ? 0.7 : 1);

    holeBoil.dummy.anchorX = 0.8;
    holeBoil.dummy.anchorY = 0.47;
    holeBoil.dummy.x = canvas.width / 2;
    holeBoil.dummy.y = canvas.height * 0.75;
  }

  const idleAnimationUpdate = idleAnimation.update;
  idleAnimation.update = function (deltaTime) {
    idleAnimationUpdate.call(this, deltaTime);
    updateDogState();
  };

  addEventListener("resize", handleResize);
  handleResize();

  addEntity(end);
  addEntity(pivot);
  addEntity(holeBoil);

  addEntity(idleAnimation);
  addEntity(runAnimation);
  addEntity(spinAnimation);
  addEntity(tiredAnimation);

  addEntity(titleBoil);
  addEntity(armBoil);
  addEntity(handleBoil);

  addEntity(handle);
  addEntity(arm);
  addEntity(blipBoil);

  function updateDogState() {
    idleAnimation.dummy.visible = true;
    runAnimation.dummy.visible = false;
    spinAnimation.dummy.visible = false;
    tiredAnimation.dummy.visible = false;
  }
}
