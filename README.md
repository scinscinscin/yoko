## Yoko - a declarative approach to GraphQL

Yoko allows developers to create GraphQL type definitions and resolvers without the need for classes, aiming to be the complete opposite of TypeGraphQL.


### Getting started

To get started, create a new TypeScript project and install `@scinorandex/yoko`

In this example, we're going to create a graphql schema that looks like this:

```graphql
type User {
  id: String!
  name: String!
  hobbies: [Hobby!]!
  capitalized(suffix: String): String!
}

type Hobby {
  id: String!
  name: String!
  description: String!
  users: [User!]!
}

type Query {
  getUser(id: String!): User!
  getUsers(id: String!): [User!]!
}

type Mutation {
  createUser(name: String!): User!
}
```

---

**Defining base fields**

[Zod](https://github.com/colinhacks/zod) is used to define the base fields of a model. Currently, only boolean, strings, numbers, and their optional versions are supported.

```ts
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

```

---

**Defining field resolvers**

Once our models have been defined, we can define their associated resolvers using the `defineType()` method. This method accepts the base model as the 1st argument, and a function that returns an object containing resolvers as the 2nd argument.

The second argument is given a function as a parameter, named `defineField` in this case, that allows us to have typesafe field resolvers.

```ts
import { defineResolver, defineType, yoko } from "@scinorandex/yoko"

const UserType = defineType(UserModel, (defineField) => ({
  // Defines a field resolver called "hobbies" in the UserType
  hobbies: defineField({
    // This field resolver accepts no arguments
    args: undefined,
    
    // Define what this field resolver returns, in this case an array of `Hobby`s. 
    // Currently it only supports literal type, models, and their optional versions.
    returns: z.array(HobbyValidator),

    // Define the function that computes the field from its parent
    // parent is completely typesafe. In this case, it's type is { id: string, name: string }
    resolver: (parent) => {
      // find and return all hobbies that the user has
      return relation.filter((r) => r.userId === parent.id).map((r) => hobbies.find((h) => h.id === r.hobbyId)!);
    },
  }),

  // This field resolver accepts an optional suffix parameter and returns a string
  // It computes the field from the parent's name property and the suffix parameter
  capitalized: defineField({
    args: z.object({ suffix: z.string().optional() }),
    returns: z.string(),
    resolver: (parent, args) => parent.name.toUpperCase() + (args.suffix ?? ""),
  }),
}));
```

We can then define the Hobby model's resovlers the exact same way

```ts
const HobbyType = defineType(HobbyModel, (defineField) => ({
  users: defineField({
    returns: z.array(UserModel),
    args: undefined,
    resolver: (parent) => {
      const filtered = relation.filter((r) => r.hobbyId === parent.id);
      return filtered.map((r) => users.find((user) => user.id === r.userId)!);
    },
  }),
}));
```

---

**Defining queries and mutations**

Queries and mutations are written as resolver maps. These are objects whose key is the name of the query / mutation and the value is a resovler endpoint.

A resolver endpoint is defined using the `defineResolver()` method, that works very similar to the `defineType()` method. It accepts an object that defines the parameters, return type, and function for that resolver.

```ts
const queries = {
  // The getUser query returns a user model and requires an argument named id.
  // It throws an error if a user was not found with that ID.
  getUser: defineResolver({
    returns: UserModel,
    args: z.object({ id: z.string() }),
    resolver: async ({ id }) => {
      const user = users.find((user) => user.id === id);
      if (user) return user;
      else throw new Error("User not found");
    },
  }),

  // The getUsers query returns an array of users, requiring no arguments
  getUsers: defineResolver({
    returns: z.array(UserModel),
    args: undefined,
    resolver: () => users,
  }),
};

let maxId = 4;
const mutations = {
  // The createUser mutation requires a name string parameter,
  // and returns the newly created user object.
  createUser: defineResolver({
    returns: UserModel,
    args: z.object({ name: z.string() }),
    async resolver({ name }) {
      const user = { id: (++maxId).toString(), name };
      users.push(user);
      return user;
    },
  }),
};
```

---

**Building it all together**

Once our types, queries, and mutations are complete, we use the `yoko()` function to build the `schema` and `rootValue` that we run queries against.

```ts
// schema is a GraphQLSchema object that can be passed into the `graphql()` function or be used by a library.
// rootValue is the object that merges the query and mutation resolver maps.
// schemaString is a stringified version of the GraphQL schema, that can be saved to a `schema.graphql` file.
export const { schema, schemaString, rootValue } = yoko({
  // The keys on the types object matter, these keys are reflected on the type in the schema
  types: { User: UserType, Hobby: HobbyType },
  queries,
  mutations,
});
```

---

**Example usage (no api)**

We can query against the schema and resolvers using the `graphql()` function from the `graphql` package.

```ts
import { graphql } from "graphql";
import { schema, rootValue } from "./schema";

const query = `
{
  getUser(id: "1") {
    id, name, capitalized(suffix: " - is the soldier")
    
    hobbies {
      id, name
    }
  }
}
`;

graphql({ schema, rootValue, source: query }).then((testing) => {
  if (testing.data) return console.log(JSON.stringify(testing.data));
  else console.log(testing);
});
```

Which prints:

```
{
  "getUser": {
    "id": "1",
    "name": "John Doe",
    "capitalized": "JOHN DOE - is the soldier",
    "hobbies": [
      {
        "id": "1",
        "name": "Reading"
      },
      {
        "id": "2",
        "name": "Running"
      }
    ]
  }
}
```

---

**Example usage (with API)**

We can serve a GraphQL API very easily using the `graphql-http` package and `ruru` for graphiql

```ts
import { createHandler } from "graphql-http/lib/use/http";
import { rootValue, schema } from "./schema";
import express from "express";
import { ruruHTML } from "ruru/server";

async function main() {
  const app = express();

  // Serve ruru on /graphql as a playground
  app.get("/graphql", (req, res, next) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(ruruHTML({ endpoint: "/graphql" }));
  });
  
  // Create the handler using the schema we built from Yoko
  app.post("/graphql", createHandler({ schema, rootValue }));

  // Start the server on port 7000
  app.listen(7000, () => console.log("Server is running on port 7000"));
}

main().catch(console.error);
```