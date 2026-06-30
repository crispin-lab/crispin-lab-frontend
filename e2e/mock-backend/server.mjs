// SSR fetch (apiFetchServer) 는 Node 안에서 실행돼 Playwright page.route 로 가로챌 수 없다.
// 본 서버가 BACKEND_URL 로 떠 Next.js 의 SSR 호출을 stub. 테스트는 /__configure 로 핸들러를 박는다.
import { createServer } from "node:http";

const handlers = new Map();

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(raw === "" ? {} : JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload === undefined ? "" : JSON.stringify(payload));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "POST" && pathname === "/__configure") {
    const { key, response } = await readJson(req);
    if (typeof key !== "string" || response === undefined) {
      sendJson(res, 400, { code: "BAD_REQUEST", message: "key + response 필요" });
      return;
    }
    if (handlers.has(key)) {
      // 같은 spec 안에서 의도적 덮어쓰기도 가능. throw 는 아니고 stderr 경고 한 줄 — 디버깅 단서.
      console.warn(`[mock-backend] handler 덮어쓰기: ${key}`);
    }
    handlers.set(key, response);
    res.writeHead(204).end();
    return;
  }

  if (req.method === "DELETE" && pathname === "/__configure") {
    handlers.clear();
    res.writeHead(204).end();
    return;
  }

  const key = `${req.method} ${pathname}`;
  const handler = handlers.get(key);
  if (!handler) {
    sendJson(res, 404, {
      code: "MOCK_MISS",
      message: `핸들러 미설정: ${key} (등록된 키: ${[...handlers.keys()].join(", ") || "(none)"})`,
    });
    return;
  }

  const status = handler.status ?? 200;
  if (status === 204) {
    res.writeHead(204).end();
    return;
  }
  // error status (>= 400) 에서 body 누락이면 ApiError 가 'UNKNOWN' 로 떨어진다 — silent 회귀를 막기 위해
  // 자동 보충. 정상 응답 (2xx) 의 빈 body 는 의도일 수 있어 그대로 둔다.
  const body =
    status >= 400 && handler.body === undefined
      ? { code: "MOCK_BODY_MISSING", message: `error body 누락 — ${key} 의 mock 에 body 명시 필요` }
      : handler.body;
  sendJson(res, status, body);
});

const port = Number(process.env.MOCK_BACKEND_PORT ?? 4001);
server.listen(port, () => {
  // playwright webServer 가 url 로 ready 감지 — stdout 한 줄 + listening 로그 둘 다 안전.
  console.log(`[e2e mock-backend] listening on http://localhost:${port}`);
});
