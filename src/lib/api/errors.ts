import { ApiError } from "./client";

export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "문제가 발생했습니다.";
}
