import { createHandler } from "graphql-http/lib/use/http";
import { rootValue, schema } from "./schema";
import express from "express";
import { ruruHTML } from "ruru/server";

async function main() {
  const app = express();

  app.get("/graphql", (req, res, next) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(ruruHTML({ endpoint: "/graphql" }));
  });
  app.post("/graphql", createHandler({ schema, rootValue }));

  app.listen(7000, () => console.log("Server is running on port 7000"));
}

main().catch(console.error);
