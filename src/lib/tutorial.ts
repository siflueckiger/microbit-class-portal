import type { StepKind, Tutorial, TutorialStep } from "./types";

export const STEP_KINDS: { value: StepKind; label: string; hint: string }[] = [
  {
    value: "blocks",
    label: "Blöcke",
    hint: "Hinweis / Ziel – die Blöcke, die die Schüler:innen bauen sollen.",
  },
  {
    value: "template",
    label: "Vorlage",
    hint: "Start-Workspace – Blöcke, die schon vorhanden sind.",
  },
  {
    value: "ghost",
    label: "Ghost",
    hint: "Nur in der Toolbox sichtbar, aber nicht nötig.",
  },
];

export function newStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Renders a tutorial into MakeCode tutorial Markdown. The teacher never sees
 * this — it is generated on demand when a student starts the tutorial.
 */
export function tutorialToMarkdown(tutorial: {
  title: string;
  steps: TutorialStep[];
}): string {
  const lines: string[] = [];
  lines.push(`# ${tutorial.title.trim() || "Tutorial"}`);
  lines.push("");

  tutorial.steps.forEach((step, index) => {
    lines.push(`## ${step.title.trim() || `Schritt ${index + 1}`}`);
    lines.push("");

    const description = step.description.trim();
    if (description) {
      lines.push(description);
      lines.push("");
    }

    const code = step.code.trim();
    if (code) {
      lines.push("```" + step.kind);
      lines.push(code);
      lines.push("```");
      lines.push("");
    }
  });

  return lines.join("\n").replace(/\n+$/, "") + "\n";
}

export function normalizeSteps(value: unknown): TutorialStep[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => {
      return typeof item === "object" && item !== null;
    })
    .map((item, index) => {
      const kind = typeof item.kind === "string" ? item.kind : "blocks";
      return {
        id:
          typeof item.id === "string" && item.id
            ? item.id
            : `step-${index}-${Math.random().toString(36).slice(2, 6)}`,
        title:
          typeof item.title === "string" && item.title.trim()
            ? item.title
            : `Schritt ${index + 1}`,
        description:
          typeof item.description === "string" ? item.description : "",
        code: typeof item.code === "string" ? item.code : "",
        blockXml: typeof item.blockXml === "string" ? item.blockXml : "",
        kind: isStepKind(kind) ? kind : "blocks",
      };
    });
}

function isStepKind(value: string): value is StepKind {
  return value === "blocks" || value === "template" || value === "ghost";
}

export function tutorialStepCount(tutorial: Tutorial): number {
  return tutorial.steps.length;
}
