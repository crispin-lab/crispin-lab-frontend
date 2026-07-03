#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// 빈 문자열도 fallback 으로 흡수 — `??` 는 nullish 만 잡아 `LAB_BACKEND_PATH=""` 가 root 경로로 풀려 silent skip 되는 회귀를 막는다.
const base = process.env.LAB_BACKEND_PATH || "../crispin-lab-backend";
const cli = resolve("node_modules/.bin/openapi-typescript");

const targets = [
  {
    spec: `${base}/lab-user/app/build/api-spec/openapi3.json`,
    out: "src/lib/api/schema.user.d.ts",
  },
  {
    spec: `${base}/lab-space/app/build/api-spec/openapi3.json`,
    out: "src/lib/api/schema.space.d.ts",
  },
  {
    spec: `${base}/lab-composition/app/build/api-spec/openapi3.json`,
    out: "src/lib/api/schema.composition.d.ts",
  },
];

// 백엔드 워크트리가 모듈별로 빌드 산출을 가지지 않을 수 있다 (한 워크트리가 lab-space 만, 다른 워크트리는 lab-user 만).
// 누락된 spec 은 건너뛰고 끝에 요약 — 부분 갱신을 막지 않는다.
let regenerated = 0;
const skipped = [];

for (const { spec, out } of targets) {
  const absSpec = resolve(spec);
  if (!existsSync(absSpec)) {
    skipped.push(absSpec);
    continue;
  }
  console.log(`[api:gen] ${absSpec} → ${out}`);
  execFileSync(cli, [absSpec, "-o", out], { stdio: "inherit" });
  regenerated += 1;
}

if (skipped.length > 0) {
  console.warn(`\n[api:gen] 누락 spec 을 건너뜀 (해당 schema 는 이전 상태 유지):`);
  for (const path of skipped) console.warn(`  - ${path}`);
}

if (regenerated === 0) {
  console.error(
    `\n[api:gen] 갱신된 schema 가 없습니다.\n` +
      `  LAB_BACKEND_PATH 를 backend repo / 워크트리 root 로 설정하거나, 해당 모듈을 먼저 빌드하세요.\n` +
      `  예) export LAB_BACKEND_PATH=/Users/you/git/worktree/personal/crispin-lab-backend/<worktree>`,
  );
  process.exit(1);
}
