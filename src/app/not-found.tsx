import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-heading text-3xl">No encontramos esta tarjeta</h1>
      <p>Revisá el link que te compartieron.</p>
      <Link href="/" className="underline">
        Ir al inicio
      </Link>
    </main>
  );
}
