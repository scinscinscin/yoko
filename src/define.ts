import { AnyZodObject, ZodType, z } from "zod";

export type PromiseOrSync<T> = T | Promise<T>;
export type Anything = ZodType<any, any, any>;
type Resolver = {
  args?: z.ZodObject<any>;
  returns: Anything;
  resolver: (parent: Anything, args: z.infer<Anything>) => PromiseOrSync<any>;
};

export function defineType<T extends Zod.AnyZodObject>(
  obj: T,
  resolvers: (
    defineField: <ReturnType extends Anything, Args extends z.ZodObject<any> | undefined>(data: {
      args: Args;
      returns: ReturnType;
      resolver: (
        parent: z.infer<T>,
        args: Args extends z.ZodObject<any> ? z.infer<Args> : unknown
      ) => PromiseOrSync<z.infer<ReturnType>>;
    }) => Resolver
  ) => { [key: string]: Resolver }
) {
  // obj is bare type and resolvers is a map of functions, key is te custom field name
  // and value is an object that contains args, return type and resolver
  return { obj, resolvers };
}

export function defineResolver<ReturnType extends Anything, Args extends z.ZodObject<any> | undefined>(data: {
  args: Args;
  returns: ReturnType;
  resolver: (args: Args extends z.ZodObject<any> ? z.infer<Args> : unknown) => PromiseOrSync<z.infer<ReturnType>>;
}) {
  return { data };
}

export type DefineResolver = ReturnType<typeof defineResolver<any, any>>;
export type DefineType = ReturnType<typeof defineType<any>>;
