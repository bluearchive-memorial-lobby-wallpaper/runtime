import type { WallpaperDefinition } from "./definition.js";

export interface DefinitionIssue {
  readonly path: string;
  readonly message: string;
}

export function validateWallpaperDefinition(
  definition: WallpaperDefinition<any>,
): readonly DefinitionIssue[] {
  const issues: DefinitionIssue[] = [];
  if (!definition.id.trim()) issues.push({ path: "id", message: "must not be empty" });
  if (!definition.model.binary.trim()) {
    issues.push({ path: "model.binary", message: "must not be empty" });
  }
  if (Object.keys(definition.model.atlases).length === 0) {
    issues.push({ path: "model.atlases", message: "must contain at least one tier" });
  }
  if (definition.model.designViewport.width <= 0 || definition.model.designViewport.height <= 0) {
    issues.push({ path: "model.designViewport", message: "width and height must be positive" });
  }

  const dialogueIndexes = new Set<number>();
  const lineIds = new Set<string>();
  for (const [position, dialogue] of (definition.dialogues ?? []).entries()) {
    const path = `dialogues[${position}]`;
    if (dialogueIndexes.has(dialogue.index)) {
      issues.push({ path: `${path}.index`, message: "must be unique" });
    }
    dialogueIndexes.add(dialogue.index);
    if (dialogue.durationSeconds <= 0) {
      issues.push({ path: `${path}.durationSeconds`, message: "must be positive" });
    }
    for (const [linePosition, line] of dialogue.lines.entries()) {
      const normalizedId = line.id.toLowerCase();
      if (lineIds.has(normalizedId)) {
        issues.push({ path: `${path}.lines[${linePosition}].id`, message: "must be unique" });
      }
      lineIds.add(normalizedId);
    }
  }
  return issues;
}

export function assertWallpaperDefinition(definition: WallpaperDefinition<any>): void {
  const issues = validateWallpaperDefinition(definition);
  if (issues.length > 0) {
    throw new Error(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
  }
}
