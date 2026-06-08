import { ApiError } from "./client";

export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const message = error.message.trim();
    return message || "문제가 발생했습니다.";
  }
  return "문제가 발생했습니다.";
}
