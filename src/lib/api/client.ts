export type ApiMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type ApiOptions = {
  method?: ApiMethod;
  body?: unknown;
  signal?: AbortSignal;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const body: unknown = await response.json().catch(() => ({}));
    const code = isRecord(body) && typeof body.code === "string" ? body.code : "UNKNOWN";
    const message =
      isRecord(body) && typeof body.message === "string"
        ? body.message
        : "요청을 처리하지 못했습니다.";
    return new ApiError(response.status, code, message);
  }
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (!path.startsWith("/api/")) {
    throw new Error(`apiFetch path must start with '/api/' (got: ${path})`);
  }

  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "include",
    signal: options.signal,
  });

  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }

  // 204 No Content — body 없음. T 가 void 인 호출만 안전하므로 호출부 시그니처 책임.
  if (response.status === 204) {
    return undefined as T;
  }

  // 200 범위라도 body 가 비어 있을 수 있어 text() 로 받아 가드 — response.json() 이 SyntaxError 로 던지지 않게.
  const text = await response.text();
  if (text === "") return undefined as T;
  return JSON.parse(text) as T;
}
