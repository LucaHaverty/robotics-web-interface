import { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { WebSocketProvider } from "./context/web-sockets-context";
import App from "./App";
import { isDev } from "./helpers";

function Main() {
  const [baseUrl] = useState(
    isDev ? "http://localhost:5001" : "https://lights.lucahaverty.com",
  );

  return (
    <WebSocketProvider>
      <App></App>
    </WebSocketProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Main />);
