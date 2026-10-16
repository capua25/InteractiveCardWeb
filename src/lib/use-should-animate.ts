import { useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";

const subscribe = () => () => {};

// MotionConfig reducedMotion="user" no frena los loops infinitos ni los estilos
// ligados al scroll: esos efectos consultan este hook.
// Además devuelve false en el render del server y en la hidratación, así el HTML
// estático coincide siempre (useReducedMotion lee matchMedia ya en el primer
// render del cliente y desalinearía la hidratación para quien reduce movimiento).
export function useShouldAnimate(): boolean {
  const reducedMotion = useReducedMotion();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return hydrated && !reducedMotion;
}
