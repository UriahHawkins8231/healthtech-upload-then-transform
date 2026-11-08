import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { infrai } from "./infrai_client.ts";
import { notificationFor } from "./notification_decision.ts";

const requestSchema = z.object({ patientName: z.string().min(1), appointmentStatus: z.enum(["scheduled", "confirmed", "cancelled"]), startsAt: z.string(), imageBase64: z.string().min(1), filename: z.string().min(1) });

function readBody(request: import("node:http").IncomingMessage): Promise<unknown> { return new Promise((resolve, reject) => { let raw = ""; request.on("data", (chunk) => raw += chunk); request.on("end", () => { try { resolve(JSON.parse(raw)); } catch { reject(new Error("JSON body required")); } }); request.on("error", reject); }); }
const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/appointments/image") { response.writeHead(404); response.end(); return; }
  try {
    const input = requestSchema.parse(await readBody(request));
    const bucket = `healthtech-images-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const key = `appointments/${Date.now()}-${input.filename}`;
    await infrai.storage.bucket.create({ name: bucket });
    let uploaded = false;
    let compressed: unknown;
    try {
      await infrai.storage.object.put(bucket, key, { data_base64: input.imageBase64, content_type: "image/jpeg", idempotency_key: key });
      uploaded = true;
      const resized = await infrai.image.resize({ image: { base64: input.imageBase64 }, width: 1200, height: 900, fit: "inside", enlarge: false, format: "webp", store: false });
      const resizedBase64 = resized.url.split(",")[1];
      if (!resized.url.startsWith("data:image/") || !resizedBase64) throw new Error("Resize did not return inline image bytes");
      compressed = await infrai.image.compress({ image: { base64: resizedBase64 }, format: "webp", store: false });
    } finally {
      if (uploaded) await infrai.storage.object.delete(bucket, key);
      await infrai.storage.bucket.delete(bucket);
    }
    const notification = notificationFor({ status: input.appointmentStatus, patientName: input.patientName, startsAt: input.startsAt });
    response.writeHead(200, { "content-type": "application/json" }); response.end(JSON.stringify({ key, variant: compressed, notification }));
  } catch (error) { const message = error instanceof z.ZodError ? "Invalid request body" : (error as Error).message; response.writeHead(error instanceof z.ZodError ? 400 : 502, { "content-type": "application/json" }); response.end(JSON.stringify({ error: message })); }
});
server.listen(3000, () => console.log("healthtech service listening on http://localhost:3000"));
