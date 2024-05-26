import { hobbies, relation, users } from "./fakeData";
import { z } from "zod";
import { defineResolver, defineType, yoko } from "../src";
import { HobbyModel, UserModel } from "./models";

const UserType = defineType(UserModel, (defineField) => ({
  hobbies: defineField({
    returns: z.array(HobbyModel),
    args: undefined,
    resolver: (parent) => {
      return relation.filter((r) => r.userId === parent.id).map((r) => hobbies.find((h) => h.id === r.hobbyId)!);
    },
  }),

  capitalized: defineField({
    // args: z.object({ foo: z.string().nullable() }),
    args: z.object({ suffix: z.string().nullable() }),
    returns: z.string(),
    resolver: (parent, args) => parent.name.toUpperCase() + (args.suffix ?? ""),
  }),
}));

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

const queries = {
  getUser: defineResolver({
    returns: UserModel,
    args: z.object({ id: z.string() }),
    resolver: async ({ id }) => {
      const user = users.find((user) => user.id === id);
      if (user) return user;
      else throw new Error("User not found");
    },
  }),

  getUsers: defineResolver({
    returns: z.array(UserModel),
    args: undefined,
    resolver: () => users,
  }),
};

let maxId = 4;
const mutations = {
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

export const { schema, rootValue, schemaString } = yoko({
  types: { User: UserType, Hobby: HobbyType },
  queries,
  mutations,
});
