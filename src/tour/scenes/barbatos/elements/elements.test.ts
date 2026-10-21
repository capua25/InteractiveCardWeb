import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createTestEngineContext } from "@/tour/engine/test-context";
import { BARBATOS_DIMENSIONS } from "../dimensions";
import { BARBATOS_LAYOUT, computeLayout } from "../layout";
import { CURTAIN_ROLLED_SCALE } from "@/tour/engine/curtains";
import { ELEMENTS } from "./index";
import { LAVENDER_ATLAS } from "@/tour/engine/foliage-textures";
import { LAVENDER } from "./forecourt";
import { CARDS, treeCrowns } from "./vegetation";

const ctx = { ...createTestEngineContext(), layout: BARBATOS_LAYOUT };

describe("ELEMENTS de Barbato's", () => {
  it("los ids de ELEMENTS son únicos", () => {
    const ids = ELEMENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("registra los elementos del v6 en orden", () => {
    expect(ELEMENTS.map((e) => e.id)).toEqual([
      "ground", "patio", "forecourt", "front-wall", "back-wall", "gables", "plinth", "floor", "chimney", "ac-units", "trusses",
      "roof", "annex", "annex-roof", "pergola", "gallery", "gallery-roof", "gallery-curtains", "park", "fire-pit", "vegetation", "garland", "tables",
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

  it("patio: pedregullo plano con el contorno curvo, acostado a 5 cm y con UV en metros / 2.5", () => {
    const obj = ELEMENTS.find((e) => e.id === "patio")!.build(ctx);
    const gravel = obj.children.find((o) => (o as THREE.Mesh).material === ctx.materials("gravel")) as THREE.Mesh;
    expect(gravel.geometry).toBeInstanceOf(THREE.ShapeGeometry);
    expect(gravel.position.y).toBeCloseTo(0.05, 6);
    expect(gravel.rotation.x).toBeCloseTo(-Math.PI / 2, 6);
    gravel.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(gravel);
    const xs = BARBATOS_LAYOUT.forecourt.outline.map((p) => p.x);
    const zs = BARBATOS_LAYOUT.forecourt.outline.map((p) => p.z);
    expect(box.min.x).toBeCloseTo(Math.min(...xs), 4);
    expect(box.max.x).toBeCloseTo(Math.max(...xs), 4);
    expect(box.min.z).toBeCloseTo(Math.min(...zs), 4);
    expect(box.max.z).toBeCloseTo(Math.max(...zs), 4);
    const pos = gravel.geometry.attributes.position;
    const uv = gravel.geometry.attributes.uv;
    for (let i = 0; i < pos.count; i += 7) expect(uv.getX(i)).toBeCloseTo(pos.getX(i) / 2.5, 6);
  });

  it("forecourt: 2 InstancedMesh (piedras, lavandas en tarjetas) y ningún mesh suelto", () => {
    const obj = ELEMENTS.find((e) => e.id === "forecourt")!.build(ctx);
    const instanced: THREE.InstancedMesh[] = [];
    let plain = 0;
    obj.traverse((o) => {
      if ((o as THREE.InstancedMesh).isInstancedMesh) instanced.push(o as THREE.InstancedMesh);
      else if ((o as THREE.Mesh).isMesh) plain++;
    });
    expect(instanced.map((m) => [m.material, m.count])).toEqual([
      [ctx.materials("gabion"), BARBATOS_LAYOUT.forecourt.border.length],
      [ctx.materials("lavender"), BARBATOS_LAYOUT.forecourt.lavender.length],
    ]);
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

  describe("vegetación", () => {
    const build = (detail: "high" | "low" = "low") => ELEMENTS.find((e) => e.id === "vegetation")!.build({ ...ctx, detail });
    const veg = (detail: "high" | "low" = "low") => {
      const out: THREE.Mesh[] = [];
      build(detail).traverse((o) => {
        if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh);
      });
      return out;
    };
    const byMaterial = (meshes: THREE.Mesh[], key: Parameters<typeof ctx.materials>[0]) => meshes.filter((m) => m.material === ctx.materials(key));
    const cardsOf = (m: THREE.Mesh) => m.geometry.getAttribute("position").count / 4;
    const v = BARBATOS_LAYOUT.vegetation;
    // Vértices en coordenadas del lote (aplicando la matriz de cada instancia si es InstancedMesh).
    const worldVertices = (m: THREE.Mesh) => {
      const inst = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh) : null;
      const pos = m.geometry.getAttribute("position");
      const out: THREE.Vector3[] = [];
      const mat = new THREE.Matrix4();
      for (let i = 0; i < (inst ? inst.count : 1); i++) {
        if (inst) inst.getMatrixAt(i, mat);
        for (let k = 0; k < pos.count; k++) out.push(new THREE.Vector3().fromBufferAttribute(pos, k).applyMatrix4(mat));
      }
      return out;
    };

    it("vegetation usa 5 draw calls: troncos, hojas, sauces, fotinia, formios", () => {
      const meshes = veg();
      expect(meshes).toHaveLength(5);
      for (const k of ["trunk", "leaves", "willow", "photinia", "phormium"] as const) expect(byMaterial(meshes, k), k).toHaveLength(1);
    });
    it("el detalle no cambia la cantidad de meshes (draw calls)", () => {
      expect(veg("high").length).toBe(veg("low").length);
    });
    it.each(["high", "low"] as const)("tarjetas por especie (%s)", (detail) => {
      const C = CARDS[detail];
      const meshes = veg(detail);
      // las cúpulas de los sauces usan la textura de hojas (van en el mesh de hojas); las faldas, la de hebras
      const trees = v.saplings.length * C.sapling + v.tallSaplings.length * C.tall + v.wallRow.length * C.wallRow + v.poplars.length * C.poplar + v.willows.length * C.willowDome;
      expect(cardsOf(byMaterial(meshes, "leaves")[0])).toBe(trees);
      expect(cardsOf(byMaterial(meshes, "willow")[0])).toBe(v.willows.length * C.willowSkirt);
      expect(cardsOf(byMaterial(meshes, "photinia")[0])).toBe(C.photinia);
      expect(cardsOf(byMaterial(meshes, "phormium")[0])).toBe(v.phormiums.length * C.phormium);
    });
    it.each([["high", 10], ["low", 6]] as const)("cada arbolito lleva entre 6 y 10 tarjetas (%s: %i), más en desktop", (detail, n) => {
      const vs = worldVertices(byMaterial(veg(detail), "leaves")[0]);
      const centers = Array.from({ length: vs.length / 4 }, (_, c) => vs.slice(c * 4, c * 4 + 4).reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(0.25));
      for (const s of v.saplings) {
        const mine = centers.filter((c) => Math.hypot(c.x - s.x, c.z - s.z) < 0.8 && c.y < s.height + 0.5);
        expect(mine.length, `${s.x}`).toBe(n);
      }
      const total = (d: "high" | "low") => cardsOf(byMaterial(veg(d), "leaves")[0]) + cardsOf(byMaterial(veg(d), "willow")[0]) + cardsOf(byMaterial(veg(d), "photinia")[0]) + cardsOf(byMaterial(veg(d), "phormium")[0]);
      expect(total("low")).toBeLessThan(total("high"));
    });
    it("las tarjetas usan materiales de follaje (alphaTest)", () => {
      for (const m of veg().filter((x) => x.material !== ctx.materials("trunk"))) expect((m.material as THREE.MeshStandardMaterial).alphaTest).toBe(0.5);
    });
    it("arbolitos: hojas repartidas a lo largo de los 2/3 de arriba del tallo, no una bola en la punta", () => {
      const leaves = worldVertices(byMaterial(veg("high"), "leaves")[0]);
      for (const s of v.saplings) {
        const r = s.height * 0.22;
        const ys = leaves.filter((p) => Math.hypot(p.x - s.x, p.z - s.z) < r + 0.4).map((p) => p.y);
        expect(Math.min(...ys), `${s.x}`).toBeLessThan(s.height / 3 + 0.3);
        expect(Math.min(...ys), `${s.x}`).toBeGreaterThan(s.height / 3 - 0.5);
        expect(Math.max(...ys), `${s.x}`).toBeGreaterThan(s.height * 0.9);
        // el follaje ocupa más de la mitad del alto (una bola de radio 0.22·h ocupaba menos)
        expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(s.height * 0.5);
      }
    });
    it("álamos: follaje en columna desde 0.3–0.5 m del pasto hasta cerca de la punta", () => {
      const leaves = worldVertices(byMaterial(veg("high"), "leaves")[0]);
      for (const p of v.poplars) {
        const ys = leaves.filter((q) => Math.abs(q.x - p.x) < 0.9 && Math.abs(q.z - p.z) < 0.6).map((q) => q.y);
        expect(Math.min(...ys), `${p.z}`).toBeGreaterThanOrEqual(0.05);
        expect(Math.min(...ys), `${p.z}`).toBeLessThanOrEqual(0.6);
        expect(Math.max(...ys), `${p.z}`).toBeGreaterThan(p.height * 0.75);
      }
    });
    it("fotinia: varios tallos desde el pie y hojas solo en los 2/3 de arriba", () => {
      const { x, z, height } = v.photinia;
      // cada tallo es un cilindro abierto con su propio anillo de base (segmentos + 1 vértices): un tronco único
      // dejaría un solo anillo al pie
      const atFoot = worldVertices(byMaterial(veg("low"), "trunk")[0]).filter((p) => Math.abs(p.y) < 0.02 && Math.hypot(p.x - x, p.z - z) < 0.2);
      expect(atFoot.length).toBeGreaterThanOrEqual(4 * (CARDS.low.trunk + 1));
      const vs = worldVertices(byMaterial(veg(), "photinia")[0]);
      // centro de cada tarjeta (promedio de sus 4 vértices): ninguno en el tercio de abajo, donde solo hay tallos
      const centers = Array.from({ length: vs.length / 4 }, (_, c) => vs.slice(c * 4, c * 4 + 4).reduce((a, p) => a + p.y, 0) / 4);
      expect(Math.min(...centers)).toBeGreaterThan(height / 3);
      expect(Math.max(...vs.map((p) => p.y))).toBeLessThan(height + 0.9);
    });
    it("sauces: la falda de hebras cuelga hasta cerca del pasto y la cúpula va con tarjetas de hojas", () => {
      const strands = worldVertices(byMaterial(veg(), "willow")[0]);
      for (const w of v.willows) {
        const ys = strands.filter((p) => Math.hypot(p.x - w.x, p.z - w.z) < 1.6).map((p) => p.y);
        expect(Math.min(...ys)).toBeLessThan(0.9);
        expect(Math.max(...ys)).toBeGreaterThan(2.3);
        const dome = worldVertices(byMaterial(veg(), "leaves")[0]).filter((p) => Math.hypot(p.x - w.x, p.z - w.z) < 1.6 && p.y > 2);
        expect(dome.length).toBeGreaterThan(0);
      }
    });
    it("cada árbol del layout conserva su posición: el tronco arranca en (x, 0, z)", () => {
      const trunk = byMaterial(veg(), "trunk")[0];
      const base = worldVertices(trunk).filter((p) => Math.abs(p.y) < 0.02); // los tallos inclinados dejan el anillo apenas torcido
      const trees = [...v.saplings, ...v.tallSaplings, ...v.wallRow, ...v.poplars, ...v.willows, v.photinia];
      for (const t of trees) {
        const near = base.filter((p) => Math.hypot(p.x - t.x, p.z - t.z) < 0.2);
        expect(near.length, `${t.x},${t.z}`).toBeGreaterThan(0);
      }
    });
    it("los formios se plantan en sus posiciones con alto entre 1.4 y 2.2; el primero es variegado y el resto bronce", () => {
      const flax = byMaterial(veg(), "phormium")[0];
      const pos = flax.geometry.getAttribute("position"), uv = flax.geometry.getAttribute("uv");
      v.phormiums.forEach((f, i) => {
        const idx = Array.from({ length: pos.count }, (_, k) => k).filter((k) => Math.hypot(pos.getX(k) - f.x, pos.getZ(k) - f.z) < 0.45);
        expect(idx.length, `${f.z}`).toBe(4 * CARDS.low.phormium);
        const ys = idx.map((k) => pos.getY(k));
        expect(Math.min(...ys)).toBeCloseTo(0, 5);
        expect(Math.max(...ys)).toBeGreaterThanOrEqual(1.4 - 1e-5);
        expect(Math.max(...ys)).toBeLessThanOrEqual(2.2 + 1e-5);
        const us = idx.map((k) => uv.getX(k));
        const variegated = Math.min(...us) >= 0.5;
        const bronze = Math.max(...us) <= 0.5;
        expect(i === 0 ? variegated : bronze, `formio ${i}`).toBe(true);
      });
    });
    it("ninguna copa toca la arena hexagonal ni un poste de la guirnalda (≥0.5 m)", () => {
      const { sandVertices: hex, x: cx, z: cz, sandRadius } = BARBATOS_LAYOUT.firePit;
      const segDist = (px: number, pz: number, a: { x: number; z: number }, b: { x: number; z: number }) => {
        const dx = b.x - a.x, dz = b.z - a.z;
        const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / (dx * dx + dz * dz)));
        return Math.hypot(px - (a.x + t * dx), pz - (a.z + t * dz));
      };
      for (const c of treeCrowns(BARBATOS_LAYOUT)) {
        const inside = Math.hypot(c.x - cx, c.z - cz) < sandRadius * Math.cos(Math.PI / 6);
        expect(inside, `centro dentro ${c.x},${c.z}`).toBe(false);
        for (let k = 0; k < 6; k++) {
          expect(segDist(c.x, c.z, hex[k], hex[(k + 1) % 6]) - c.radius, `arena ${c.x},${c.z}`).toBeGreaterThanOrEqual(0.5);
          expect(Math.hypot(c.x - hex[k].x, c.z - hex[k].z) - c.radius, `poste ${c.x},${c.z}`).toBeGreaterThanOrEqual(0.5);
        }
      }
    });
    it("las tarjetas de cada copa no salen del radio de despeje declarado en treeCrowns", () => {
      const crowns = treeCrowns(BARBATOS_LAYOUT);
      for (const m of veg("high").filter((x) => x.material !== ctx.materials("trunk"))) {
        for (const p of worldVertices(m)) {
          // la esquina de una tarjeta puede asomar hasta 0.4 m del contorno (menos que el despeje de 0.5 m exigido arriba)
          expect(crowns.some((c) => Math.hypot(p.x - c.x, p.z - c.z) < c.radius + 0.4), `${p.x},${p.z}`).toBe(true);
        }
      }
    });
    it("los álamos (con jitter) quedan dentro del muro izquierdo", () => {
      for (const p of v.poplars) expect(p.x - 0.7 * 1.15).toBeGreaterThan(-BARBATOS_LAYOUT.lot.halfWidth + BARBATOS_LAYOUT.lot.wallThickness / 2);
      const wall = -BARBATOS_LAYOUT.lot.halfWidth + BARBATOS_LAYOUT.lot.wallThickness / 2;
      for (const m of veg("high")) for (const p of worldVertices(m)) expect(p.x).toBeGreaterThan(wall);
    });
    it("park ya no planta árboles", () => {
      const parkObj = ELEMENTS.find((e) => e.id === "park")!.build(ctx);
      let crowns = 0;
      parkObj.traverse((o) => { if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).material === ctx.materials("trunk")) crowns++; });
      expect(crowns).toBe(0);
    });
    it("no hay árboles fuera del muro ni conífera junto a la chimenea", () => {
      const { lot, hall } = BARBATOS_LAYOUT;
      for (const m of veg("high")) {
        for (const p of worldVertices(m)) {
          expect(Math.abs(p.x), `${p.x},${p.z}`).toBeLessThan(lot.halfWidth);
          expect(p.z).toBeGreaterThan(lot.zBack);
          expect(p.z).toBeLessThan(lot.zFront);
          // nada plantado en la franja del hastial +x (donde estaba la conífera)
          expect(p.x > hall.hx && p.x < hall.hx + 9 && Math.abs(p.z) < hall.hz, `${p.x},${p.z}`).toBe(false);
        }
      }
    });
  });

  describe("lavandas", () => {
    const lav = (detail: "high" | "low") => {
      let found: THREE.InstancedMesh | undefined;
      ELEMENTS.find((e) => e.id === "forecourt")!.build({ ...ctx, detail }).traverse((o) => {
        if ((o as THREE.InstancedMesh).isInstancedMesh && (o as THREE.InstancedMesh).material === ctx.materials("lavender")) found = o as THREE.InstancedMesh;
      });
      return found!;
    };
    it.each(["high", "low"] as const)("cada mata son tarjetas cruzadas (%s) en las posiciones del layout, con escala variable", (detail) => {
      const m = lav(detail);
      expect(m.geometry.getAttribute("position").count / 4).toBe(LAVENDER.cards[detail] + 1);
      const mat = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
      const scales = new Set<number>();
      BARBATOS_LAYOUT.forecourt.lavender.forEach((pt, i) => {
        m.getMatrixAt(i, mat);
        mat.decompose(p, q, sc);
        expect([p.x, p.y, p.z]).toEqual([expect.closeTo(pt.x, 5), 0, expect.closeTo(pt.z, 5)]);
        scales.add(Math.round(sc.x * 100));
      });
      expect(scales.size).toBeGreaterThan(3);
    });
    it("una tarjeta horizontal a media altura con la vista desde arriba tapa la estrella de las cruzadas", () => {
      const g = lav("low").geometry;
      const pos = g.getAttribute("position"), uv = g.getAttribute("uv");
      const flat: number[] = [];
      for (let c = 0; c < pos.count / 4; c++) {
        const ys = [0, 1, 2, 3].map((k) => pos.getY(c * 4 + k));
        if (Math.max(...ys) - Math.min(...ys) < 1e-6) flat.push(c);
      }
      expect(flat).toHaveLength(1);
      const c = flat[0];
      expect(pos.getY(c * 4)).toBeCloseTo(LAVENDER.height * LAVENDER.top.y, 5);
      for (let k = 0; k < 4; k++) {
        expect(uv.getX(c * 4 + k)).toBeLessThanOrEqual(LAVENDER_ATLAS.top[2] + 1e-6);
        expect(uv.getY(c * 4 + k)).toBeLessThanOrEqual(LAVENDER_ATLAS.top[3] + 1e-6);
      }
      // vista desde arriba: la tapa cubre el cruce (0, 0) y llega a ≥ 3/4 del alcance horizontal de las cruzadas
      const xs = [0, 1, 2, 3].map((k) => pos.getX(c * 4 + k)), zs = [0, 1, 2, 3].map((k) => pos.getZ(c * 4 + k));
      expect(Math.min(...xs)).toBeLessThan(0);
      expect(Math.max(...xs)).toBeGreaterThan(0);
      expect(Math.min(...zs)).toBeLessThan(0);
      expect(Math.max(...zs)).toBeGreaterThan(0);
      let reach = 0;
      for (let k = 0; k < pos.count; k++) if (Math.floor(k / 4) !== c) reach = Math.max(reach, Math.hypot(pos.getX(k), pos.getZ(k)));
      expect(Math.min(Math.max(...xs), Math.max(...zs))).toBeGreaterThanOrEqual(0.75 * reach * Math.SQRT1_2);
    });
    it("desktop lleva más tarjetas que celulares y el material recorta por alphaTest", () => {
      expect(LAVENDER.cards.high).toBeGreaterThan(LAVENDER.cards.low);
      expect((lav("low").material as THREE.MeshStandardMaterial).alphaTest).toBe(0.5);
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
      const ring = pit().filter((m) => m.material === ctx.materials("gabion"));
      expect(ring).toHaveLength(1);
      ring[0].geometry.computeBoundingBox();
      expect(ring[0].geometry.boundingBox!.getSize(new THREE.Vector3()).x).toBeCloseTo(2.4, 2);
      const sand = pit().filter((m) => m.material === ctx.materials("sand"));
      expect(sand).toHaveLength(1);
      expect((sand[0].geometry as THREE.CircleGeometry).parameters.segments).toBe(6);
      expect((sand[0].geometry as THREE.CircleGeometry).parameters.radius).toBe(5);
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
    const STEPS = Math.round(5 / BARBATOS_DIMENSIONS.garland.bulbSpacing); // lado = circunradio = 5
    const bulbPositions = () => {
      const m = bulbMesh();
      const mat = new THREE.Matrix4();
      return Array.from({ length: m.count }, (_, i) => new THREE.Vector3().setFromMatrixPosition(m.getMatrixAt(i, mat)));
    };
    it("guirnalda: 6 postes de 2.8, 13 bombitas por lado y nada hacia la galería", () => {
      const poles: THREE.Mesh[] = [];
      build().traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh && m.geometry instanceof THREE.CylinderGeometry) poles.push(m);
      });
      expect(poles).toHaveLength(6);
      for (const p of poles) expect((p.geometry as THREE.CylinderGeometry).parameters.height).toBe(2.8);
      const f = BARBATOS_LAYOUT.firePit;
      const bulbs = bulbPositions();
      expect(bulbMesh().count).toBe(6 * STEPS);
      for (const b of bulbs) expect(Math.hypot(b.x - f.x, b.z - f.z)).toBeLessThanOrEqual(5 + 1e-6);
      expect(Math.min(...bulbs.map((b) => b.y))).toBeGreaterThanOrEqual(2.2);
    });
    it("cada tramo une vértices adyacentes", () => {
      const bulbs = bulbPositions();
      BARBATOS_LAYOUT.park.garland.poles.forEach((p, k) => {
        expect(bulbs[k * STEPS].x).toBeCloseTo(p.x, 4);
        expect(bulbs[k * STEPS].z).toBeCloseTo(p.z, 4);
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
      expect(all.some((m) => m.material === ctx.materials("woodDark"))).toBe(true);
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
