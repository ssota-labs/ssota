import { z } from "zod";

export const betaSignupRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "이메일을 입력해 주세요.")
    .email("올바른 이메일 주소를 입력해 주세요.")
    .max(320),
});

export type BetaSignupRequest = z.infer<typeof betaSignupRequestSchema>;
