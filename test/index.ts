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
  if (testing.data) return console.log(JSON.stringify(testing.data, null, 2));
  else console.log(testing);
});
