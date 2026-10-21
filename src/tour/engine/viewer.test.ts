import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Quality, TourScene } from "../types";
import type { TextureKey, Textures } from "./textures";
import { clampPan, createViewer, type ViewerDeps } from "./viewer";

const KEYS: TextureKey[] = [
  "stone", "ceiling", "wood", "roof", "gravel",
  "plaster", "wallLow", "cement", "grass", "carpet",
];

const quality: Quality = { pixelRatio: 1.5, shadowMapSize: 1024, antialias: true, maxAnisotropy: 4 };

function fakeRenderer() {
  return {
    domElement: document.createElement("canvas"),
    render: vi.fn(),
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    dispose: vi.fn(),
    forceContextLoss: vi.fn(),
    capabilities: { getMaxAnisotropy: () => 16 },
    info: { render: { calls: 42 } },
    shadowMap: {} as Record<string, unknown>,
  };
}

let renderer: ReturnType<typeof fakeRenderer>;
let env: { texture: THREE.Texture; dispose: ReturnType<typeof vi.fn<() => void>> };
let createTextures: ReturnType<typeof vi.fn<(maxAnisotropy: number) => Textures>>;
let deps: Partial<ViewerDeps>;
let container: HTMLDivElement;
let rootMesh: THREE.Mesh;
let roofMesh: THREE.Mesh;
let scene: TourScene & { lights: ReturnType<typeof vi.fn<TourScene["lights"]>> };
let onContextLost: ReturnType<typeof vi.fn<() => void>>;
let observer: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };
let resizeCallback: ResizeObserverCallback;

function setSize(el: HTMLElement, w: number, h: number) {
  Object.defineProperty(el, "clientWidth", { configurable: true, value: w });
  Object.defineProperty(el, "clientHeight", { configurable: true, value: h });
}

function lastRenderedCamera(): THREE.PerspectiveCamera {
  return renderer.render.mock.calls.at(-1)![1] as THREE.PerspectiveCamera;
}

beforeEach(() => {
  renderer = fakeRenderer();
  env = { texture: new THREE.Texture(), dispose: vi.fn<() => void>() };
  createTextures = vi.fn<(maxAnisotropy: number) => Textures>(() => Object.fromEntries(KEYS.map((k) => [k, new THREE.Texture()])) as Textures);
  deps = {
    createRenderer: () => renderer as unknown as THREE.WebGLRenderer,
    createEnvironment: () => env,
    createTextures,
  };
  container = document.createElement("div");
  document.body.append(container);
  rootMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  roofMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  scene = {
    palette: { roof: "#3b4f66" },
    build: () => {
      const root = new THREE.Group();
      const roofGroup = new THREE.Group();
      root.add(roofGroup, rootMesh);
      roofGroup.add(roofMesh);
      return { root, roofGroup };
    },
    lights: vi.fn<TourScene["lights"]>(() => [new THREE.HemisphereLight()]),
    views: {
      out: { pos: [19, 10, 23], target: [-1, 2.5, 0] },
      in: { pos: [-11.2, 1.75, 0], target: [-4, 1.5, 0] },
    },
    background: "#e7a77a",
    fog: { near: 60, far: 170 },
    targetBounds: { min: [-30, 0, -30], max: [30, 6, 30] },
  };
  onContextLost = vi.fn<() => void>();
  observer = { observe: vi.fn(), disconnect: vi.fn() };
  vi.stubGlobal(
    "ResizeObserver",
    vi.fn(function (cb: ResizeObserverCallback) {
      resizeCallback = cb;
      return observer;
    }),
  );
});

