// App.tsx
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
import { PlusIcon } from "lucide-react";

// --- display-only color math --------------------------------------------
// LightsState now stores hue/saturation/brightness directly — this
// conversion exists purely so the preview swatch and slider gradients have
// something to paint with. Nothing here is sent to the backend.

function hsvToRgbCss(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return `rgb(${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)})`;
}

// Cosmetic blend for a warm/cool fixture's preview swatch — display only,
// not sent to the backend, which still receives the three raw slider values.
const warmBase = [255, 184, 112];
const coolBase = [153, 221, 255];
function whiteMixCss(warm: number, cool: number) {
  // const total = warm + cool || 1;
  // const mixed = warmBase.map((w, i) => (w * warm + coolBase[i] * cool) / total);
  const mixed = warmBase.map((w, i) => {
    return w * (warm * 0.7) + coolBase[i] * (cool * 0.7);
  });
  return `rgb(${mixed.map((c) => Math.round(c)).join(", ")})`;
}

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
    } catch (err) {
      console.error("Failed to set state:", err);
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
    const confirmed = window.confirm(`Delete preset "${template.name}"?`);
    if (!confirmed) return;

    await fetch(`${BASE_URL}/api/delete-template`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: template.name }),
    });
  };

  const newTemplate = async () => {
    const name = prompt("Preset name");
    await fetch(`${BASE_URL}/api/create-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, replace: true }),
    });
  };

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

  const {
    hue,
    saturation,
    value,
    stringLights,
    warmWhite1,
    coolWhite1,
    warmWhite2,
    coolWhite2,
  } = localData.currentState;

  const accentPreview = hsvToRgbCss(hue, saturation, value);
  const hueColor = hsvToRgbCss(hue, 1, 1);
  // Endpoints of the saturation slider's own track, so it previews what
  // dragging it will actually do to the current hue.
  const satLowCss = hsvToRgbCss(hue, 0, value);
  const satHighCss = hsvToRgbCss(hue, 1, value);

  return (
    <div className="min-h-screen bg-[#121016] px-5 py-10 text-[#EDE9F7] sm:px-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        {/* Presets */}
        <section className="flex flex-col gap-4">
          <p className="font-['Space_Grotesk'] text-xs font-medium uppercase tracking-[0.2em] text-[#aea3ba]">
            Presets
          </p>
          <div className="flex flex-wrap gap-3">
            {localData.templates.map((t, index) => (
              <TemplateCard
                key={index}
                template={t}
                onClick={() => applyTemplate(t)}
                onDelete={() => deleteTemplate(t)}
                active={t.name == localData.appliedTemplate}
              />
            ))}
            <button
              onClick={() => newTemplate()}
              className="flex items-center gap-2 rounded-xl border border-dashed border-[#34303F] px-4 py-3 text-sm text-[#aea3ba] transition-colors duration-200 hover:border-[#aea3ba] hover:text-[#EDE9F7]"
            >
              <PlusIcon className="size-4" />
              New Preset
            </button>
          </div>
        </section>

        {/* Console */}
        <section className="flex flex-col gap-4">
          <p className="font-['Space_Grotesk'] text-xs font-medium uppercase tracking-[0.2em] text-[#aea3ba]">
            Configuration
          </p>

          {/* String lights — its own widget: a single boolean device, kept
              visually separate from the dimmable RGB / white fixtures */}
          <div className="flex items-center justify-between rounded-2xl border border-[#34303F] bg-[#1C1922] px-6 py-4">
            <div className="flex items-center gap-3">
              <span
                className={`size-2 rounded-full transition-colors duration-200 ${
                  stringLights ? "bg-[#FFB870]" : "bg-[#34303F]"
                }`}
              />
              <span className="font-['Space_Grotesk'] text-sm font-medium">
                String lights
              </span>
            </div>
            <Switch
              checked={stringLights}
              onCheckedChange={(checked) =>
                updateField("stringLights", checked)
              }
              className="data-[state=checked]:bg-[#FFB870]"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Accent light: hue + saturation + brightness */}
            <div className="flex flex-col gap-6 rounded-2xl border border-[#34303F] bg-[#1C1922] p-6">
              <div className="flex items-center gap-4">
                <div
                  className="size-10 shrink-0 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: accentPreview,
                    boxShadow: `0 0 24px 2px ${accentPreview}`,
                  }}
                />
                <span className="font-['Space_Grotesk'] text-sm font-medium">
                  Accent
                </span>
              </div>

              <div className="flex flex-col gap-6">
                <HueSlider
                  hue={hue}
                  hueColor={hueColor}
                  onCommit={(h) => updateField("hue", h, true)}
                />
                <GradientSlider
                  label="Saturation"
                  fromCss={satLowCss}
                  toCss={satHighCss}
                  value={saturation}
                  onCommit={(s) => updateField("saturation", s, true)}
                />
                <ChannelSlider
                  label="Brightness"
                  color="#D8D3E8"
                  value={value}
                  onCommit={(v) => updateField("value", v, true)}
                />
              </div>
            </div>

            {/* White fixture A */}
            <div className="flex flex-col gap-6 rounded-2xl border border-[#34303F] bg-[#1C1922] p-6">
              <div className="flex items-center gap-4">
                <div
                  className="size-10 shrink-0 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: whiteMixCss(warmWhite1, coolWhite1),
                    boxShadow: `0 0 24px 2px ${whiteMixCss(warmWhite1, coolWhite1)}`,
                  }}
                />
                <span className="font-['Space_Grotesk'] text-sm font-medium">
                  Ring Light
                </span>
              </div>

              <div className="flex flex-col gap-6">
                <ChannelSlider
                  label="Warm"
                  color="#FFB870"
                  value={warmWhite1}
                  onCommit={(v) => updateField("warmWhite1", v, true)}
                />
                <ChannelSlider
                  label="Cool"
                  color="#7FD8FF"
                  value={coolWhite1}
                  onCommit={(v) => updateField("coolWhite1", v, true)}
                />
              </div>
            </div>

            {/* White fixture B */}
            <div className="flex flex-col gap-6 rounded-2xl border border-[#34303F] bg-[#1C1922] p-6">
              <div className="flex items-center gap-4">
                <div
                  className="size-10 shrink-0 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: whiteMixCss(warmWhite2, coolWhite2),
                    boxShadow: `0 0 24px 2px ${whiteMixCss(warmWhite2, coolWhite2)}`,
                  }}
                />
                <span className="font-['Space_Grotesk'] text-sm font-medium">
                  Desk Light
                </span>
              </div>

              <div className="flex flex-col gap-6">
                <ChannelSlider
                  label="Warm"
                  color="#FFB870"
                  value={warmWhite2}
                  onCommit={(v) => updateField("warmWhite2", v, true)}
                />
                <ChannelSlider
                  label="Cool"
                  color="#7FD8FF"
                  value={coolWhite2}
                  onCommit={(v) => updateField("coolWhite2", v, true)}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Reusable 0–1 (stored) <-> 0–100 (displayed) slider, tinted per-channel. */
function ChannelSlider({
  label,
  color,
  value,
  onCommit,
}: {
  label: string;
  color: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  const toNumeric = (raw: number | readonly number[]) =>
    (Array.isArray(raw) ? raw[0] : (raw as number)) / 100;

  const pct = Math.round(value * 100);

  return (
    <div className="flex items-center gap-4">
      <span
        className="font-['Space_Grotesk'] w-20 shrink-0 truncate text-xs font-semibold uppercase tracking-wide"
        style={{ color }}
      >
        {label}
      </span>
      <Slider
        value={pct}
        onValueChange={(raw) => onCommit(toNumeric(raw))}
        onValueCommitted={(raw) => onCommit(toNumeric(raw))}
        max={100}
        step={1}
        style={{ ["--ch-color" as string]: color }}
        className="flex-1 [&_[data-slot=slider-track]]:bg-[#2A2733] [&_[data-slot=slider-range]]:bg-[var(--ch-color)] [&_[data-slot=slider-thumb]]:border-[var(--ch-color)] [&_[data-slot=slider-thumb]]:ring-offset-[#1C1922]"
      />
      <span className="font-['IBM_Plex_Mono'] w-10 text-right text-xs text-[#8B85A0]">
        {pct}%
      </span>
    </div>
  );
}

/** Hue-only picker: a rainbow rail with a thumb tinted to the current hue. Stores hue directly, 0–360. */
function HueSlider({
  hue,
  hueColor,
  onCommit,
}: {
  hue: number;
  hueColor: string;
  onCommit: (h: number) => void;
}) {
  const toHue = (raw: number | readonly number[]) =>
    (Array.isArray(raw) ? raw[0] : (raw as number)) * 3.6;
  const pct = Math.round(hue / 3.6);

  return (
    <div className="flex items-center gap-4">
      <span className="font-['Space_Grotesk'] w-20 shrink-0 truncate text-xs font-semibold uppercase tracking-wide text-[#8B85A0]">
        Hue
      </span>
      <Slider
        value={pct}
        onValueChange={(raw) => onCommit(toHue(raw))}
        onValueCommitted={(raw) => onCommit(toHue(raw))}
        max={100}
        step={1}
        style={{ ["--hue-color" as string]: hueColor }}
        className="flex-1 [&_[data-slot=slider-track]]:bg-[linear-gradient(to_right,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)] [&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:bg-[var(--hue-color)] [&_[data-slot=slider-thumb]]:ring-offset-[#1C1922]"
      />
      <span className="font-['IBM_Plex_Mono'] w-10 text-right text-xs text-[#8B85A0]">
        {Math.round(hue)}°
      </span>
    </div>
  );
}

/**
 * A slider whose track is a gradient between two given colors, so a slider
 * that transforms the current color (saturation, in this case) previews
 * exactly what each end of its own travel will produce.
 */
function GradientSlider({
  label,
  fromCss,
  toCss,
  value,
  onCommit,
}: {
  label: string;
  fromCss: string;
  toCss: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  const toNumeric = (raw: number | readonly number[]) =>
    (Array.isArray(raw) ? raw[0] : (raw as number)) / 100;
  const pct = Math.round(value * 100);

  return (
    <div className="flex items-center gap-4">
      <span className="font-['Space_Grotesk'] w-20 shrink-0 truncate text-xs font-semibold uppercase tracking-wide text-[#8B85A0]">
        {label}
      </span>
      <Slider
        value={pct}
        onValueChange={(raw) => onCommit(toNumeric(raw))}
        onValueCommitted={(raw) => onCommit(toNumeric(raw))}
        max={100}
        step={1}
        style={{
          ["--grad-from" as string]: fromCss,
          ["--grad-to" as string]: toCss,
        }}
        className="flex-1 [&_[data-slot=slider-track]]:bg-[linear-gradient(to_right,var(--grad-from),var(--grad-to))] [&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:ring-offset-[#1C1922]"
      />
      <span className="font-['IBM_Plex_Mono'] w-10 text-right text-xs text-[#8B85A0]">
        {pct}%
      </span>
    </div>
  );
}

export default App;
