import { describe, expect, it } from "vitest";

import { ApiError } from "./client";
import { toUserMessage } from "./errors";

describe("toUserMessage", () => {
  it("ApiError 면 백엔드 message 를 그대로 노출한다", () => {
    const error = new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "이메일 또는 비밀번호가 올바르지 않습니다.",
    );
    expect(toUserMessage(error)).toBe("이메일 또는 비밀번호가 올바르지 않습니다.");
  });

  it("ApiError 가 아니면 기본 메시지를 반환한다", () => {
    expect(toUserMessage(new Error("network"))).toBe("문제가 발생했습니다.");
    expect(toUserMessage(undefined)).toBe("문제가 발생했습니다.");
    expect(toUserMessage("string error")).toBe("문제가 발생했습니다.");
  });

  it("ApiError 의 message 가 빈 문자열 / 공백만 이면 기본 메시지로 fallback", () => {
    expect(toUserMessage(new ApiError(500, "UNKNOWN", ""))).toBe("문제가 발생했습니다.");
    expect(toUserMessage(new ApiError(500, "UNKNOWN", "   "))).toBe("문제가 발생했습니다.");
  });

  it("백엔드 메시지의 '핸들' 을 UI 용어 '사용자 이름' 으로 치환한다", () => {
    const error = new ApiError(409, "HANDLE_ALREADY_USED", "이미 사용 중인 핸들입니다.");
    expect(toUserMessage(error)).toBe("이미 사용 중인 사용자 이름입니다.");
  });

  it("백엔드 메시지에 '핸들' 이 여러 번 나와도 모두 치환한다", () => {
    const error = new ApiError(
      400,
      "INVALID",
      "핸들 형식이 잘못되었습니다. 핸들을 다시 입력해 주세요.",
    );
    expect(toUserMessage(error)).toBe(
      "사용자 이름 형식이 잘못되었습니다. 사용자 이름을 다시 입력해 주세요.",
    );
  });
});
