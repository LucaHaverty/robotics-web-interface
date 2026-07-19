import { useEffect, useState } from "react";
import { useWebSocketContext } from "./context/web-sockets-context";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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

  const pushState = async (newState: LightsState) => {
    try {
      const res = await fetch(`${BASE_URL}/api/set-state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: newState }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Request failed: ${res.status} ${errorBody}`);
      }
      // No need to update localData here — the websocket "dashboard-update"
      // message will come in and reconcile state via the useEffect above.
    } catch (err) {
      console.error("Failed to set state:", err);
      // TODO: should I revert? Probably not
    }
  };

  const handleToggle = (checked: boolean) => {
    const newState = { ...localData, stringLights: checked };
    setLocalData(newState); // optimistic update
    pushState(newState);
  };
  const handleLedRChange = (value: number | readonly number[]) => {
    const numericValue = Array.isArray(value) ? value[0] : (value as number);
    const newState = { ...localData, ledR: numericValue / 100 };
    setLocalData(newState); // optimistic update while dragging
  };

  const handleLedRCommit = (value: number | readonly number[]) => {
    const numericValue = Array.isArray(value) ? value[0] : (value as number);
    const newState = { ...localData, ledR: numericValue / 100 };
    pushState(newState);
  };

  return (
    <div className="flex flex-col gap-6 p-4 max-w-sm">
      <div className="flex items-center gap-3">
        <Switch
          checked={localData.stringLights}
          onCheckedChange={handleToggle}
        />
        <span>String Lights</span>
      </div>

      <div className="flex flex-col gap-2">
        <span>LED Brightness</span>
        <Slider
          value={Math.round(localData.ledR * 100)}
          onValueChange={handleLedRChange}
          onValueCommitted={handleLedRCommit}
          max={100}
          step={1}
        />
      </div>
    </div>
  );
}

export default App;
