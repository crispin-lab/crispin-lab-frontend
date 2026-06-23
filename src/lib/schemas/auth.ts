import { z } from "zod";

const HANDLE_REGEX = /^[a-z0-9_]{3,30}$/;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const PASSWORD_REQUIRED_VARIETY = 2;
const IDENTITY_SIMILARITY_MIN_LENGTH = 4;

const baseSignupObject = z.object({
  email: z
    .string()
    .trim()
    .min(1, "이메일을 입력해 주세요.")
    .email("올바른 이메일 형식이 아닙니다."),
  handle: z
    .string()
    .trim()
    .min(1, "사용자 이름을 입력해 주세요.")
    .regex(HANDLE_REGEX, "사용자 이름은 영문 소문자·숫자·밑줄 3~30자입니다."),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});

function checkPasswordPolicy(
  data: { email: string; handle: string; password: string },
  ctx: z.RefinementCtx,
): void {
  const { email, handle, password } = data;
  if (password === "") return;

  if (/^\s/.test(password) || /\s$/.test(password)) {
    ctx.addIssue({
      code: "custom",
      path: ["password"],
      message: "비밀번호 양 끝에는 공백을 사용할 수 없습니다.",
    });
    return;
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    ctx.addIssue({
      code: "custom",
      path: ["password"],
      message: `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 입력해 주세요.`,
    });
    return;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    ctx.addIssue({
      code: "custom",
      path: ["password"],
      message: `비밀번호는 ${PASSWORD_MAX_LENGTH}자를 넘을 수 없습니다.`,
    });
    return;
  }
  if (countCategories(password) < PASSWORD_REQUIRED_VARIETY) {
    ctx.addIssue({
      code: "custom",
      path: ["password"],
      message: "비밀번호에 영문/숫자/그 외 문자 중 두 종류 이상을 포함해 주세요.",
    });
    return;
  }
  if (containsIdentity(password, email, handle)) {
    ctx.addIssue({
      code: "custom",
      path: ["password"],
      message: "비밀번호에 이메일이나 사용자 이름을 포함할 수 없습니다.",
    });
  }
}

function countCategories(raw: string): number {
  const seen = new Set<"letter" | "digit" | "other">();
  for (const char of raw) {
    if ((char >= "a" && char <= "z") || (char >= "A" && char <= "Z")) {
      seen.add("letter");
    } else if (char >= "0" && char <= "9") {
      seen.add("digit");
    } else {
      seen.add("other");
    }
    if (seen.size >= PASSWORD_REQUIRED_VARIETY) return seen.size;
  }
  return seen.size;
}

function containsIdentity(password: string, email: string, handle: string): boolean {
  const lowered = password.toLowerCase();
  const emailLocal = email.toLowerCase().split("@")[0];
  const handleLowered = handle.toLowerCase();
  return (
    (emailLocal.length >= IDENTITY_SIMILARITY_MIN_LENGTH && lowered.includes(emailLocal)) ||
    (handleLowered.length >= IDENTITY_SIMILARITY_MIN_LENGTH && lowered.includes(handleLowered))
  );
}

export const signupSchema = baseSignupObject;

export type SignupInput = z.infer<typeof signupSchema>;

export const signupFormSchema = baseSignupObject
  .extend({
    passwordConfirm: z.string().min(1, "비밀번호 확인을 입력해 주세요."),
  })
  .superRefine(checkPasswordPolicy)
  .superRefine((data, ctx) => {
    if (data.passwordConfirm !== "" && data.password !== data.passwordConfirm) {
      ctx.addIssue({
        code: "custom",
        path: ["passwordConfirm"],
        message: "비밀번호가 일치하지 않습니다.",
      });
    }
  });

export type SignupFormInput = z.infer<typeof signupFormSchema>;

export function toSignupInput(form: SignupFormInput): SignupInput {
  return { email: form.email, handle: form.handle, password: form.password };
}
