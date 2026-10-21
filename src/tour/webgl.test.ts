import { afterEach, describe, expect, it, vi } from "vitest";
import { hasWebGL } from "./webgl";

const loseContext = vi.fn();
const fakeGl = { getExtension: (name: string) => (name === "WEBGL_lose_context" ? { loseContext } : null) };

function stubGetContext(contexts: Partial<Record<"webgl2" | "webgl", unknown>>) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    ((type: string) => contexts[type as "webgl2" | "webgl"] ?? null) as HTMLCanvasElement["getContext"],
  );
}

function stubGetContextThrows() {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
    throw new Error("blocked");
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  loseContext.mockClear();
});

describe("hasWebGL", () => {
  it("true si el navegador da un contexto webgl2 o webgl", () => {
    stubGetContext({ webgl: fakeGl });
    expect(hasWebGL()).toBe(true);
  });

  it("libera el contexto de prueba con WEBGL_lose_context", () => {
    stubGetContext({ webgl2: fakeGl });
    expect(hasWebGL()).toBe(true);
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  it("false si getContext devuelve null", () => {
    stubGetContext({});
    expect(hasWebGL()).toBe(false);
  });

  it("false si getContext tira", () => {
    stubGetContextThrows();
    expect(hasWebGL()).toBe(false);
  });
});