afterEach(() => {
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createViewer", () => {
  it("renderiza al crear, marca draw calls y no deja un loop de requestAnimationFrame", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame");
    createViewer(container, scene, quality, { onContextLost, deps });
    expect(renderer.render).toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();
    const canvas = container.querySelector("canvas");
    expect(canvas?.dataset.drawCalls).toBe("42");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas!.style.touchAction).toBe("none");
  });

  it("aplica pixel ratio y tamaño de sombra de la calidad", () => {
    createViewer(container, scene, quality, { onContextLost, deps });
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(1.5);
    expect(scene.lights).toHaveBeenCalledWith(quality);
    expect(renderer.shadowMap.enabled).toBe(true);
    // three 0.186 eliminó PCFSoftShadowMap (cae a PCF con un warning en consola).
    expect(renderer.shadowMap.type).toBe(THREE.PCFShadowMap);
  });

  it("cruza la anisotropía de la calidad con la de la GPU", () => {
    createViewer(container, scene, quality, { onContextLost, deps });
    expect(createTextures).toHaveBeenCalledWith(4);
  });

  it("estado inicial: vista Afuera y techo visible", () => {
    setSize(container, 800, 600);
    createViewer(container, scene, quality, { onContextLost, deps });
    const cam = lastRenderedCamera();
    expect(cam.aspect).toBeCloseTo(800 / 600, 6);
    expect(cam.position.x).toBeCloseTo(19, 4);
    expect(cam.position.y).toBeCloseTo(10, 4);
    expect(cam.position.z).toBeCloseTo(23, 4);
    expect(roofMesh.parent!.visible).toBe(true);
  });

  it("setRoofVisible oculta el grupo del techo y renderiza una vez", () => {
    const c = createViewer(container, scene, quality, { onContextLost, deps });
    renderer.render.mockClear();
    c.setRoofVisible(false);
    expect(roofMesh.parent!.visible).toBe(false);
    expect(renderer.render).toHaveBeenCalledTimes(1);
  });

  it("setView('in') lleva cámara y target a la vista Adentro", () => {
    const c = createViewer(container, scene, quality, { onContextLost, deps });
    renderer.render.mockClear();
    c.setView("in");
    expect(renderer.render).toHaveBeenCalled();
    const cam = lastRenderedCamera();
    expect(cam.position.x).toBeCloseTo(-11.2, 4);
    expect(cam.position.y).toBeCloseTo(1.75, 4);
    expect(cam.position.z).toBeCloseTo(0, 4);
    const dir = cam.getWorldDirection(new THREE.Vector3());
    const toTarget = new THREE.Vector3(-4, 1.5, 0).sub(cam.position).normalize();
    expect(dir.dot(toTarget)).toBeCloseTo(1, 4);
  });

  it("el ResizeObserver ajusta tamaño y aspecto y renderiza", () => {
    createViewer(container, scene, quality, { onContextLost, deps });
    expect(observer.observe).toHaveBeenCalledWith(container);
    renderer.render.mockClear();
    setSize(container, 400, 800);
    resizeCallback([], observer as unknown as ResizeObserver);
    expect(renderer.setSize).toHaveBeenCalledWith(400, 800, false);
    const cam = lastRenderedCamera();
    expect(cam.aspect).toBe(0.5);
    expect(renderer.render).toHaveBeenCalledTimes(1);
  });

  it("dispose libera GPU, controles, observer y quita el canvas", () => {
    const geoDispose = vi.spyOn(rootMesh.geometry, "dispose");
    const matDispose = vi.spyOn(rootMesh.material as THREE.Material, "dispose");
    const c = createViewer(container, scene, quality, { onContextLost, deps });
    c.dispose();
    expect(geoDispose).toHaveBeenCalled();
    expect(matDispose).toHaveBeenCalled();
    expect(env.dispose).toHaveBeenCalled();
    expect(renderer.dispose).toHaveBeenCalled();
    expect(renderer.forceContextLoss).toHaveBeenCalled();
    expect(observer.disconnect).toHaveBeenCalled();
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("webglcontextlost en el canvas avisa con onContextLost", () => {
    createViewer(container, scene, quality, { onContextLost, deps });
    container.querySelector("canvas")!.dispatchEvent(new Event("webglcontextlost"));
    expect(onContextLost).toHaveBeenCalledTimes(1);
  });

  it("después de dispose ya no escucha webglcontextlost", () => {
    const c = createViewer(container, scene, quality, { onContextLost, deps });
    const canvas = container.querySelector("canvas")!;
    c.dispose();
    canvas.dispatchEvent(new Event("webglcontextlost"));
    expect(onContextLost).not.toHaveBeenCalled();
  });
});

