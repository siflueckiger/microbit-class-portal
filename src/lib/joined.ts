export interface JoinedClass {
  code: string;
  name: string;
}

const STORAGE_KEY = "microbit-class-portal:joined";

export function getJoinedClasses(): JoinedClass[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is JoinedClass =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as JoinedClass).code === "string" &&
        typeof (item as JoinedClass).name === "string",
    );
  } catch {
    return [];
  }
}

export function rememberClass(entry: JoinedClass): void {
  try {
    const others = getJoinedClasses().filter((item) => item.code !== entry.code);
    const next = [entry, ...others].slice(0, 10);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
}

export function forgetClass(code: string): void {
  try {
    const next = getJoinedClasses().filter((item) => item.code !== code);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
}
