import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { SceneElement } from "../types";
import { assembleElements } from "./assemble";
import { createTestEngineContext } from "./test-context";

const fake = (id: string, group?: "root" | "roof"): SceneElement<null> => ({
  id,
  group,
  build: () => Object.assign(new THREE.Group(), { name: id }),
});

describe("assembleElements", () => {
  it("agrega cada elemento registrado a root o al grupo del techo", () => {
    const { root, roofGroup } = assembleElements([fake("a"), fake("b", "roof"), fake("prueba")], {
      ...createTestEngineContext(),
      layout: null,
    });
    expect(root.children.map((c) => c.name)).toEqual(expect.arrayContaining(["a", "prueba"]));
    expect(roofGroup.children.map((c) => c.name)).toEqual(["b"]);
    expect(roofGroup.parent).toBe(root);
  });
});
