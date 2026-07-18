import app from "./app";

import "./db/schema";

app.listen(5001, () => {
  console.log("Server started");
});
