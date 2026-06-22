// 동적 import + 모듈 싱글톤 — mermaid (~700KB) 가 첫 페이지 번들에 안 들어가고, mounter 재호출 / NodeView 재마운트에서도 init 은 한 번만.
let mermaidInitPromise: Promise<typeof import("mermaid").default> | null = null;

export function getMermaid(): Promise<typeof import("mermaid").default> {
  if (mermaidInitPromise === null) {
    mermaidInitPromise = (async () => {
      const mod = await import("mermaid");
      // securityLevel: "strict" — 사용자 입력 (PUBLIC 페이지) 의 라벨에 박힌 HTML / 이벤트 핸들러를 mermaid 가 encode 해 SVG 에 그대로 흘리지 않게 한다. innerHTML 주입과 결합한 저장형 XSS 차단.
      // CSS 토큰을 themeVariables 로 직접 주입할 수 없어 dark 프리셋 (globals.css 의 dark-first 와 정합).
      mod.default.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "strict",
        fontFamily: "var(--font-geist-sans, system-ui)",
      });
      return mod.default;
    })();
  }
  return mermaidInitPromise;
}
