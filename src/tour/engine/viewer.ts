import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Bounds, MountOptions, Quality, TourController, TourScene, TourView } from "../types";
import { clampTarget, resolveViewPose } from "./camera";
import { createMaterials } from "./materials";
import { mergeByMaterial } from "./merge";
import { createPrimitives } from "./primitives";
import { makeTextures, type Textures } from "./textures";

export type ViewerDeps = {
  createRenderer(quality: Quality): THREE.WebGLRenderer;
  createEnvironment(renderer: THREE.WebGLRenderer): { texture: THREE.Texture; dispose(): void };
  createTextures(maxAnisotropy: number): Textures;
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
};

// Recorta el target a la caja y mueve la cámara con el mismo delta: el pan se frena sin girar.
export function clampPan(target: THREE.Vector3, position: THREE.Vector3, bounds: Bounds): void {
  const [x, y, z] = clampTarget([target.x, target.y, target.z], bounds);
  const dx = x - target.x, dy = y - target.y, dz = z - target.z;
  if (dx === 0 && dy === 0 && dz === 0) return;
  target.set(x, y, z);
  position.set(position.x + dx, position.y + dy, position.z + dz);
}

// Visor con render on demand: solo se dibuja en `change` de los controles, resize, setView y
// setRoofVisible. Sin loop de requestAnimationFrame ni damping.
export function createViewer(
  container: HTMLElement,
  tourScene: TourScene,
  quality: Quality,
  options: MountOptions & { deps?: Partial<ViewerDeps> },
): TourController {
  const deps: ViewerDeps = { ...defaultDeps, ...options.deps };

  const renderer = deps.createRenderer(quality);
  renderer.setPixelRatio(quality.pixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.touchAction = "none";
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.append(canvas);

  const env = deps.createEnvironment(renderer);
  const textures = deps.createTextures(Math.min(quality.maxAnisotropy, renderer.capabilities.getMaxAnisotropy()));
  const materials = createMaterials(textures, env.texture, tourScene.palette);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(tourScene.background);
  scene.fog = new THREE.Fog(tourScene.background, tourScene.fog.near, tourScene.fog.far);

  const { root, roofGroup } = tourScene.build({ materials, textures, primitives: createPrimitives(materials) });
  mergeByMaterial(root, roofGroup);
  mergeByMaterial(roofGroup);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData.noShadow || Array.isArray(mesh.material)) return;
    if (mesh.material.opacity === 1) mesh.castShadow = mesh.receiveShadow = true;
  });
  scene.add(root, ...tourScene.lights(quality));

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 400);
  const controls = new OrbitControls(camera, canvas);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 0.3;
  controls.maxDistance = 90;
  controls.zoomToCursor = true;

  const render = () => {
    renderer.render(scene, camera);
    canvas.dataset.drawCalls = String(renderer.info.render.calls);
  };
  const onChange = () => {
    clampPan(controls.target, camera.position, tourScene.targetBounds);
    render();
  };
  controls.addEventListener("change", onChange);

  const onContextLost = () => options.onContextLost();
  canvas.addEventListener("webglcontextlost", onContextLost);

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  // Salto instantáneo (también con reduced motion): sin transición de cámara.
  const setView = (view: TourView) => {
    const pose = resolveViewPose(tourScene.views, view, camera.aspect);
    camera.position.set(...pose.pos);
    controls.target.set(...pose.target);
    // update() solo emite `change` si la cámara se movió: se lo silencia y se renderiza una sola vez.
    controls.removeEventListener("change", onChange);
    controls.update();
    controls.addEventListener("change", onChange);
    onChange();
  };

  resize();
  setView("out");

  let disposed = false;
  return {
    setView,
    setRoofVisible(visible) {
      roofGroup.visible = visible;
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      controls.removeEventListener("change", onChange);
      controls.dispose();
      canvas.removeEventListener("webglcontextlost", onContextLost);
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
      for (const t of Object.values(textures)) t.dispose();
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
