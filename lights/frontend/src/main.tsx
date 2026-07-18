import { createRoot } from "react-dom/client";
import "./index.css";
import { WebSocketProvider } from "./context/web-sockets-context";
import App from "./App";

function Main() {
  return (
    <WebSocketProvider>
      <App></App>
    </WebSocketProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Main />);
