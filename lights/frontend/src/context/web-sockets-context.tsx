import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { DBContents } from "../../../backend/src/types";

interface WebSocketContextType {
  sendMessage: (message: any) => void;
  isConnected: boolean;
  lastData: DBContents | null;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastData, setLastData] = useState<DBContents | null>(null);

  // useRef keeps the exact same socket reference across re-renders without re-instantiating
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Instantiate connection once on component mount
    const ws = new WebSocket(
 	"wss://lights.lucahaverty.com/ws",
    );
    socketRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = (event: MessageEvent) => {
      console.log(event);
      const data = JSON.parse(event.data);

      if (data.type == "connected") {
        console.log("CONNECTION EVENT");
      }

      console.log(data);
      if (data.type == "dashboard-update") setLastData(data.content);
    };

    // Cleanup: Close connection when the whole app/provider unmounts
    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = (message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  };

  return (
    <WebSocketContext.Provider value={{ sendMessage, isConnected, lastData }}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Reusable hook to consume the WebSocket anywhere
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context)
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider",
    );
  return context;
};
