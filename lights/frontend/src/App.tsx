import { useEffect, useState } from "react";
import { useWebSocketContext } from "./context/web-sockets-context";
import { Switch } from "@/components/ui/switch";
import { BASE_URL } from "./helpers";
import { initialState, type LightsState } from "../../backend/src/types";

function App() {
  const { lastData } = useWebSocketContext();

  // Local, optimistic copy of the toggle state
  const [localData, setLocalData] = useState<LightsState>(initialState());

  // Whenever the server pushes new data over the websocket, treat it as
  // the source of truth and sync local state to it.
  useEffect(() => {
    if (lastData?.currentState.stringLights !== undefined) {
      setLocalData(lastData.currentState);
    }
  }, [lastData]);

  const handleToggle = async (checked: boolean) => {
    // Optimistically update immediately so the UI feels responsive
    const newState = { ...localData, stringLights: checked };
    setLocalData(newState);

    console.log(lastData);

    try {
      const res = await fetch(`${BASE_URL}/api/set-state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: newState }),
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status} ${res.json()}`);
      }
      // No need to setStringLights here — the websocket "dashboard-update"
      // message will come in and reconcile state via the useEffect above.
    } catch (err) {
      console.error("Failed to set state:", err);
      // Revert optimistic update on failure since we won't get a
      // websocket confirmation for a request that never succeeded
      // TODO: should I revert? Probably not
      //   setStringLights(!checked);
    }
  };

  return (
    <Switch checked={localData.stringLights} onCheckedChange={handleToggle} />
  );
}

export default App;
