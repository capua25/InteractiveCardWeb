import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createTestEngineContext } from "@/tour/engine/test-context";
import { BARBATOS_LAYOUT } from "../layout";
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
});
