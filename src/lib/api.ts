import { supabase } from "./supabase";
import { normalizeSteps } from "./tutorial";
import type {
  Klass,
  Tutorial,
  TutorialStep,
  TutorialSummary,
} from "./types";

/* ------------------------------------------------------------------ */
/* Student (code-gated RPCs)                                          */
/* ------------------------------------------------------------------ */

export interface StudentClass {
  id: string;
  name: string;
  tutorials: TutorialSummary[];
}

export async function studentGetClass(
  code: string,
): Promise<StudentClass | null> {
  const { data, error } = await supabase.rpc("student_get_class", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw new Error(error.message);
  if (!data) return null;

  const result = data as {
    id: string;
    name: string;
    tutorials?: TutorialSummary[];
  };

  return {
    id: result.id,
    name: result.name,
    tutorials: Array.isArray(result.tutorials) ? result.tutorials : [],
  };
}

export async function studentGetTutorial(
  code: string,
  tutorialId: string,
): Promise<Tutorial | null> {
  const { data, error } = await supabase.rpc("student_get_tutorial", {
    p_code: code.trim().toUpperCase(),
    p_tutorial_id: tutorialId,
  });
  if (error) throw new Error(error.message);
  if (!data) return null;

  const result = data as {
    id: string;
    title: string;
    description: string;
    steps: unknown;
  };

  return {
    id: result.id,
    title: result.title,
    description: result.description ?? "",
    steps: normalizeSteps(result.steps),
  };
}

/* ------------------------------------------------------------------ */
/* Teacher                                                            */
/* ------------------------------------------------------------------ */

export async function listTutorials(): Promise<Tutorial[]> {
  const { data, error } = await supabase
    .from("tutorials")
    .select("id,title,description,steps")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    steps: normalizeSteps(row.steps),
  }));
}

export async function getTutorial(id: string): Promise<Tutorial | null> {
  const { data, error } = await supabase
    .from("tutorials")
    .select("id,title,description,steps")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id as string,
    title: data.title as string,
    description: (data.description as string) ?? "",
    steps: normalizeSteps(data.steps),
  };
}

export async function saveTutorial(input: {
  id?: string;
  title: string;
  description: string;
  steps: TutorialStep[];
}): Promise<string> {
  const row = {
    title: input.title.trim(),
    description: input.description.trim(),
    steps: input.steps,
  };

  if (input.id) {
    const { error } = await supabase
      .from("tutorials")
      .update(row)
      .eq("id", input.id);
    if (error) throw new Error(error.message);
    return input.id;
  }

  const { data, error } = await supabase
    .from("tutorials")
    .insert(row)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function deleteTutorial(id: string): Promise<void> {
  const { error } = await supabase.from("tutorials").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listClasses(): Promise<Klass[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("id,name,code")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Klass[];
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === "23505";
}

export async function createClass(name: string): Promise<Klass> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = randomCode();
    const { data, error } = await supabase
      .from("classes")
      .insert({ name: name.trim(), code })
      .select("id,name,code")
      .single();
    if (!error) return data as Klass;
    if (!isUniqueViolation(error)) throw new Error(error.message);
  }
  throw new Error("Konnte keinen freien Klassencode finden.");
}

export async function regenerateClassCode(id: string): Promise<Klass> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = randomCode();
    const { data, error } = await supabase
      .from("classes")
      .update({ code })
      .eq("id", id)
      .select("id,name,code")
      .single();
    if (!error) return data as Klass;
    if (!isUniqueViolation(error)) throw new Error(error.message);
  }
  throw new Error("Konnte keinen freien Klassencode finden.");
}

export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listAssignments(classId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("class_tutorials")
    .select("tutorial_id,position")
    .eq("class_id", classId)
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.tutorial_id as string);
}

export async function setAssignments(
  classId: string,
  tutorialIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("class_tutorials")
    .delete()
    .eq("class_id", classId);
  if (deleteError) throw new Error(deleteError.message);

  if (tutorialIds.length === 0) return;

  const rows = tutorialIds.map((tutorialId, index) => ({
    class_id: classId,
    tutorial_id: tutorialId,
    position: index,
  }));

  const { error } = await supabase.from("class_tutorials").insert(rows);
  if (error) throw new Error(error.message);
}
