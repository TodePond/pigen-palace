import { useContext } from "./useContext.js";
import { useDial } from "./useDial.js";
import { usePhone } from "./usePhone.js";
import { useSpinnerTick } from "./useSpinner.js";

let cached = null;

export function useTick() {
  if (cached) return cached;

  const spinnerTick = useSpinnerTick();
  const phoneTick = usePhone();
  const dialTick = useDial();

  const context = useContext();
  cached = tick;

  /** @param {number} time */
  function tick(time = 0) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    spinnerTick({ context, time });
    // console.log(time);
    phoneTick(time);
    dialTick(time);
    requestAnimationFrame(tick);
  }

  return cached;
}
