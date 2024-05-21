import { buildSchema, graphql } from "graphql";
import { schema, rootValue } from "./schema";

const query = `
{
  getUser(id: "1") {
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
