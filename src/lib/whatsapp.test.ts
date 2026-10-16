import { describe, expect, it } from "vitest";
import { buildWhatsAppLink } from "@/lib/whatsapp";

describe("buildWhatsAppLink", () => {
  it("arma el link wa.me con el teléfono y el mensaje", () => {
    expect(buildWhatsAppLink("5491112345678", "Hola")).toBe(
      "https://wa.me/5491112345678?text=Hola",
    );
  });

  // Review Focus 1
  it("deja solo dígitos cuando el teléfono trae +, espacios, guiones y paréntesis", () => {
    expect(buildWhatsAppLink("+54 9 (11) 1234-5678", "Hola")).toBe(
      "https://wa.me/5491112345678?text=Hola",
    );
  });

  // Review Focus 2
  it("codifica acentos, emojis, &, ?, # y saltos de línea sin perder información", () => {
    const message = "¿Hola! Quiero info de cumpleaños & casamientos 🎉 #2027\nGracias";
    const link = buildWhatsAppLink("5491112345678", message);
    const url = new URL(link);

    expect(link).toBe(`https://wa.me/5491112345678?text=${encodeURIComponent(message)}`);
    expect(url.hash).toBe("");
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.searchParams.get("text")).toBe(message);
  });

  it("falla si el teléfono no tiene ningún dígito", () => {
    expect(() => buildWhatsAppLink("sin número", "Hola")).toThrow(
      'Número de WhatsApp inválido: "sin número"',
    );
  });
});
