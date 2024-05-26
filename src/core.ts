import { match } from "ts-pattern";
import z from "zod";
import { Anything, DefineResolver, DefineType } from "./define";
import { invert } from "./utils/invert";

type ASTNode =
  | { type: "object"; name: string; nullable: boolean }
  | { type: "array"; insideType: ASTNode; nullable: boolean }
  | { type: "string"; nullable: boolean }
  | { type: "number"; nullable: boolean }
  | { type: "boolean"; nullable: boolean }
  | { type: "fieldResolver"; args?: z.ZodObject<any>; returnType: ASTNode; nullable: boolean };

export function stringifyAstNode(ast: ASTNode): string {
  const stringified = match(ast)
    .with({ type: "object" }, (res) => res.name)
    .with({ type: "array" }, (res) => `[${stringifyAstNode(res.insideType)}]`)
    .with({ type: "fieldResolver" }, (res) => `${stringifyAstNode(res.returnType)}`)
    .with({ type: "string" }, (res) => "String")
    .with({ type: "number" }, (res) => "Int")
    .with({ type: "boolean" }, (res) => "Boolean")
    .exhaustive();

  return stringified + (ast.nullable ? "" : "!");
}

export function createConverter(entities: { [key: string]: z.ZodObject<any> }) {
  const map = invert(entities);

  function generateSchemaTypeFromAstNodes(
    typeName: string,
    ast: { [key: string]: ASTNode },
    what: "type" | "input" = "type"
  ) {
    const ret: string[] = [];
    for (const [name, value] of Object.entries(ast)) {
      const pattern = stringifyAstNode(value);

      // need to stringify the parameters here
      const parameters = value.type === "fieldResolver" && value.args ? `(${convertArguments(value.args)})` : "";
      ret.push(`  ${name}${parameters}: ${pattern}\n`);
    }

    return `${what} ${typeName} {\n${ret.join("")}}`;
  }

  function convertZodTypeToAstNode(zodValidator: z.ZodType<any, any>): ASTNode {
    switch (zodValidator._def.typeName) {
      case "ZodString":
        return { type: "string", nullable: false };
      case "ZodNumber":
        return { type: "number", nullable: false };
      case "ZodBoolean":
        return { type: "boolean", nullable: false };

      case "ZodArray":
        return {
          type: "array",
          insideType: convertZodTypeToAstNode(zodValidator._def.type as z.ZodType<any, any>),
          nullable: false,
        };

      case "ZodObject":
        if (map.has(zodValidator as z.ZodObject<any>))
          return { type: "object", name: map.get(zodValidator as z.ZodObject<any>)!, nullable: false };
        else throw new Error("Unknown ZodObject Type");

      case "ZodNullable":
      case "ZodOptional":
        return { ...convertZodTypeToAstNode(zodValidator._def.innerType), nullable: true };

      default:
        throw new Error("unknown type: " + zodValidator._def.typeName);
    }
  }

  function rootConverter(zodObject: z.ZodObject<any>) {
    const fields = Object.entries(zodObject._def.shape());
    const ret: { [key: string]: ASTNode } = {};

    for (const [name, zodValidator] of fields) ret[name] = convertZodTypeToAstNode(zodValidator as z.ZodType<any, any>);
    return ret;
  }

  function convertArguments(obj: z.ZodObject<any>) {
    let ret: string[] = [];

    const parameters = rootConverter(obj);
    Object.entries(parameters).forEach(([name, value]) => {
      const stringifiedValue = stringifyAstNode(value);
      ret.push(`${name}: ${stringifiedValue}`);
    });

    return ret.join(", ");
  }

  function processDefinedType(graphqlTypeName: string, definedType: DefineType) {
    const ast = rootConverter(definedType.obj);

    const resolvers = definedType.resolvers((x) => x);
    Object.entries(resolvers).forEach(([name, { resolver, returns, args }]) => {
      const returnType = convertZodTypeToAstNode(returns);
      ast[name] = { type: "fieldResolver", returnType, args, nullable: true };
    });

    // console.log(ast);
    return generateSchemaTypeFromAstNodes(graphqlTypeName, ast);
  }

  function processResolver(resolverName: string, definedResolver: DefineResolver) {
    const {
      data: { returns, args, resolver },
    } = definedResolver;

    const returnType = convertZodTypeToAstNode(returns as z.ZodObject<any>);
    const parameters = args != undefined ? `(${convertArguments(args as z.ZodObject<any>)})` : "";
    return `  ${resolverName}${parameters}: ${stringifyAstNode(returnType)}`;
  }

  function processResolverMap(queryName: string, resolvers: { [key: string]: DefineResolver }) {
    const stringifiedResolvers: string[] = [];

    for (const [name, definedResolver] of Object.entries(resolvers)) {
      stringifiedResolvers.push(processResolver(name, definedResolver));
    }

    if (stringifiedResolvers.length == 0) return "";
    const ret = `type ${queryName} {\n${stringifiedResolvers.join("\n")}\n}`;
    return ret;
  }

  return { processDefinedType, processResolverMap, map };
}
