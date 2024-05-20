import { buildSchema, graphql } from "graphql";
import { hobbies, relation, users } from "./fakeData";
import { z } from "zod";
import { defineResolver, defineType, yoko } from "../src";

const HobbyValidator = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

const UserValidator = z.object({
  id: z.string(),
  name: z.string(),
});

const UserType = defineType(UserValidator, (defineField) => ({
  hobbies: defineField({
    returns: z.array(HobbyValidator),
    args: undefined,
    resolver: (parent) => {
      return relation.filter((r) => r.userId === parent.id).map((r) => hobbies.find((h) => h.id === r.hobbyId)!);
    },
  }),

  capitalized: defineField({
    // args: z.object({ foo: z.string().nullable() }),
    args: undefined,
    returns: z.string(),
    resolver: (parent, args) => parent.name.toUpperCase(),
  }),
}));

const HobbyType = defineType(HobbyValidator, (defineField) => ({
  users: defineField({
    returns: z.array(UserValidator),
    args: undefined,
    resolver: (parent) => {
      const filtered = relation.filter((r) => r.hobbyId === parent.id);
      return filtered.map((r) => users.find((user) => user.id === r.userId)!);
    },
  }),
}));

const queries = {
  getUser: defineResolver({
    returns: UserValidator,
    args: z.object({ id: z.string() }),
    resolver({ id }) {
      return { id: "1", name: "John Doe" };
    },
  }),
};

const { schema, rootValue } = yoko({
  types: { User: UserType, Hobby: HobbyType },
  queries,
});

const query = `
{
  getUser(id: "bruhMoment") {
    id, name, capitalized
    
    hobbies {
      id, name
      
      users {
        id, name
      }
    }
  }
}
`;
graphql({ schema: buildSchema(schema), source: query, rootValue }).then((testing) => {
  if (testing.data) return console.log(JSON.stringify(testing.data, null, 2));
  else console.log(testing);
});
