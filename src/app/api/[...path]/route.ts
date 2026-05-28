import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

// hop-by-hop (RFC 7230 §6.1) + 본문 인코딩 헤더. request / response 양쪽에서 strip 한다.
// 응답 측에서 undici 가 auto-decompress 한 후에도 헤더가 남으면 브라우저가 잘못 해석한다.
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

// 요청 측 추가 strip — 클라이언트가 위변조한 신뢰 정보가 백엔드 권한·rate-limit 로 새지 않게.
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

// 응답 측 추가 strip — set-cookie 는 BFF 가 cookie 단일 출처. location 은 BFF 우회 방지 (auth.md).
const STRIPPED_RESPONSE_HEADERS = new Set([...HOP_BY_HOP_HEADERS, "set-cookie", "location"]);

// RFC 7230 — body 를 가질 수 없는 status. logout 같이 백엔드가 정상 204 를 던지는 흐름에서 본 가드 필수.
const STATUSES_WITHOUT_BODY = new Set([204, 205, 304]);

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
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) init.body = body;
  }

  const upstream = await fetch(upstreamUrl, init);

  // 3xx 응답은 외부 도메인을 가리키는 Location 으로 BFF 를 우회시킬 수 있어 일관되게 502 로 강등.
  // 현재 백엔드가 3xx 를 던지는 endpoint 가 없지만 안전망. 필요해지면 endpoint 별 route 로 분리하며 명시.
  if (upstream.status >= 300 && upstream.status < 400) {
    return Response.json(
      { code: "BFF_UPSTREAM_REDIRECT", message: "요청을 처리하지 못했습니다." },
      { status: 502 },
    );
  }

  const responseHeaders = sanitizeResponseHeaders(upstream.headers);
  const bodyAllowed = !STATUSES_WITHOUT_BODY.has(upstream.status) && request.method !== "HEAD";

  return new Response(bodyAllowed ? upstream.body : null, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
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
