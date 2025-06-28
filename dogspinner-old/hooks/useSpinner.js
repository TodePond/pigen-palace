import { rotatePoint } from "../utilities.js";
import { useContext } from "./useContext.js";
import { useCursor } from "./useCursor.js";
import { hand } from "./hand.js";
import { usePointer } from "./usePointer.js";

export const spinnerState = {
  rotation: 0,
  speed: 0.001,
  handleLength: 500,
  energy: 0,
};

const historyRotations = [];

function getWrappedDifference(a, b, min, max) {
  const wrappedA = wrap(a, min, max);
  const wrappedB = wrap(b, min, max);
  const diff = wrappedB - wrappedA;
  const range = max - min;
  if (diff > range / 2) return diff - range;
  if (diff < -range / 2) return diff + range;
  return diff;
}

function wrap(value, min, max) {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

function getApproximateSpeedFromHistory() {
  if (historyRotations.length < 2) return 0;

  const diffs = [];
  for (let i = 1; i < historyRotations.length - 1; i++) {
    const current = historyRotations[i];
    const next = historyRotations[i + 1];
    const diff = getWrappedDifference(current, next, -Math.PI, Math.PI);
    diffs.push(diff);
  }

  const averageDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return averageDiff;
}

let HANDLE_WIDTH = 70;
// const SPIN_FRICTION = 0.92;
const SPIN_FRICTION = 0.97;
// const SPIN_FRICTION = 0.9;
let START_SIZE = 50;
let END_SIZE = 80;
/** @type {[number, number]} */
let CENTER = [0, 0];

let previousTime = 0;

let cached = null;

const context = useContext();

const { canvas } = context;

export function useSpinnerTick() {
  if (cached) return cached;

  function handleResize() {
    const { width, height } = canvas;
    spinnerState.handleLength = Math.min(
      (height / 2 / 4) * 1.5,
      (width / 2 / 2) * 1.5
    );

    END_SIZE = Math.min(height / 2 / 12, width / 2 / 8);
    START_SIZE = Math.min(height / 2 / 24, width / 2 / 16);
    // (height / 2 / 12) * 1;
    HANDLE_WIDTH = Math.min(height / 2 / 12, width / 2 / 8);
    // (height / 2 / 12) * 1;
    const widthMinning = width / 2 < height / 2;
    CENTER = widthMinning
      ? [width / 2, (height / 4) * 3]
      : [width / 2, (height / 4) * 3];
  }
  addEventListener("resize", handleResize);
  handleResize();

  const pointer = usePointer();
  const [getCursor, setCursor] = useCursor();

  cached = ({ time }) => {
    const cursor = getCursor();
    const delta = time - previousTime;
    previousTime = time;

    spinnerState.rotation += spinnerState.speed;
    historyRotations.push(spinnerState.rotation);
    if (historyRotations.length > 10) {
      const current = historyRotations.at(-2);
      const next = historyRotations.at(-1);
      const diff = getWrappedDifference(current, next, -Math.PI, Math.PI);
      spinnerState.energy += diff;
      historyRotations.shift();
    }
    spinnerState.speed *= SPIN_FRICTION;
    // spinnerState.handleLength = 100 + getApproximateSpeedFromHistory() * 1000;

    /** @type {[number, number]} */
    const center = CENTER;

    // HANDLE
    /** @type {[number, number][]} */
    const handleRectPoints = [
      [center[0] - HANDLE_WIDTH / 2, center[1] - spinnerState.handleLength],
      [center[0] + HANDLE_WIDTH / 2, center[1] - spinnerState.handleLength],
      [center[0] + HANDLE_WIDTH / 2, center[1]],
      [center[0] - HANDLE_WIDTH / 2, center[1]],
    ];

    context.lineWidth = 1;
    context.strokeStyle = "black";
    context.fillStyle = "white";
    context.beginPath();
    for (let i = 0; i < handleRectPoints.length; i++) {
      const point = handleRectPoints[i];
      const rotatedPoint = rotatePoint(
        point ?? [0, 0],
        spinnerState.rotation + Math.PI / 2,
        center
      );
      context.lineTo(rotatedPoint[0], rotatedPoint[1]);
    }
    context.closePath();
    context.stroke();

    // CENTER
    context.strokeStyle = "black";
    context.fillStyle = "white";
    context.beginPath();
    context.lineWidth = cursor === "pointer" && !pointer.down ? 3 : 1;
    context.arc(center[0], center[1], START_SIZE, 0, Math.PI * 2);
    context.closePath();
    context.fill();
    context.stroke();

    // END
    /** @type {[number, number]} */
    const endPosition = [
      center[0] + Math.cos(spinnerState.rotation) * spinnerState.handleLength,
      center[1] + Math.sin(spinnerState.rotation) * spinnerState.handleLength,
    ];
    context.fillStyle = "rgb(240, 240, 255, 1.0)";
    context.beginPath();
    context.arc(endPosition[0], endPosition[1], END_SIZE, 0, Math.PI * 2);
    context.closePath();
    context.fill();
    context.lineWidth = cursor === "grab" ? 3 : 1;
    context.strokeStyle = "blue";
    context.stroke();

    if (!pointer.position) return;

    const distanceFromEnd = Math.hypot(
      endPosition[0] - pointer.position[0],
      endPosition[1] - pointer.position[1]
    );

    const distanceFromStart = Math.hypot(
      center[0] - pointer.position[0],
      center[1] - pointer.position[1]
    );

    if (hand.state === "pointing" && !pointer.down) {
      hand.state = "idle";
    }

    if (distanceFromEnd < END_SIZE) {
      if (pointer.down && hand.state === "idle") {
        hand.state = "grabbing";
        const pointerRotation = Math.atan2(
          pointer.position[1] - center[1],
          pointer.position[0] - center[0]
        );
        hand.offsetRotation = pointerRotation - spinnerState.rotation;
        setCursor("grabbing");
        spinnerState.speed = 0;
      } else if (pointer.down && hand.state === "grabbing") {
        const pointerRotation = Math.atan2(
          pointer.position[1] - center[1],
          pointer.position[0] - center[0]
        );
        spinnerState.rotation = pointerRotation - hand.offsetRotation;
      } else if (!pointer.down) {
        hand.state = "idle";
        setCursor("grab");
        spinnerState.speed = getApproximateSpeedFromHistory();
      }
    } else if (distanceFromStart < START_SIZE) {
      if (!pointer.down && hand.state === "idle") {
        setCursor("pointer");
      } else if (pointer.down && hand.state === "idle") {
        hand.state = "pointing";
        spinnerState.speed += 0.05;
        if (spinnerState.speed > 0) {
          spinnerState.speed *= 1.2;
        }
      }
    } else {
      if (hand.state === "grabbing") {
        if (!pointer.down) {
          hand.state = "idle";
          setCursor("default");
          spinnerState.speed = getApproximateSpeedFromHistory();
        } else {
          const pointerRotation = Math.atan2(
            pointer.position[1] - center[1],
            pointer.position[0] - center[0]
          );
          spinnerState.rotation = pointerRotation - hand.offsetRotation;
        }
      } else {
        setCursor("default");
      }
    }
  };

  return cached;
}
