import { z } from "zod";

const HANDLE_REGEX = /^[a-z0-9_]{3,30}$/;

export const signupSchema = z.object({
  email: z.string().min(1, "이메일을 입력해 주세요.").email("올바른 이메일 형식이 아닙니다."),
  handle: z
    .string()
    .min(1, "사용자 이름을 입력해 주세요.")
    .regex(HANDLE_REGEX, "사용자 이름은 영문 소문자·숫자·밑줄 3~30자입니다."),
  password: z.string().min(8, "비밀번호는 8자 이상 입력해 주세요."),
});

export type SignupInput = z.infer<typeof signupSchema>;
