import { useContext } from "./useContext.js";
import { spinnerState } from "./useSpinner.js";

let cached = null;

export function useDial() {
  if (cached) return cached;

  const context = useContext();

  let previousTime = 0;

  const energyDiffs = [];
  let previousEnergy = 0;

  /** @param {number} time */
  function tick(time = 0) {
    const deltaTime = time - previousTime;
    previousTime = time;

    // Bar outline
    context.strokeStyle = "black";
    context.lineWidth = 1;
    const { canvas } = context;
    context.strokeRect(10, canvas.height / 2.5, canvas.width - 20, 100);

    const energyDiff = spinnerState.energy - previousEnergy;
    energyDiffs.push(energyDiff);
    if (energyDiffs.length > 100) {
      energyDiffs.shift();
    }
    const averageEnergyDiff =
      energyDiffs.reduce((a, b) => a + b, 0) / energyDiffs.length;
    previousEnergy = spinnerState.energy;

    let positionX = (canvas.width - 40) * Math.max(averageEnergyDiff * 10, 0);

    // Bar fill
    context.fillStyle = "rgb(255, 240, 240, 1.0)";
    const rect = [positionX + 20, canvas.height / 2.5 + 10, 20, 100 - 20];
    context.fillRect(...rect);
    context.strokeStyle = "red";
    context.strokeRect(...rect);
  }

  cached = tick;
  return tick;
}
