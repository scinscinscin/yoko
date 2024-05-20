import { z } from "zod";
import { createConverter } from "./core";
import { DefineResolver, DefineType } from "./define";

export interface YokoLitterOptions {
  types: { [key: string]: DefineType };
  queries: { [key: string]: DefineResolver };
}

export function yoko({ types, queries }: YokoLitterOptions) {
  // build Schema
  const schemaFragemnts = [] as string[];
  const converter = createConverter(
    Object.fromEntries(Object.entries(types).map(([name, definedType]) => [name, definedType.obj]))
  );

  for (const [name, definedType] of Object.entries(types)) {
    const schemaFragment = converter.processDefinedType(name, definedType);
    schemaFragemnts.push(schemaFragment);
  }

  const querySchemaFragment = converter.processResolverMap("Query", queries);
  schemaFragemnts.push(querySchemaFragment);
  const schema = schemaFragemnts.join("\n");

  function wrapRaw(parent: any, returnedTypeOfParent: z.ZodTypeAny) {
    // handle arrays
    if (returnedTypeOfParent._def.typeName === "ZodArray")
      return parent.map((x) => wrapRaw(x, returnedTypeOfParent._def.type));

    if (returnedTypeOfParent._def.typeName !== "ZodObject") return parent;

    const fieldResolvers = types[converter.map.get(returnedTypeOfParent as z.AnyZodObject)!].resolvers((x) => x);
    const returned = { ...parent };

    for (const [fieldResolverName, fieldResolver] of Object.entries(fieldResolvers)) {
      returned[fieldResolverName] = async (...args) => {
        const validatedArgs = fieldResolver.args ? await fieldResolver.args.parseAsync(args) : {};
        const bruh = await fieldResolver.resolver(parent, validatedArgs);
        return wrapRaw(bruh, fieldResolver.returns as z.ZodObject<any>);
      };
    }

    return returned;
  }

  // build resolvers
  const rootValue = {};
  for (const [name, { data: resolverData }] of Object.entries(queries)) {
    rootValue[name] = async (args, ...rest) => {
      const validatedArgs = resolverData.args ? await resolverData.args.parseAsync(args) : {};
      const raw = await resolverData.resolver(validatedArgs);
      const returned = wrapRaw(raw, resolverData.returns as z.ZodObject<any>);
      return returned;
    };
  }

  return { schema, rootValue };
}