import { z } from "zod";

export const HobbyModel = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

export const UserModel = z.object({
  id: z.string(),
  name: z.string(),
});
