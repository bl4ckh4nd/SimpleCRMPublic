import { z } from "zod";

export const directConnectionSchema = z.object({
  server: z.string().trim().min(1),
  database: z.string().trim().min(1),
  user: z.string().trim().min(1),
  password: z.string().min(12),
  port: z.number().int().min(1).max(65535),
  encrypt: z.literal(true, { error: "TLS_REQUIRED" }),
  trustServerCertificate: z.boolean(),
});

export type DirectConnection = z.infer<typeof directConnectionSchema>;
export const validateDirectConnection = (value: unknown) => directConnectionSchema.parse(value);
