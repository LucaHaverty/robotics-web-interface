import { WebSocketServer, WebSocket } from "ws";
import db from "../db/database";
import { DBContents, LightsState } from "../types";

class Websockets {
  private wss = new WebSocketServer({ port: 8080 });
  private clients = new Set<WebSocket>();

  constructor() {
    this.wss.on("connection", (ws) => {
      console.log("Websockets client connected");
      this.clients.add(ws);

      ws.on("message", (data) => {
        console.log("Received:", data.toString());
      });

      ws.on("close", () => {
        console.log("Websockets client disconnected");
        this.clients.delete(ws);
      });

      ws.send(
        JSON.stringify({
          type: "connected",
          timestamp: Date.now(),
        }),
      );
      this.sendData(db.getData());
    });
  }

  public sendData(data: DBContents | undefined) {
    if (data == undefined) return;

    const message = JSON.stringify({ type: "dashboard-update", content: data });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
}

const ws = new Websockets();
export default ws;
