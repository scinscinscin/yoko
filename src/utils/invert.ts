import { z } from "zod";

export function invert(entities: { [key: string]: z.ZodObject<any> }) {
  const objects = new Map<z.ZodObject<any>, string>();
  for (const [key, value] of Object.entries(entities)) {
    objects.set(value, key);
  }
  return objects;
}
