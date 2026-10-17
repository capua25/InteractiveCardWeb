import { createContext } from "react";

// true cuando el contenido ya está a la vista: al terminar la salida del sobre,
// o desde el inicio si el salón no usa sobre. Por defecto true para que el
// contenido renderizado fuera de CardShell (tests, otras páginas) entre igual.
export const ContentRevealedContext = createContext(true);
