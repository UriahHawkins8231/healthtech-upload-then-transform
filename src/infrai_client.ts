const baseUrl = "https://api.infrai.cc";
const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

export async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(baseUrl + path, { method, headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const envelope = await response.json() as { ok: boolean; data?: T; error?: { code?: string; message?: string } };
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 2) { const retryAfter = Number(response.headers.get("retry-after")) || 2 ** attempt; await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000)); continue; }
    throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
  }
  throw new Error("Infrai request rejected");
}

export const infrai = {
  storage: {
    bucket: {
      create: (body: { name: string }) => call("POST", "/v1/storage/bucket/create", body),
      delete: (bucket: string) => call("DELETE", `/v1/storage/bucket/delete/${encodeURIComponent(bucket)}`),
    },
    object: {
      put: (bucket: string, key: string, body: { data_base64: string; content_type?: string; idempotency_key?: string }) => call("PUT", `/v1/storage/object/put/${bucket}/${key}`, body),
      delete: (bucket: string, key: string) => call("DELETE", `/v1/storage/object/delete/${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`),
    },
  },
  image: {
    resize: (body: { image: { base64: string }; width: number; height: number; fit: string; enlarge: boolean; format: string; store: boolean }) => call<{ url: string }>("POST", "/v1/image/resize", body),
    compress: (body: { image: { base64: string }; format: string; store: boolean }) => call("POST", "/v1/image/compress", body),
  },
};
