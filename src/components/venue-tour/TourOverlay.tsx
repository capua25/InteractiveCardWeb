"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TourSceneId, VenueTheme } from "@/domain/venue";
import { themeToCssVars } from "@/lib/theme";
// Solo tipos y el registro: three llega recién con el import() dinámico de loadTourScene.
import { loadTourScene } from "@/tour/registry";
import type { TourController, TourView } from "@/tour/types";
import { hasWebGL } from "@/tour/webgl";
import { TourLoader } from "./TourLoader";

// Un back() pedido por un desmontaje que todavía no corrió (ver efecto de historial).
let backPending = false;

type Status = "unsupported" | "loading" | "ready" | "error";

type TourOverlayProps = { scene: TourSceneId; venueName: string; theme: VenueTheme; onClose: () => void };

const buttonClass =
  "min-h-11 min-w-11 rounded-full px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const toggleClass = (active: boolean) =>
  `${buttonClass} ${active ? "bg-primary text-white" : "bg-white/10 text-white hover:bg-white/20"}`;

export function TourOverlay({ scene, venueName, theme, onClose }: TourOverlayProps) {
  // Corre en el cliente: el overlay se monta con next/dynamic({ ssr: false }).
  const [supported] = useState(hasWebGL);
  const [status, setStatus] = useState<Status>(supported ? "loading" : "unsupported");
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<TourView>("out");
  const [roofVisible, setRoofVisible] = useState(true);
  const hostRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const controllerRef = useRef<TourController | null>(null);
  const requestClose = useEffectEvent(onClose);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Escape y la trampa de Tab escuchan en document: tocar el canvas deja el foco en
  // body, y desde ahí Tab tiene que volver al diálogo y no a la página de atrás.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
      else if (event.key === "Tab" && dialogRef.current) trapFocus(dialogRef.current, event);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Al fallar se desmontan Afuera/Adentro/Sin techo: si el foco estaba ahí (o fuera
  // del diálogo) quedaría en body, así que pasa a Cerrar.
  useEffect(() => {
    if (status !== "error") return;
    if (!dialogRef.current?.contains(document.activeElement)) closeRef.current?.focus();
  }, [status]);

  // Botón atrás de Android: una entrada propia en el historial; `popstate` cierra.
  // Al cerrar por otra vía se quita esa entrada con history.back().
  useEffect(() => {
    let closedByPopstate = false;
    const onPopState = () => {
      closedByPopstate = true;
      requestClose();
    };
    // StrictMode (dev) desmonta y vuelve a montar en el mismo tick: si el back() del
    // desmontaje sigue pendiente, se cancela y se reusa la entrada ya apilada. Así no
    // llega un popstate propio que cierre el visor ni queda historial desfasado
    // (Chrome resuelve el destino de back() al llamarlo, no al recorrerlo).
    if (backPending) backPending = false;
    else history.pushState({ venueTour: true }, "");
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (closedByPopstate) return;
      backPending = true;
      queueMicrotask(() => {
        if (!backPending) return;
        backPending = false;
        history.back();
      });
    };
  }, []);

  // Bloqueo anidado sobre el de CardShell (ya liberado: solo se abre con el sobre abierto).
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    let controller: TourController | null = null;
    const fail = () => {
      controller?.dispose();
      controller = null;
      controllerRef.current = null;
      setStatus("error");
    };
    loadTourScene(scene).then(
      (tour) => {
        // Desmontado o reintentado antes de que llegara la escena: se descarta.
        if (cancelled || !hostRef.current) return;
        try {
          controller = tour.mount(hostRef.current, {
            onContextLost: () => {
              if (!cancelled) fail();
            },
          });
        } catch {
          fail();
          return;
        }
        controllerRef.current = controller;
        setStatus("ready");
      },
      () => {
        if (!cancelled) fail();
      },
    );
    return () => {
      cancelled = true;
      controller?.dispose();
      controllerRef.current = null;
    };
  }, [scene, supported, attempt]);

  const retry = () => {
    // Reintentar desaparece al cargar: el foco no puede quedar en un nodo que se va.
    closeRef.current?.focus();
    setView("out");
    setRoofVisible(true);
    setStatus("loading");
    setAttempt((n) => n + 1);
  };

  const selectView = (next: TourView) => {
    controllerRef.current?.setView(next);
    setView(next);
  };

  const toggleRoof = () => {
    const next = !roofVisible;
    controllerRef.current?.setRoofVisible(next);
    setRoofVisible(next);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Recorrido 3D de ${venueName}`}
      style={themeToCssVars(theme)}
      ref={dialogRef}
      className="fixed inset-0 z-[60] flex flex-col bg-neutral-900 text-white"
    >
      <div className="relative z-10 flex flex-wrap items-center gap-2 p-3">
        {status === "ready" ? (
          <>
            <button type="button" aria-pressed={view === "out"} className={toggleClass(view === "out")} onClick={() => selectView("out")}>
              Afuera
            </button>
            <button type="button" aria-pressed={view === "in"} className={toggleClass(view === "in")} onClick={() => selectView("in")}>
              Adentro
            </button>
            <button type="button" aria-pressed={!roofVisible} className={toggleClass(!roofVisible)} onClick={toggleRoof}>
              {roofVisible ? "Sin techo" : "Con techo"}
            </button>
          </>
        ) : null}
        <button ref={closeRef} type="button" className={`${buttonClass} ml-auto bg-white/10 text-white hover:bg-white/20`} onClick={onClose}>
          Cerrar
        </button>
      </div>

      <div className="relative flex-1">
        {supported ? (
          <div data-testid="tour-canvas-host" aria-hidden="true" className="absolute inset-0" style={{ touchAction: "none" }} ref={hostRef} />
        ) : null}
        {status === "loading" ? (
          <TourLoader />
        ) : null}
        {status === "unsupported" ? (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center">
            Tu dispositivo no puede mostrar el recorrido 3D
          </p>
        ) : null}
        {status === "error" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p>No se pudo cargar el recorrido 3D</p>
            <button type="button" className={`${buttonClass} bg-primary text-white`} onClick={retry}>
              Reintentar
            </button>
          </div>
        ) : null}
      </div>

      {supported ? <p className="relative z-10 p-3 text-center text-sm text-white/70">Girar: arrastrá · Zoom: pellizcá · Mover: dos dedos</p> : null}
    </div>,
    document.body,
  );
}

// Tab y Shift+Tab ciclan entre los botones habilitados del diálogo; con el foco
// fuera de ellos, Tab va al primero y Shift+Tab al último.
function trapFocus(dialog: HTMLElement, event: KeyboardEvent) {
  const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
  if (buttons.length === 0) return;
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  const current = document.activeElement;
  const inside = buttons.some((button) => button === current);
  if (event.shiftKey && (current === first || !inside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (current === last || !inside)) {
    event.preventDefault();
    first.focus();
  }
}
