import app from "./app";
import "./ws/websockets";

app.listen(5001, () => {
  console.log("Server started");
});
