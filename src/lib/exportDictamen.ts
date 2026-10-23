import type { DictamenPayload } from "../../server/dictamen";

export type { DictamenPayload };

/** Pide el PDF al backend (POST /api/dictamen) y lo descarga en el navegador. */
export async function downloadDictamen(payload: DictamenPayload): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/dictamen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("No hay conexión con el servidor. Intenta de nuevo.");
  }

  if (!response.ok) {
    let message = "No se pudo generar el dictamen.";
    try {
      const body = await response.json();
      if (body?.error) message = String(body.error);
    } catch {
      /* respuesta sin JSON */
    }
    throw new Error(message);
  }

  const fileName = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? "dictamen.pdf";
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
