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
  ikeaWarm: number;
  ikeaCool: number;
  stringLights: boolean;
  ledR: number;
  ledG: number;
  ledB: number;
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
    ikeaWarm: 0,
    ikeaCool: 0,
    stringLights: false,
    ledR: 0,
    ledG: 0,
    ledB: 0,
  } satisfies LightsState;
}
