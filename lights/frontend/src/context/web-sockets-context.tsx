import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { DBContents } from "../../../backend/src/types";
import { WS_URL } from "@/helpers";

interface WebSocketContextType {
  sendMessage: (message: any) => void;
  isConnected: boolean;
  lastData: DBContents | null;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

const RECONNECT_INTERVAL_MS = 3000;

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastData, setLastData] = useState<DBContents | null>(null);

  // useRef keeps the exact same socket reference across re-renders without re-instantiating
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    isUnmountedRef.current = false;

    const connect = () => {
      const ws = new WebSocket(WS_URL);
      socketRef.current = ws;

      ws.onopen = () => setIsConnected(true);

      ws.onclose = () => {
        setIsConnected(false);
        // Don't try to reconnect if the provider itself unmounted
        if (!isUnmountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(
            connect,
            RECONNECT_INTERVAL_MS,
          );
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        console.log(event);
        const data = JSON.parse(event.data);

        if (data.type == "connected") {
          console.log("CONNECTION EVENT");
        }

        console.log(data);
        if (data.type == "dashboard-update") setLastData(data.content);
      };
    };

    connect();

    // Cleanup: Close connection and stop any pending reconnect when the provider unmounts
    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socketRef.current?.close();
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
