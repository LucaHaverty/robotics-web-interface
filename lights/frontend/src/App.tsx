import { useEffect, useState } from "react";
import { useWebSocketContext } from "./context/web-sockets-context";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { BASE_URL } from "./helpers";
import {
  newDb,
  type DBContents,
  type LightsState,
  type Template,
} from "../../backend/src/types";
import { TemplateCard } from "./panels/template";
import { Card } from "./components/ui/card";

function App() {
  const { lastData } = useWebSocketContext();
  const [localData, setLocalData] = useState<DBContents>(newDb());

  useEffect(() => {
    if (lastData?.currentState !== undefined) {
      setLocalData(lastData);
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

  const applyTemplate = async (template: Template) => {
    await fetch(`${BASE_URL}/api/apply-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: template.name }),
    });
  };

  const deleteTemplate = async (template: Template) => {
    await fetch(`${BASE_URL}/api/delete-template`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: template.name }),
    });
  };

  const newTemplate = async () => {
    const name = prompt("Template name?");

    await fetch(`${BASE_URL}/api/create-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, replace: true }),
    });
  };

  /**
   * One generic updater for any field in LightsState.
   * - Always updates local state immediately (optimistic).
   * - Only hits the server when `commit` is true.
   * This replaces the need for a handleXChange/handleXCommit pair per field.
   */
  const updateField = <K extends keyof LightsState>(
    key: K,
    value: LightsState[K],
    commit = true,
  ) => {
    setLocalData((prev) => {
      const newState = {
        ...prev,
        currentState: { ...prev.currentState, [key]: value },
      };
      if (commit) pushState(newState.currentState);
      return newState;
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {localData.templates.map((t, index) => (
          <TemplateCard
            key={index}
            template={t}
            onClick={() => {
              applyTemplate(t);
            }}
            onDelete={() => {
              deleteTemplate(t);
            }}
            active={t.name == localData.appliedTemplate}
          ></TemplateCard>
        ))}
        <Card size="sm" onClick={() => newTemplate()}>
          <p>Create New Template</p>
        </Card>
      </div>
      <div className="flex flex-col gap-6 p-4 max-w-sm">
        <div className="flex items-center gap-3">
          <Switch
            checked={localData.currentState.stringLights}
            onCheckedChange={(checked) => updateField("stringLights", checked)}
          />
          <span>String Lights</span>
        </div>

        <PercentSlider
          label="LED R"
          value={localData.currentState.ledR}
          onChange={(v) => updateField("ledR", v, false)}
          onCommit={(v) => updateField("ledR", v, true)}
        />
        <PercentSlider
          label="LED G"
          value={localData.currentState.ledG}
          onChange={(v) => updateField("ledG", v, false)}
          onCommit={(v) => updateField("ledG", v, true)}
        />
        <PercentSlider
          label="LED B"
          value={localData.currentState.ledB}
          onChange={(v) => updateField("ledB", v, false)}
          onCommit={(v) => updateField("ledB", v, true)}
        />
      </div>
    </>
  );
}

/**
 * Reusable 0–1 (stored) <-> 0–100 (displayed) slider.
 * Handles the "drag = optimistic, release = commit" pattern once,
 * instead of once per LED channel.
 */
function PercentSlider({
  label,
  value,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
}) {
  const toNumeric = (raw: number | readonly number[]) =>
    (Array.isArray(raw) ? raw[0] : (raw as number)) / 100;

  return (
    <div className="flex flex-col gap-2">
      <span>{label}</span>
      <Slider
        value={Math.round(value * 100)}
        onValueChange={(raw) => onChange(toNumeric(raw))}
        onValueCommitted={(raw) => onCommit(toNumeric(raw))}
        max={100}
        step={1}
      />
    </div>
  );
}

export default App;
