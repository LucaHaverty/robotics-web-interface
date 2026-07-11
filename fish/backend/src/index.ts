import app from "./app";

import "./db/schema";

app.listen(5000, () => {
  console.log("Server started");
});
