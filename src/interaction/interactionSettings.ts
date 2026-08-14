export interface WallpaperInteractionSettings {
  readonly introAnimation: boolean;
  readonly interactionsEnabled: boolean;
  readonly mouseTracking: boolean;
  readonly headPatting: boolean;
  readonly voiceEnabled: boolean;
}

const INTERACTION_SETTING_KEYS = [
  "introAnimation", "interactionsEnabled", "mouseTracking", "headPatting", "voiceEnabled",
] as const satisfies readonly (keyof WallpaperInteractionSettings)[];

export function didInteractionSettingsChange<T extends WallpaperInteractionSettings>(
  previous: Readonly<T>, current: Readonly<T>,
) {
  return INTERACTION_SETTING_KEYS.some((key) => previous[key] !== current[key]);
}

export function canTriggerDialogue(settings: Readonly<WallpaperInteractionSettings>) {
  return settings.interactionsEnabled && settings.voiceEnabled;
}

export function didDialogueSettingChange<T extends Pick<WallpaperInteractionSettings, "voiceEnabled">>(
  previous: Readonly<T>, current: Readonly<T>,
) {
  return previous.voiceEnabled !== current.voiceEnabled;
}
