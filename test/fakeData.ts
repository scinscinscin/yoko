import { z } from "zod";
import { HobbyModel, UserModel } from "./models";

export const hobbies: z.infer<typeof HobbyModel>[] = [
  { id: "1", name: "Reading", description: "I like to read" },
  { id: "2", name: "Running", description: "I like to run" },
];

export const users: z.infer<typeof UserModel>[] = [
  { id: "1", name: "John Doe" },
  { id: "2", name: "Jane Doe" },
  { id: "3", name: "Mister Doe" },
  { id: "4", name: "Miss Doe" },
];

export const relation = [
  { userId: "1", hobbyId: "1" },
  { userId: "1", hobbyId: "2" },
  { userId: "2", hobbyId: "1" },
  { userId: "3", hobbyId: "1" },
  { userId: "4", hobbyId: "2" },
];
