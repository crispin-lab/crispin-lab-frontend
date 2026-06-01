import { ApiError } from "./client";

// 백엔드 메시지가 "핸들" 용어를 쓰는데 UI 는 "사용자 이름" 으로 통일 — 백엔드 한국어화까지 임시 봉합.
function localize(message: string): string {
  return message.replaceAll("핸들", "사용자 이름");
}

export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const message = localize(error.message).trim();
    return message || "문제가 발생했습니다.";
  }
  return "문제가 발생했습니다.";
}
