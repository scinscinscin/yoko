import { z } from "zod";

export const Hobby = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

export const User = z.object({
  id: z.string(),
  name: z.string(),
});
