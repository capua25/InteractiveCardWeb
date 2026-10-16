import { stagger, type Transition, type Variants } from "motion/react";

// Tokens de movimiento compartidos. Tono "elegante y fluido": springs con
// amortiguamiento crítico (ζ = damping / (2·√(stiffness·mass)) ≈ 1), así que
// nada rebota ni se pasa del valor final.

// Entradas: ζ = 22 / (2·√120) ≈ 1.00. Asienta (1 %) en ~0.6 s, con inercia suave.
export const entranceSpring: Transition = { type: "spring", stiffness: 120, damping: 22, mass: 1 };

// Hover/tap: ζ = 40 / (2·√400) = 1.00. Respuesta corta (~0.3 s), sin rebote.
export const uiSpring: Transition = { type: "spring", stiffness: 400, damping: 40, mass: 1 };

// Solapa del sobre: algo más firme que la entrada. ζ = 26 / (2·√169) = 1.00.
export const flapSpring: Transition = { type: "spring", stiffness: 169, damping: 26, mass: 1 };

export const STAGGER_INTERVAL = 0.08;
export const REVEAL_OFFSET_Y = 32;

export const revealContainer: Variants = {
  hidden: {},
  visible: { transition: { delayChildren: stagger(STAGGER_INTERVAL) } },
};

export const revealItem: Variants = {
  hidden: { opacity: 0, y: REVEAL_OFFSET_Y },
  visible: { opacity: 1, y: 0, transition: entranceSpring },
};

// Tarjetas: elevación sutil al hover y leve hundimiento al tap.
export const cardHover = { y: -4, transition: uiSpring };
export const cardTap = { scale: 0.98, transition: uiSpring };

// Viewport común de los reveals: una sola vez, con el 20 % del bloque visible.
export const revealViewport = { once: true, amount: 0.2 } as const;

// Sobre en reposo: flota ±6 px y gira menos de 1° en un ciclo de 4 s.
const IDLE_CYCLE = 4;
export const envelopeIdle = {
  animate: { y: [0, -6, 0, 6, 0], rotate: [0, -0.6, 0, 0.6, 0] },
  transition: { duration: IDLE_CYCLE, ease: "easeInOut", repeat: Infinity },
} satisfies { animate: object; transition: Transition };

// Pulso suave de la leyenda "tocá para abrir".
export const hintPulse = {
  animate: { opacity: [1, 0.55, 1] },
  transition: { duration: IDLE_CYCLE / 2, ease: "easeInOut", repeat: Infinity },
} satisfies { animate: object; transition: Transition };

// Secuencia de apertura (~1.2 s): solapa → carta asoma → el sobre se achica y se desvanece.
// El colapso final es un tween sincronizado con el fundido: la cola de un spring
// retrasaría el fin del exit (y con él la entrada del contenido).
export const envelopeOpening = {
  hintFade: 0.25,
  letterDelay: 0.3,
  letterRise: "-38%",
  collapseScale: 0.9,
  fadeDelay: 0.75,
  fadeDuration: 0.45,
} as const;

export const envelopeCollapse: Transition = {
  duration: envelopeOpening.fadeDuration,
  delay: envelopeOpening.fadeDelay,
  ease: "easeOut",
};

// Botón flotante: entra con spring y dispara un único anillo de atención.
export const floatingEnter: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: { opacity: 1, scale: 1, transition: entranceSpring },
};

export const attentionRing: Variants = {
  hidden: { opacity: 0, scale: 1 },
  visible: {
    opacity: [0.6, 0],
    scale: [1, 1.8],
    transition: { duration: 1.2, delay: 0.35, ease: "easeOut" },
  },
};

// Hero: el fondo baja al 70 % de la velocidad del scroll y pasa de 1.1 a 1.
export const parallax: { yRange: string[]; scaleRange: number[] } = { yRange: ["0%", "30%"], scaleRange: [1.1, 1] };

// Lightbox: fundido del fondo.
export const backdropFade: Transition = { duration: 0.25, ease: "easeOut" };
