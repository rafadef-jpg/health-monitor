import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Informe um email valido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome."),
    email: z.string().email("Informe um email valido."),
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmPassword: z.string().min(8, "Confirme sua senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas precisam ser iguais.",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;
