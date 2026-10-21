import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Bounds, MountOptions, Quality, TourController, TourScene, TourView } from "../types";
import { createCurtainRig, type FrameScheduler } from "./curtains";
import { clampTarget, resolveViewPose } from "./camera";
import { createMaterials } from "./materials";
import { mergeByMaterial } from "./merge";
import { createPrimitives } from "./primitives";
import { makeTextures, type Textures } from "./textures";

export type ViewerDeps = {
  createRenderer(quality: Quality): THREE.WebGLRenderer;
  createEnvironment(renderer: THREE.WebGLRenderer): { texture: THREE.Texture; dispose(): void };
  createTextures(maxAnisotropy: number, detail: Quality["detail"]): Textures;
  frames: FrameScheduler;
};

const defaultDeps: ViewerDeps = {
  createRenderer: (quality) => new THREE.WebGLRenderer({ antialias: quality.antialias }),
  createEnvironment: (renderer) => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    room.dispose();
    return {
      texture: target.texture,
      dispose() {
        target.dispose();
        pmrem.dispose();
      },
    };
  },
  createTextures: makeTextures,
  frames: {
    request: (cb) => requestAnimationFrame(cb),
    cancel: (id) => cancelAnimationFrame(id),
    now: () => performance.now(),
  },
};

// Recorta el target a la caja y mueve la cámara con el mismo delta: el pan se frena sin girar.
export function clampPan(target: THREE.Vector3, position: THREE.Vector3, bounds: Bounds): void {
  const [x, y, z] = clampTarget([target.x, target.y, target.z], bounds);
  const dx = x - target.x, dy = y - target.y, dz = z - target.z;
  if (dx === 0 && dy === 0 && dz === 0) return;
  target.set(x, y, z);
  position.set(position.x + dx, position.y + dy, position.z + dz);
}

// Visor con render on demand: solo se dibuja en `change` de los controles, resize, setView,
// setRoofVisible y setCurtainsOpen (que corre un rAF solo durante la animación). Sin damping.
export function createViewer(
  container: HTMLElement,
  tourScene: TourScene,
  quality: Quality,
  options: MountOptions & { deps?: Partial<ViewerDeps> },
): TourController {
  const deps: ViewerDeps = { ...defaultDeps, ...options.deps };

  const renderer = deps.createRenderer(quality);
  const canvas = renderer.domElement;
  // Lo creado durante el montaje, para deshacerlo si un paso posterior tira.
  const undo: (() => void)[] = [
    () => {
      renderer.dispose();
      renderer.forceContextLoss?.();
      canvas.remove();
    },
  ];
  try {
    return mountViewer();
  } catch (error) {
    for (const step of undo.reverse()) {
      try {
        step();
      } catch {
        // Seguir limpiando: el error que importa es el del montaje.
      }
    }
    throw error;
  }

  function mountViewer(): TourController {
    renderer.setPixelRatio(quality.pixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.touchAction = "none";
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    container.append(canvas);

    const env = deps.createEnvironment(renderer);
    undo.push(() => env.dispose());
    const textures = deps.createTextures(Math.min(quality.maxAnisotropy, renderer.capabilities.getMaxAnisotropy()), quality.detail);
    undo.push(() => {
      for (const t of Object.values(textures)) t.dispose();
    });
    const materials = createMaterials(textures, env.texture, tourScene.palette);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(tourScene.background);
    scene.fog = new THREE.Fog(tourScene.background, tourScene.fog.near, tourScene.fog.far);
    const disposeScene = () =>
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material) {
          for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            (m as THREE.MeshStandardMaterial).map?.dispose();
            m.dispose();
          }
        }
        if ((o as THREE.Light).isLight) (o as THREE.Light).dispose();
      });

    const { root, roofGroup, curtains } = tourScene.build({ materials, textures, primitives: createPrimitives(materials), detail: quality.detail });
    mergeByMaterial(root, roofGroup);
    mergeByMaterial(roofGroup);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh.userData.noShadow || Array.isArray(mesh.material)) return;
      if (mesh.material.opacity === 1) mesh.castShadow = mesh.receiveShadow = true;
    });
    scene.add(root, ...tourScene.lights(quality));
    undo.push(disposeScene);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 400);
    const controls = new OrbitControls(camera, canvas);
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.minDistance = 0.3;
    controls.maxDistance = 90;
    controls.zoomToCursor = true;

    const render = () => {
      renderer.render(scene, camera);
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      canvas.dataset.triangles = String(renderer.info.render.triangles);
    };
    const clampAndRender = () => {
      clampPan(controls.target, camera.position, tourScene.targetBounds);
      render();
    };
    // Vista pedida por última vez y si el usuario movió la cámara desde entonces.
    let currentView: TourView = "out";
    let userMoved = false;
    let ready = false; // el montaje ya hizo su setView inicial
    const onChange = () => {
      userMoved = true;
      clampAndRender();
    };
    controls.addEventListener("change", onChange);
    undo.push(() => {
      controls.removeEventListener("change", onChange);
      controls.dispose();
    });

    const onContextLost = () => options.onContextLost();
    canvas.addEventListener("webglcontextlost", onContextLost);
    undo.push(() => canvas.removeEventListener("webglcontextlost", onContextLost));

    // Salto instantáneo (también con reduced motion): sin transición de cámara.
    const setView = (view: TourView) => {
      const pose = resolveViewPose(tourScene.views, view, camera.aspect);
      camera.position.set(...pose.pos);
      controls.target.set(...pose.target);
      // update() solo emite `change` si la cámara se movió: se lo silencia y se renderiza una sola vez.
      controls.removeEventListener("change", onChange);
      controls.update();
      controls.addEventListener("change", onChange);
      currentView = view;
      userMoved = false;
      clampAndRender();
    };

    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      const aspect = w / h;
      const aspectChanged = aspect !== camera.aspect;
      renderer.setSize(w, h, false);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      // Rotar el celular (o el primer tamaño real si se montó en 0×0) cambia la distancia de
      // "out" en pantallas angostas: se reaplica mientras el usuario no haya movido la cámara.
      if (ready && aspectChanged && currentView === "out" && !userMoved) setView("out");
      else render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    undo.push(() => observer.disconnect());

    resize();
    setView("out");
    ready = true;

    // Las cortinas (noMerge) siguen en sus grupos tras el merge; el rig solo corre mientras anima.
    const rig = createCurtainRig(curtains, render, deps.frames);
    undo.push(() => rig.dispose());

    let disposed = false;
    return {
      setView,
      hasCurtains: rig.available,
      setCurtainsOpen: (open, animate) => rig.set(open, animate),
      setRoofVisible(visible) {
        roofGroup.visible = visible;
        render();
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        rig.dispose();
        observer.disconnect();
        controls.removeEventListener("change", onChange);
        controls.dispose();
        canvas.removeEventListener("webglcontextlost", onContextLost);
        disposeScene();
        for (const t of Object.values(textures)) t.dispose();
        env.dispose();
        renderer.dispose();
        renderer.forceContextLoss?.();
        canvas.remove();
      },
    };
  }
}
