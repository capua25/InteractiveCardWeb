import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createTestEngineContext } from "@/tour/engine/test-context";
import { BARBATOS_DIMENSIONS } from "../dimensions";
import { BARBATOS_LAYOUT, computeLayout } from "../layout";
import { ELEMENTS } from "./index";

const ctx = { ...createTestEngineContext(), layout: BARBATOS_LAYOUT };

describe("ELEMENTS de Barbato's", () => {
  it("los ids de ELEMENTS son únicos", () => {
    const ids = ELEMENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("registra los elementos del v6 en orden", () => {
    expect(ELEMENTS.map((e) => e.id)).toEqual([
      "ground", "patio", "front-wall", "back-wall", "gables", "plinth", "floor", "chimney", "trusses",
      "roof", "annex", "annex-roof", "pergola", "gallery", "gallery-roof", "park", "garland", "tables",
    ]);
  });

  it("solo roof, annex-roof y gallery-roof se ocultan con Sin techo", () => {
    expect(ELEMENTS.filter((e) => e.group === "roof").map((e) => e.id)).toEqual(["roof", "annex-roof", "gallery-roof"]);
  });

  it.each(ELEMENTS.map((e) => [e.id, e] as const))("%s construye un Object3D con la layout por defecto", (_id, element) => {
    expect(element.build(ctx)).toBeInstanceOf(THREE.Object3D);
  });

  it("tables instancia 60 sillas (asiento y respaldo) y no crea un mesh por silla", () => {
    const obj = ELEMENTS.find((e) => e.id === "tables")!.build(ctx);
    const instanced: THREE.InstancedMesh[] = [];
    let plain = 0;
    obj.traverse((o) => {
      if ((o as THREE.InstancedMesh).isInstancedMesh) instanced.push(o as THREE.InstancedMesh);
      else if ((o as THREE.Mesh).isMesh) plain++;
    });
    expect(instanced.filter((m) => m.material === ctx.materials("chair")).map((m) => m.count)).toEqual([60, 60]);
    expect(plain).toBe(0);
  });

  it("el caño de la chimenea está en la x del bloque de piedra", () => {
    const meshes: THREE.Mesh[] = [];
    ELEMENTS.find((e) => e.id === "chimney")!.build(ctx).traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
    });
    expect(
      meshes
        .filter((m) => m.material === ctx.materials("metal"))
        .every((m) => Math.abs(m.position.x - BARBATOS_LAYOUT.chimney.flue.x) < 1e-6),
    ).toBe(true);
  });

  it("la galería sigue a postInset, postHeight y sconceHeight editados", () => {
    const d = structuredClone(BARBATOS_DIMENSIONS);
    d.gallery.postInset = 0.4;
    d.gallery.postHeight = 3.6;
    d.backWindows.sconceHeight = 3.1;
    const layout = computeLayout(d);
    const edited = { ...ctx, layout };
    const meshes = (id: string) => {
      const out: THREE.Mesh[] = [];
      ELEMENTS.find((e) => e.id === id)!.build(edited).traverse((o) => {
        if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh);
      });
      return out;
    };
    const size = (m: THREE.Mesh) => {
      m.geometry.computeBoundingBox();
      return m.geometry.boundingBox!.getSize(new THREE.Vector3());
    };
    const gallery = meshes("gallery");
    const floor = gallery.find((m) => m.material === ctx.materials("cement"))!;
    expect(size(floor).z).toBeCloseTo(d.gallery.depth, 5);
    expect(floor.position.z + size(floor).z / 2).toBeCloseTo(layout.gallery.zInner, 5);
    const sconces = gallery.filter((m) => m.material === ctx.materials("sconce"));
    expect(sconces).toHaveLength(layout.backSconcesX.length);
    expect(sconces.every((m) => m.position.y === 3.1)).toBe(true);
    const posts = gallery.filter((m) => m.material === ctx.materials("metal") && Math.abs(size(m).x - 0.12) < 1e-5);
    expect(posts).toHaveLength(layout.gallery.postsX.length);
    expect(posts.every((m) => Math.abs(size(m).y - 3.6) < 1e-5)).toBe(true);
    const [roof] = meshes("gallery-roof");
    expect(roof.position.y).toBeCloseTo(3.6 + 0.05, 6);
  });
});