describe("createViewer si el montaje tira", () => {
  it("con un paso que tira (texturas) libera el renderer, quita el canvas y re-lanza", () => {
    createTextures.mockImplementation(() => {
      throw new Error("texturas");
    });
    expect(() => createViewer(container, scene, quality, { onContextLost, deps })).toThrow("texturas");
    expect(container.querySelector("canvas")).toBeNull();
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1);
    expect(env.dispose).toHaveBeenCalledTimes(1);
  });

  it("si tira el build de la escena también libera las texturas", () => {
    const textures = Object.fromEntries(KEYS.map((k) => [k, new THREE.Texture()])) as Textures;
    const texDispose = vi.spyOn(textures.stone, "dispose");
    createTextures.mockReturnValue(textures);
    scene.build = () => {
      throw new Error("build");
    };
    expect(() => createViewer(container, scene, quality, { onContextLost, deps })).toThrow("build");
    expect(container.querySelector("canvas")).toBeNull();
    expect(texDispose).toHaveBeenCalled();
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });

  it("si tira después de crear controles y observer, los desconecta", () => {
    renderer.render.mockImplementation(() => {
      throw new Error("render");
    });
    expect(() => createViewer(container, scene, quality, { onContextLost, deps })).toThrow("render");
    expect(observer.disconnect).toHaveBeenCalled();
    expect(container.querySelector("canvas")).toBeNull();
    expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1);
  });

  it("sin forceContextLoss en el renderer igual limpia", () => {
    const r = renderer as Partial<ReturnType<typeof fakeRenderer>>;
    delete r.forceContextLoss;
    createTextures.mockImplementation(() => {
      throw new Error("texturas");
    });
    expect(() => createViewer(container, scene, quality, { onContextLost, deps })).toThrow("texturas");
    expect(container.querySelector("canvas")).toBeNull();
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });
});

describe("createViewer al cambiar el aspecto", () => {
  const OUT_WIDE = [19, 10, 23];
  // Vista angosta: ×1,5 desde el target (-1, 2.5, 0).
  const OUT_NARROW = [29, 13.75, 34.5];
  const expectPos = (pos: number[]) => {
    const cam = lastRenderedCamera();
    expect(cam.position.x).toBeCloseTo(pos[0], 4);
    expect(cam.position.y).toBeCloseTo(pos[1], 4);
    expect(cam.position.z).toBeCloseTo(pos[2], 4);
  };
  const resizeTo = (w: number, h: number) => {
    setSize(container, w, h);
    resizeCallback([], observer as unknown as ResizeObserver);
  };

  it("montado en un contenedor 0×0, el primer tamaño real recalcula la vista Afuera", () => {
    setSize(container, 0, 0);
    createViewer(container, scene, quality, { onContextLost, deps });
    resizeTo(800, 600);
    expectPos(OUT_WIDE);
  });

  it("rotar el celular en Afuera sin tocar la cámara recalcula la distancia", () => {
    setSize(container, 400, 800);
    createViewer(container, scene, quality, { onContextLost, deps });
    expectPos(OUT_NARROW);
    resizeTo(800, 400);
    expectPos(OUT_WIDE);
    resizeTo(400, 800);
    expectPos(OUT_NARROW);
  });

  it("si el usuario movió la cámara, rotar no la pisa", () => {
    setSize(container, 400, 800);
    createViewer(container, scene, quality, { onContextLost, deps });
    const canvas = container.querySelector("canvas")!;
    // jsdom no tiene layout: el zoom al cursor necesita el rect del canvas.
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 400, 800));
    canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, clientX: 200, clientY: 400, cancelable: true }));
    const moved = lastRenderedCamera().position.clone();
    expect(moved.distanceTo(new THREE.Vector3(...OUT_NARROW))).toBeGreaterThan(0.01);
    resizeTo(800, 400);
    expectPos(moved.toArray());
  });

  it("en Adentro rotar no cambia la pose", () => {
    setSize(container, 400, 800);
    const c = createViewer(container, scene, quality, { onContextLost, deps });
    c.setView("in");
    resizeTo(800, 400);
    expectPos([-11.2, 1.75, 0]);
  });

  it("un resize sin cambio de aspecto no reubica la cámara", () => {
    setSize(container, 400, 800);
    const c = createViewer(container, scene, quality, { onContextLost, deps });
    c.setView("out");
    renderer.render.mockClear();
    resizeTo(400, 800);
    expect(renderer.render).toHaveBeenCalledTimes(1);
    expectPos(OUT_NARROW);
  });
});

describe("clampPan", () => {
  const bounds = { min: [-2, 0, -2], max: [2, 3, 2] } as const;

  it("recorta el target a la caja y corre la cámara con el mismo delta", () => {
    const target = new THREE.Vector3(10, 2.5, -5);
    const position = new THREE.Vector3(20, 5, 0);
    clampPan(target, position, bounds);
    expect(target.toArray()).toEqual([2, 2.5, -2]);
    expect(position.toArray()).toEqual([12, 5, 3]);
  });

  it("no toca nada si el target ya está dentro", () => {
    const target = new THREE.Vector3(1, 1, 1);
    const position = new THREE.Vector3(5, 5, 5);
    clampPan(target, position, bounds);
    expect(target.toArray()).toEqual([1, 1, 1]);
    expect(position.toArray()).toEqual([5, 5, 5]);
  });
});
