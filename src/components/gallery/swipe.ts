// Gesto horizontal para cambiar de foto en la vista ampliada.
// Cuenta como swipe si recorre SWIPE_MIN_DISTANCE, o si es un "flick" rápido
// (SWIPE_MIN_VELOCITY) de al menos SWIPE_MIN_FLICK_DISTANCE. Los gestos más
// verticales que horizontales se ignoran: son scroll, no navegación.
export const SWIPE_MIN_DISTANCE = 50; // px
export const SWIPE_MIN_FLICK_DISTANCE = 20; // px
export const SWIPE_MIN_VELOCITY = 0.4; // px/ms

export type SwipeDirection = "next" | "prev";

/** dx/dy: desplazamiento del puntero (px); dt: duración del gesto (ms). */
export function swipeDirection(dx: number, dy: number, dt: number): SwipeDirection | null {
  const distance = Math.abs(dx);
  if (distance <= Math.abs(dy)) return null;
  const isFlick = dt > 0 && distance / dt >= SWIPE_MIN_VELOCITY && distance >= SWIPE_MIN_FLICK_DISTANCE;
  if (distance < SWIPE_MIN_DISTANCE && !isFlick) return null;
  // Arrastrar hacia la izquierda trae la foto siguiente (como pasar una página).
  return dx < 0 ? "next" : "prev";
}
