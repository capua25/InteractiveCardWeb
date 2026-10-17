"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { parallax } from "@/lib/motion";
import { useShouldAnimate } from "@/lib/use-should-animate";

type ParallaxImageProps = {
  src: string;
  alt: string;
};

// Fondo del hero: baja más lento que el scroll y se acerca de 1.1 a 1.
// Con reduced motion queda estático (MotionConfig no frena estilos ligados al scroll).
export function ParallaxImage({ src, alt }: ParallaxImageProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const shouldAnimate = useShouldAnimate();
  // Medimos un contenedor estático: el que se transforma no sirve de target.
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], parallax.yRange);
  const scale = useTransform(scrollYProgress, [0, 1], parallax.scaleRange);

  return (
    <div ref={targetRef} className="absolute inset-0">
      <motion.div
        data-testid="parallax-layer"
        className="absolute inset-0"
        style={shouldAnimate ? { y, scale } : undefined}
      >
        <Image src={src} alt={alt} fill priority sizes="100vw" className="object-cover" />
      </motion.div>
    </div>
  );
}
