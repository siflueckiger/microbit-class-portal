export type StepKind = "blocks" | "template" | "ghost";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  code: string;
  blockXml?: string;
  kind: StepKind;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
}

export interface TutorialSummary {
  id: string;
  title: string;
  description: string;
  position: number;
}

export interface Klass {
  id: string;
  name: string;
  code: string;
}
