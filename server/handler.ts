import type { IncomingMessage, ServerResponse } from "node:http";
import { renderDictamen, ValidationError } from "./dictamen";

const MAX_BODY = 1_000_000; // 1 MB

async function readJson(req: IncomingMessage & { body?: unknown }): Promise<unknown> {
  if (req.body !== undefined && req.body !== null) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new ValidationError("La solicitud supera el tamaño máximo permitido (1 MB).");
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ValidationError("El cuerpo no es un JSON válido.");
  }
}

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};

/** POST /api/dictamen → application/pdf */
export async function handleDictamen(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Método no permitido. Usa POST." });
  }
  try {
    const { bytes, fileName } = await renderDictamen(await readJson(req));
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Cache-Control", "no-store");
    res.end(Buffer.from(bytes));
  } catch (error) {
    if (error instanceof ValidationError || error instanceof SyntaxError) {
      return sendJson(res, 400, { error: error instanceof SyntaxError ? "El cuerpo no es un JSON válido." : error.message });
    }
    console.error("[dictamen]", error);
    sendJson(res, 500, { error: "No se pudo generar el dictamen." });
  }
}
