import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { CardShell } from "@/components/card-shell/CardShell";

const href = "https://wa.me/5491100000000?text=Hola";

function renderShell(envelope: boolean) {
  return render(
    <CardShell envelope={envelope} venueName="Salón X" whatsappHref={href}>
      <h1>Contenido de la tarjeta</h1>
    </CardShell>,
  );
}

describe("CardShell", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("con sobre: oculta el contenido y el botón flotante hasta abrirlo", () => {
    renderShell(true);
    expect(screen.getByRole("button", { name: "Abrir la invitación de Salón X" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Contenido de la tarjeta" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("whatsapp-floating")).not.toBeInTheDocument();
  });

  it("al abrir el sobre muestra el contenido y el botón flotante", async () => {
    renderShell(true);
    await userEvent.click(screen.getByRole("button", { name: "Abrir la invitación de Salón X" }));
    expect(screen.getByRole("heading", { name: "Contenido de la tarjeta" })).toBeInTheDocument();
    expect(screen.getByTestId("whatsapp-floating")).toHaveAttribute("href", href);
  });

  // Review Focus 5
  it("con envelope: false entra directo: sin sobre y con botón flotante desde el inicio", () => {
    renderShell(false);
    expect(screen.queryByRole("button", { name: /Abrir la invitación/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contenido de la tarjeta" })).toBeInTheDocument();
    expect(screen.getByTestId("whatsapp-floating")).toHaveAttribute("href", href);
  });

  it("al abrir el sobre mueve el foco al contenedor del contenido", async () => {
    renderShell(true);
    await userEvent.click(screen.getByRole("button", { name: "Abrir la invitación de Salón X" }));
    expect(screen.getByTestId("card-content")).toHaveFocus();
  });

  it("con envelope: false no mueve el foco al montar", () => {
    renderShell(false);
    expect(screen.getByTestId("card-content")).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it("con sobre: bloquea el scroll del body y lo restaura al abrir", async () => {
    document.body.style.overflow = "auto";
    renderShell(true);
    expect(document.body.style.overflow).toBe("hidden");
    await userEvent.click(screen.getByRole("button", { name: "Abrir la invitación de Salón X" }));
    expect(document.body.style.overflow).toBe("auto");
  });

  it("restaura el overflow del body si se desmonta con el sobre cerrado", () => {
    document.body.style.overflow = "auto";
    const { unmount } = renderShell(true);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("con envelope: false nunca toca el overflow del body", () => {
    document.body.style.overflow = "auto";
    const { unmount } = renderShell(false);
    expect(document.body.style.overflow).toBe("auto");
    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });
});
