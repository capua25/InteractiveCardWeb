import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createTestEngineContext } from "@/tour/engine/test-context";
import { BARBATOS_DIMENSIONS } from "../dimensions";
import { BARBATOS_LAYOUT, computeLayout } from "../layout";
import { CURTAIN_ROLLED_SCALE } from "@/tour/engine/curtains";
import { ELEMENTS } from "./index";

const ctx = { ...createTestEngineContext(), layout: BARBATOS_LAYOUT };

describe("ELEMENTS de Barbato's", () => {
  it("los ids de ELEMENTS son únicos", () => {
    const ids = ELEMENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("registra los elementos del v6 en orden", () => {
    expect(ELEMENTS.map((e) => e.id)).toEqual([
      "ground", "patio", "front-wall", "back-wall", "gables", "plinth", "floor", "chimney", "ac-units", "trusses",
      "roof", "annex", "annex-roof", "pergola", "gallery", "gallery-roof", "gallery-curtains", "park", "fire-pit", "garland", "tables",
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

  const meshesOf = (id: string) => {
    const out: THREE.Mesh[] = [];
    ELEMENTS.find((e) => e.id === id)!.build(ctx).traverse((o) => {
      if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh);
    });
    return out;
  };

  it("el caño arranca sobre el bloque exterior", () => {
    const { stack, flue } = BARBATOS_LAYOUT.chimney;
    const meshes = meshesOf("chimney");
    const metal = meshes.filter((m) => m.material === ctx.materials("metal"));
    expect(metal.filter((m) => Math.abs(m.position.x - flue.x) < 1e-6).length).toBeGreaterThanOrEqual(2);
    expect(meshes.some((m) => m.material === ctx.materials("stone") && Math.abs(m.position.x - stack.x) < 1e-6)).toBe(true);
    expect(metal.every((m) => m.position.x >= BARBATOS_LAYOUT.hall.hx)).toBe(true);
  });

  it("ac-units arma 2 equipos, cada uno sobre su losa", () => {
    const meshes = meshesOf("ac-units");
    expect(meshes.filter((m) => m.material === ctx.materials("acWhite"))).toHaveLength(2);
    expect(meshes.filter((m) => m.material === ctx.materials("cement"))).toHaveLength(2);
  });

  it("los faldones vuelan 0.05 en los hastiales", () => {
    const sheets = meshesOf("roof").filter((m) => m.material === ctx.materials("roof"));
    expect(sheets).toHaveLength(2);
    for (const m of sheets) {
      const size = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
      expect(size.x).toBeCloseTo(2 * BARBATOS_LAYOUT.hall.hx + 0.1, 4);
    }
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
    const bodies = gallery.filter((m) => m.material === ctx.materials("metal") && Math.abs(size(m).x - 0.1) < 1e-5 && Math.abs(size(m).y - 0.1) < 1e-5);
    expect(bodies).toHaveLength(layout.backSconcesX.length);
    expect(bodies.every((m) => m.position.y === 3.1)).toBe(true);
    const posts = gallery.filter((m) => m.material === ctx.materials("metal") && Math.abs(size(m).x - 0.12) < 1e-5);
    expect(posts).toHaveLength(layout.gallery.postsX.length);
    expect(posts.every((m) => Math.abs(size(m).y - 3.6) < 1e-5)).toBe(true);
    const [roof] = meshes("gallery-roof");
    expect(roof.position.y).toBeCloseTo(3.6 + 0.05, 6);
  });

  it("la viga de la galería tiene 0.3 de alto", () => {
    const g = BARBATOS_LAYOUT.gallery;
    const beam = meshesOf("gallery").find((m) => {
      m.geometry.computeBoundingBox();
      return m.material === ctx.materials("metal") && m.geometry.boundingBox!.getSize(new THREE.Vector3()).x > 17;
    })!;
    const size = beam.geometry.boundingBox!.getSize(new THREE.Vector3());
    expect(size.y).toBeCloseTo(0.3, 6);
    expect(size.z).toBeCloseTo(0.16, 6);
    expect(beam.position.y).toBeCloseTo(g.postHeight - 0.15, 6);
  });

  it("hay un rollo de lona por tramo, sobre el nivel de la cortina", () => {
    const { bays, z, topY, rollRadius } = BARBATOS_LAYOUT.gallery.curtains;
    const rolls = meshesOf("gallery").filter((m) => m.material === ctx.materials("canvas"));
    expect(rolls).toHaveLength(bays.length);
    rolls.forEach((r, i) => {
      expect(r.position.x).toBeCloseTo((bays[i].x0 + bays[i].x1) / 2, 6);
      expect(r.position.y).toBeCloseTo(topY - rollRadius, 6);
      expect(r.position.z).toBeCloseTo(z, 6);
    });
  });

  it("las cortinas son 2 meshes (nylon y lona) y arrancan enrolladas", () => {
    const obj = ELEMENTS.find((e) => e.id === "gallery-curtains")!.build(ctx);
    const { topY, rollRadius, skirtHeight } = BARBATOS_LAYOUT.gallery.curtains;
    expect(ELEMENTS.find((e) => e.id === "gallery-curtains")!.animates).toBe("curtains");
    expect(obj.scale.y).toBe(CURTAIN_ROLLED_SCALE);
    expect(obj.userData.noMerge).toBe(true);
    expect(obj.position.y).toBeCloseTo(topY - rollRadius, 6);
    const meshes: THREE.Mesh[] = [];
    obj.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    expect(meshes).toHaveLength(2);
    const nylon = meshes.filter((m) => m.material === ctx.materials("nylon"));
    const canvas = meshes.filter((m) => m.material === ctx.materials("canvas"));
    expect(nylon).toHaveLength(1);
    expect(canvas).toHaveLength(1);
    expect(meshes.every((m) => m.userData.noShadow === true)).toBe(true);
    nylon[0].geometry.computeBoundingBox();
    const bb = nylon[0].geometry.boundingBox!;
    expect(bb.max.y).toBeCloseTo(0, 6);
    expect(bb.min.y).toBeCloseTo(-(topY - rollRadius - skirtHeight), 6);
    expect(bb.getSize(new THREE.Vector3()).x).toBeCloseTo(18 - 0.04, 4); // 6 tramos de (tramo - 0.04)
    canvas[0].geometry.computeBoundingBox();
    expect(canvas[0].geometry.boundingBox!.max.y).toBeCloseTo(-(topY - rollRadius - skirtHeight), 6);
    expect(canvas[0].geometry.boundingBox!.min.y).toBeCloseTo(-(topY - rollRadius), 6);
  });

  describe("park y suelo", () => {
    const l = BARBATOS_LAYOUT.lot;
    const bbox = (m: THREE.Mesh) => {
      m.geometry.computeBoundingBox();
      return m.geometry.boundingBox!;
    };
    // sin mergear: el id "park" construye los meshes sueltos
    const parkMeshes = () => {
      const out: THREE.Mesh[] = [];
      ELEMENTS.find((e) => e.id === "park")!.build(ctx).traverse((o) => {
        if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh);
      });
      return out;
    };
    const walls = () => parkMeshes().filter((m) => m.material === ctx.materials("wallLow"));

    it("park levanta los 4 muros (2 m lados y fondo, 1.5 m frente) con la entrada abierta", () => {
      const w = walls();
      expect(w).toHaveLength(5);
      for (const m of w) {
        const isFront = Math.abs(m.position.z - l.zFront) < 1e-6;
        expect(bbox(m).getSize(new THREE.Vector3()).y).toBeCloseTo(isFront ? 1.5 : 2, 5);
      }
      const sides = w.filter((m) => Math.abs(Math.abs(m.position.x) - l.halfWidth) < 1e-6);
      expect(sides).toHaveLength(2);
      for (const m of sides) expect(bbox(m).getSize(new THREE.Vector3()).z).toBeCloseTo(60, 5);
      const front = w.filter((m) => Math.abs(m.position.z - l.zFront) < 1e-6);
      expect(front).toHaveLength(2);
      for (const m of front) {
        const half = bbox(m).getSize(new THREE.Vector3()).x / 2;
        const [a, b] = [m.position.x - half, m.position.x + half];
        expect(b <= l.entrance.x0 + 1e-6 || a >= l.entrance.x1 - 1e-6).toBe(true);
      }
    });

    it("dos pilares de piedra 0.55×0.55×1.9 flanquean la entrada, con hiladas de ladrillo", () => {
      const pillars = parkMeshes().filter((m) => m.material === ctx.materials("stone"));
      expect(pillars).toHaveLength(2);
      for (const m of pillars) {
        const s = bbox(m).getSize(new THREE.Vector3());
        expect([s.x, s.y, s.z].map((v) => +v.toFixed(5))).toEqual([0.55, 1.9, 0.55]);
        expect(Math.abs(m.position.x - (l.entrance.x0 + l.entrance.x1) / 2)).toBeGreaterThan((l.entrance.x1 - l.entrance.x0) / 2);
      }
      expect(parkMeshes().filter((m) => m.material === ctx.materials("plaster"))).toHaveLength(6);
    });

    it("el suelo mide 160 y se centra en el lote", () => {
      const g = ELEMENTS.find((e) => e.id === "ground")!.build(ctx) as THREE.Mesh;
      const s = bbox(g).getSize(new THREE.Vector3());
      expect(s.x).toBe(160);
      expect(s.y).toBe(160);
      expect(g.position.z).toBeCloseTo(l.centerZ, 5);
    });
  });

  describe("fogón", () => {
    const pit = () => {
      const out: THREE.Mesh[] = [];
      ELEMENTS.find((e) => e.id === "fire-pit")!.build(ctx).traverse((o) => {
        if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh);
      });
      return out;
    };
    it("fire-pit: aro de piedra de ⌀2.4 y arena hexagonal sin sombra", () => {
      const ring = pit().filter((m) => m.material === ctx.materials("stone"));
      expect(ring).toHaveLength(1);
      ring[0].geometry.computeBoundingBox();
      expect(ring[0].geometry.boundingBox!.getSize(new THREE.Vector3()).x).toBeCloseTo(2.4, 2);
      const sand = pit().filter((m) => m.material === ctx.materials("sand"));
      expect(sand).toHaveLength(1);
      expect((sand[0].geometry as THREE.CircleGeometry).parameters.segments).toBe(6);
      expect((sand[0].geometry as THREE.CircleGeometry).parameters.radius).toBe(3.5);
      expect(sand[0].userData.noShadow).toBe(true);
    });
    it("fire-pit: disco de brasa, canasto abierto, 4 leños y brasas sin sombra", () => {
      const ms = pit();
      const of = (k: string) => ms.filter((m) => m.material === ctx.materials(k as never));
      expect(of("hearth")).toHaveLength(1);
      expect(of("hearth")[0].userData.noShadow).toBe(true);
      expect(of("wood")).toHaveLength(4);
      expect(of("fire")).toHaveLength(1);
      expect(of("fire")[0].userData.noShadow).toBe(true);
      const basket = of("metal");
      expect(basket).toHaveLength(1);
      expect((basket[0].geometry as THREE.CylinderGeometry).parameters.openEnded).toBe(true);
    });
  });

  describe("guirnalda", () => {
    const build = () => ELEMENTS.find((e) => e.id === "garland")!.build(ctx);
    const bulbMesh = () => {
      let found: THREE.InstancedMesh | undefined;
      build().traverse((o) => {
        if ((o as THREE.InstancedMesh).isInstancedMesh && (o as THREE.InstancedMesh).material === ctx.materials("bulb")) found = o as THREE.InstancedMesh;
      });
      return found!;
    };
    const bulbPositions = () => {
      const m = bulbMesh();
      const mat = new THREE.Matrix4();
      return Array.from({ length: m.count }, (_, i) => new THREE.Vector3().setFromMatrixPosition(m.getMatrixAt(i, mat)));
    };
    it("guirnalda: 6 postes de 2.8, 54 bombitas y nada hacia la galería", () => {
      const poles: THREE.Mesh[] = [];
      build().traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh && m.geometry instanceof THREE.CylinderGeometry) poles.push(m);
      });
      expect(poles).toHaveLength(6);
      for (const p of poles) expect((p.geometry as THREE.CylinderGeometry).parameters.height).toBe(2.8);
      const f = BARBATOS_LAYOUT.firePit;
      const bulbs = bulbPositions();
      expect(bulbMesh().count).toBe(54);
      for (const b of bulbs) expect(Math.hypot(b.x - f.x, b.z - f.z)).toBeLessThanOrEqual(3.5 + 1e-6);
      expect(Math.min(...bulbs.map((b) => b.y))).toBeGreaterThanOrEqual(2.2);
    });
    it("cada tramo une vértices adyacentes", () => {
      const bulbs = bulbPositions();
      BARBATOS_LAYOUT.park.garland.poles.forEach((p, k) => {
        expect(bulbs[k * 9].x).toBeCloseTo(p.x, 4);
        expect(bulbs[k * 9].z).toBeCloseTo(p.z, 4);
      });
    });
  });

  describe("frente: pérgola y apliques", () => {
    const meshes = (id: string) => {
      const out: THREE.Mesh[] = [];
      ELEMENTS.find((e) => e.id === id)!.build(ctx).traverse((o) => {
        if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh);
      });
      return out;
    };
    const size = (m: THREE.Mesh) => {
      m.geometry.computeBoundingBox();
      return m.geometry.boundingBox!.getSize(new THREE.Vector3());
    };
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-5;

    it("la pérgola tiene 8 listones por columna a paso 0.09", () => {
      const h = BARBATOS_LAYOUT.pergola.height;
      const slats = meshes("pergola").filter((m) => {
        const s = size(m);
        return near(s.x, 0.05) && near(s.y, h) && near(s.z, 0.1);
      });
      expect(slats).toHaveLength(16);
      for (const cx of BARBATOS_LAYOUT.pergola.columnsX) {
        const xs = slats.map((m) => m.position.x).filter((x) => Math.abs(x - cx) < 0.5).sort((a, b) => a - b);
        expect(xs).toHaveLength(8);
        for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeCloseTo(0.09, 5);
        expect((xs[0] + xs[7]) / 2).toBeCloseTo(cx, 5);
      }
    });

    it("las lamas de la pérgola corren en z", () => {
      const lamas = meshes("pergola").filter((m) => near(size(m).x, 0.03) && near(size(m).y, 0.1));
      expect(lamas.length).toBeGreaterThan(10);
      expect(lamas.every((m) => size(m).z > size(m).x)).toBe(true);
      const xs = lamas.map((m) => m.position.x).sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeCloseTo(0.12, 5);
    });

    it("la pérgola tiene dos vigas 0.2x0.12 de span+0.8 y lamas con la extensión pedida", () => {
      const { hz } = BARBATOS_LAYOUT.hall;
      const { z: pz, height: h, columnsX } = BARBATOS_LAYOUT.pergola;
      const span = columnsX[1] - columnsX[0];
      const all = meshes("pergola");
      const beams = all.filter((m) => near(size(m).y, 0.2) && near(size(m).z, 0.12));
      expect(beams).toHaveLength(2);
      expect(beams.map((m) => m.position.z).sort((a, b) => a - b)).toEqual([expect.closeTo(hz + 0.15, 5), expect.closeTo(pz, 5)]);
      for (const b of beams) {
        expect(size(b).x).toBeCloseTo(span + 0.8, 5);
        expect(b.position.y).toBeCloseTo(h + 0.1, 5);
        expect(b.position.x).toBeCloseTo((columnsX[0] + columnsX[1]) / 2, 5);
      }
      const lamas = all.filter((m) => near(size(m).x, 0.03) && near(size(m).y, 0.1));
      for (const m of lamas) {
        expect(m.position.y).toBeCloseTo(h + 0.25, 5);
        expect(m.position.z - size(m).z / 2).toBeCloseTo(hz + 0.1, 5);
        expect(m.position.z + size(m).z / 2).toBeCloseTo(pz + 0.1, 5);
      }
      const xs = lamas.map((m) => m.position.x);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(columnsX[0] - 0.4 - 1e-6);
      expect(Math.max(...xs)).toBeLessThanOrEqual(columnsX[1] + 0.4 + 1e-6);
    });

    it("la pérgola es simétrica respecto del eje de la puerta", () => {
      const { columnsX } = BARBATOS_LAYOUT.pergola;
      expect((columnsX[0] + columnsX[1]) / 2).toBeCloseTo(BARBATOS_LAYOUT.frontDoor.x, 5);
    });

    it("los apliques del frente son cubos negros con emisor", () => {
      const all = meshes("front-wall");
      const bodies = all.filter((m) => m.material === ctx.materials("metal") && near(size(m).x, 0.1) && near(size(m).y, 0.1) && near(size(m).z, 0.1));
      const emitters = all.filter((m) => m.material === ctx.materials("sconce"));
      expect(bodies).toHaveLength(BARBATOS_LAYOUT.frontSconces.length);
      expect(emitters).toHaveLength(BARBATOS_LAYOUT.frontSconces.length);
      for (const sc of BARBATOS_LAYOUT.frontSconces) {
        expect(bodies.some((m) => near(m.position.x, sc.x) && near(m.position.y, sc.y))).toBe(true);
        expect(emitters.some((m) => near(m.position.x, sc.x) && m.position.y < sc.y && m.userData.noShadow === true)).toBe(true);
      }
    });
  });

  describe("anexo", () => {
    const meshes = (id: string) => {
      const out: THREE.Mesh[] = [];
      ELEMENTS.find((e) => e.id === id)!.build(ctx).traverse((o) => {
        if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh);
      });
      return out;
    };
    const box3 = (m: THREE.Mesh) => {
      m.geometry.computeBoundingBox();
      return m.geometry.boundingBox!.clone().translate(m.position);
    };
    const a = BARBATOS_LAYOUT.annex;

    it("el anexo no tiene rectángulo hearth en el frente", () => {
      const front = meshes("annex").filter((m) => m.material === ctx.materials("hearth") && m.position.z > a.zFront - 0.1);
      expect(front).toHaveLength(0);
    });

    it("el frente del anexo lleva una ventana angosta gris con vidrio esmerilado", () => {
      const all = meshes("annex");
      expect(all.some((m) => m.material === ctx.materials("frostedGlass") && Math.abs(m.position.x - a.frontWindow.x) < 1e-6)).toBe(true);
      expect(all.some((m) => m.material === ctx.materials("frameGray"))).toBe(true);
    });

    it("el fondo del anexo es revoque gris", () => {
      const plate = meshes("annex").filter((m) => m.material === ctx.materials("greyStucco"));
      expect(plate.length).toBeGreaterThan(0);
      expect(plate.some((m) => Math.abs(m.position.z - a.zBack) < 0.05)).toBe(true);
    });

    it("el fondo tiene ventana horizontal de madera y dos apliques", () => {
      const all = meshes("annex");
      expect(all.some((m) => m.material === ctx.materials("wood"))).toBe(true);
      const emitters = all.filter((m) => m.material === ctx.materials("sconce"));
      expect(emitters).toHaveLength(2);
      for (const s of a.rearSconces) expect(emitters.some((m) => Math.abs(m.position.x - s.x) < 1e-6 && m.position.z < a.zBack)).toBe(true);
    });

    it("el techo del anexo no vuela", () => {
      const slab = meshes("annex-roof").filter((m) => m.material === ctx.materials("roof"));
      expect(slab).toHaveLength(1);
      const b = box3(slab[0]);
      expect(b.min.x).toBeCloseTo(a.x - a.width / 2, 6);
      expect(b.max.x).toBeCloseTo(a.x + a.width / 2, 6);
      expect(b.min.z).toBeCloseTo(a.zBack, 6);
      expect(b.max.z).toBeCloseTo(a.zFront, 6);
    });

    it("el techo del anexo lleva un borde metálico en los 4 lados", () => {
      expect(meshes("annex-roof").filter((m) => m.material === ctx.materials("metal"))).toHaveLength(4);
    });
  });
});
