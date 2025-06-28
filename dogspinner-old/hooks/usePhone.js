import { useContext } from "./useContext.js";
import { spinnerState } from "./useSpinner.js";

let cached = null;

export function usePhone() {
  if (cached) return cached;

  const context = useContext();

  let previousTime = 0;

  /** @param {number} time */
  function tick(time = 0) {
    const deltaTime = time - previousTime;
    previousTime = time;

    // Bar outline
    context.strokeStyle = "black";
    context.lineWidth = 1;
    const { canvas } = context;
    context.strokeRect(10, canvas.height / 4, canvas.width - 20, 100);

    // Bar fill
    context.fillStyle = "rgb(240, 240, 255, 1.0)";
    const rect = [
      20,
      canvas.height / 4 + 10,
      (canvas.width - 40) * (spinnerState.energy / 50),
      100 - 20,
    ];
    context.fillRect(...rect);
    context.strokeStyle = "blue";
    context.strokeRect(...rect);

    if (spinnerState.energy > 40) {
      spinnerState.energy -= 0.009 * deltaTime;
    } else {
      spinnerState.energy -= 0.009 * deltaTime;
    }
    // spinnerState.energy -= 0.009 * deltaTime;
    if (spinnerState.energy < 0) spinnerState.energy = 0;

    // requestAnimationFrame(tick);
  }

  cached = tick;
  return tick;
}
