export type DBContents = {
  currentState: LightsState;
  appliedTemplate: string | undefined;
  templates: Template[];
};

export type Template = {
  name: string;
  state: LightsState;
};

export type LightsState = {
  stringLights: boolean;
  hue: number;
  saturation: number;
  value: number;
  warmWhite1: number;
  coolWhite1: number;
  warmWhite2: number;
  coolWhite2: number;
};

export function newDb() {
  return {
    currentState: initialState(),
    appliedTemplate: undefined,
    templates: [],
  } satisfies DBContents;
}

export function initialState() {
  return {
    stringLights: false,
    hue: 0,
    saturation: 0,
    value: 0,
    warmWhite1: 0,
    coolWhite1: 0,
    warmWhite2: 0,
    coolWhite2: 0,
  } satisfies LightsState;
}
