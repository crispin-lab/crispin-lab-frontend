import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

// RFC 7230 §6.1 hop-by-hop + 본문 인코딩 헤더 — undici 가 auto-decompress 한 후에도 헤더가 남으면 브라우저가 잘못 해석.
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
]);

const STRIPPED_REQUEST_HEADERS = new Set([
  ...HOP_BY_HOP_HEADERS,
  "cookie",
  "host",
  "forwarded",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
]);

const STRIPPED_RESPONSE_HEADERS = new Set([...HOP_BY_HOP_HEADERS, "set-cookie", "location"]);

const STATUSES_WITHOUT_BODY = new Set([204, 205, 304]);

const UPSTREAM_TIMEOUT_MS = 10_000;

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, ctx: RouteContext): Promise<Response> {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    return Response.json(
      { code: "BFF_MISCONFIGURED", message: "요청을 처리하지 못했습니다." },
      { status: 500 },
    );
  }

  const { path } = await ctx.params;
  if (hasUnsafeSegment(path)) {
    return Response.json(
      { code: "BFF_INVALID_PATH", message: "요청을 처리하지 못했습니다." },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  const upstreamUrl = buildUpstreamUrl(backendUrl, path, new URL(request.url).search);
  const headers = sanitizeRequestHeaders(request.headers, sessionToken);

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) init.body = body;
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, init);
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
    console.error("[bff] upstream fetch 실패", {
      url: upstreamUrl,
      reason: isTimeout ? "timeout" : "network",
    });
    return Response.json(
      { code: "BFF_UPSTREAM_UNAVAILABLE", message: "요청을 처리하지 못했습니다." },
      { status: 502 },
    );
  }

  // 3xx Location 이 외부 도메인을 가리키면 BFF 우회 — 안전망으로 502 강등.
  if (upstream.status >= 300 && upstream.status < 400) {
    // body 를 consume 하지 않고 throw 하면 undici 가 connection 을 잡고 있을 수 있음 — 명시 cancel.
    await upstream.body?.cancel();
    return Response.json(
      { code: "BFF_UPSTREAM_REDIRECT", message: "요청을 처리하지 못했습니다." },
      { status: 502 },
    );
  }

  const responseHeaders = sanitizeResponseHeaders(upstream.headers);
  const bodyAllowed = !STATUSES_WITHOUT_BODY.has(upstream.status) && request.method !== "HEAD";

  // 만료 세션이면 즉시 Set-Cookie 로 증발 — body 한 번 buffer (text) 해 code 검사 (default 분기는 streaming, 본 분기만 예외).
  if (upstream.status === 401 && sessionToken && bodyAllowed) {
    const text = await upstream.text();
    if (isInvalidSessionBody(text)) {
      responseHeaders.append("Set-Cookie", buildExpiredSessionCookie());
    }
    return new Response(text, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  }

  return new Response(bodyAllowed ? upstream.body : null, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

function isInvalidSessionBody(text: string): boolean {
  if (text === "") return false;
  try {
    const parsed = JSON.parse(text) as { code?: unknown };
    return parsed.code === "INVALID_SESSION";
  } catch {
    return false;
  }
}

function buildExpiredSessionCookie(): string {
  // 발급 시 attribute (Path / SameSite / HttpOnly / Secure) 와 일치해야 브라우저가 같은 cookie 로 인식해 지운다.
  const isProd = process.env.NODE_ENV === "production";
  const attrs = [`${SESSION_COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (isProd) attrs.push("Secure");
  return attrs.join("; ");
}

function hasUnsafeSegment(path: string[]): boolean {
  return path.some((seg) => seg === "" || seg === "." || seg === ".." || seg.includes("/"));
}

function buildUpstreamUrl(backendUrl: string, path: string[], search: string): string {
  const base = backendUrl.replace(/\/$/, "");
  const joined = path.map((seg) => encodeURIComponent(seg)).join("/");
  return `${base}/${joined}${search}`;
}

function sanitizeRequestHeaders(source: Headers, sessionToken: string | undefined): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (!STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  if (sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  } else {
    headers.delete("authorization");
  }
  return headers;
}

function sanitizeResponseHeaders(source: Headers): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
