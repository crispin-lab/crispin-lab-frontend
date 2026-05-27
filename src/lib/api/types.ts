// 백엔드 spec 의 schema 이름이 path-hash 자동 생성이라 (예: v1-pages365256445)
// 호출부 직접 import 차단을 위해 본 파일에서 별칭한다. 도메인 alias 는 사용처 등장 시 추가.
export type { components as UserComponents } from "./schema.user";
export type { components as SpaceComponents } from "./schema.space";
