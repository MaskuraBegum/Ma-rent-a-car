const BASE = "/api";

export class ApiError extends Error {}

async function request(path, { method = "GET", body } = {}) {
  const isForm = body instanceof FormData;
  const res = await fetch(BASE + path, {
    method,
    headers: body && !isForm ? { "Content-Type": "application/json" } : undefined,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.errors?.map((e) => `${e.field}: ${e.message}`).join(", ");
    throw new ApiError(detail || data.message || "Something went wrong");
  }
  return data;
}

// downloads a file (PDF) and returns { blob, filename }
async function file(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = data.errors?.map((e) => `${e.field}: ${e.message}`).join(", ");
    throw new ApiError(detail || data.message || "Something went wrong");
  }
  const name = /filename="?([^";]+)"?/.exec(res.headers.get("content-disposition") || "")?.[1];
  return { blob: await res.blob(), filename: name || "report.pdf" };
}

export const api = {
  getFile: (path) => file(path),
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),
};
