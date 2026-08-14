export type Locale = string;
export type TextureTier = string;

export interface LocalizedDialogueLine {
  readonly id: string;
  readonly text: Readonly<Record<Locale, string>>;
}

export interface DialogueDefinition {
  readonly index: number;
  readonly motionAnimation: string;
  readonly attachmentAnimation?: string;
  readonly durationSeconds: number;
  readonly lines: readonly LocalizedDialogueLine[];
}

export interface SpineModelDefinition {
  readonly binary: string;
  readonly atlases: Readonly<Record<TextureTier, string>>;
  readonly spineVersion: string;
  readonly designViewport: {
    readonly width: number;
    readonly height: number;
    readonly centerX: number;
    readonly centerY: number;
  };
}

export interface AnimationDefinition {
  readonly intro?: string;
  readonly idle: string;
  readonly tracks: {
    readonly base: number;
    readonly motion: number;
    readonly attachment: number;
  };
}

export interface InteractionDefinition {
  readonly eyeBone?: string;
  readonly headControlBone?: string;
  readonly headAnchorBone?: string;
  readonly look?: {
    readonly animation: string;
    readonly endMotionAnimation?: string;
    readonly endAttachmentAnimation?: string;
  };
  readonly pat?: {
    readonly motionAnimation: string;
    readonly attachmentAnimation?: string;
    readonly endMotionAnimation?: string;
    readonly endAttachmentAnimation?: string;
  };
  readonly headRadius?: { readonly x: number; readonly y: number };
  readonly bodyFromHead?: {
    readonly x: number;
    readonly y: number;
    readonly radiusX: number;
    readonly radiusY: number;
  };
  readonly eyeClamp?: { readonly x: number; readonly y: number };
  readonly patClamp?: number;
  readonly dragThresholdPixels?: number;
  readonly cooldownSeconds?: number;
  readonly dialogueGraceSeconds?: number;
}

export interface WallpaperDefinition<VoiceLocale extends string = string> {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly model: SpineModelDefinition;
  readonly animations: AnimationDefinition;
  readonly interactions?: InteractionDefinition;
  readonly dialogues?: readonly DialogueDefinition[];
  readonly audio?: {
    readonly bgm?: { readonly title: string; readonly path: string };
    readonly voicePath?: (eventId: string, locale: VoiceLocale) => string;
  };
}

export type InteractiveWallpaperDefinition<VoiceLocale extends string = string> =
  Omit<WallpaperDefinition<VoiceLocale>, "animations" | "interactions" | "dialogues"> & {
    readonly animations: AnimationDefinition & { readonly intro: string };
    readonly interactions: InteractionDefinition & {
      readonly eyeBone: string;
      readonly headControlBone: string;
      readonly headAnchorBone: string;
      readonly look: Required<NonNullable<InteractionDefinition["look"]>>;
      readonly pat: Required<NonNullable<InteractionDefinition["pat"]>>;
      readonly headRadius: NonNullable<InteractionDefinition["headRadius"]>;
      readonly bodyFromHead: NonNullable<InteractionDefinition["bodyFromHead"]>;
      readonly eyeClamp: NonNullable<InteractionDefinition["eyeClamp"]>;
      readonly patClamp: number;
      readonly dragThresholdPixels: number;
      readonly cooldownSeconds: number;
      readonly dialogueGraceSeconds: number;
    };
    readonly dialogues: readonly (DialogueDefinition & {
      readonly attachmentAnimation: string;
    })[];
  };

export function defineWallpaper<const T extends WallpaperDefinition<any>>(definition: T): T {
  return definition;
}

export function createDialogueLineResolver(
  dialogues: readonly DialogueDefinition[],
): (eventId: string) => LocalizedDialogueLine | undefined {
  const lines = new Map(
    dialogues.flatMap((dialogue) =>
      dialogue.lines.map((line) => [line.id.toLowerCase(), line] as const),
    ),
  );
  return (eventId: string) => lines.get(eventId.toLowerCase());
}
