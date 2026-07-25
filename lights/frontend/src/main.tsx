import { createRoot } from "react-dom/client";
import "./index.css";
import { WebSocketProvider } from "./context/web-sockets-context";
import App from "./App";
import { ThemeProvider } from "./components/theme-provider";

function Main() {
  return (
    <WebSocketProvider>
      <ThemeProvider>
        <App></App>
      </ThemeProvider>
    </WebSocketProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Main />);
