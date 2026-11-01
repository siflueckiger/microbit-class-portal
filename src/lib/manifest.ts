import { RAW_BASE } from "../config";

export interface TutorialEntry {
  id: string;
  class: string;
  title: string;
  description: string;
  /** Path relative to the data root, e.g. `tutorials/5a/flashing-heart.md`. */
  file: string;
  order?: number;
}

export interface Manifest {
  tutorials: TutorialEntry[];
}

function cleanPath(path: string): string {
  return path.replace(/^\/+/, "");
}

function remoteUrl(path: string): string {
  return `${RAW_BASE}/${cleanPath(path)}`;
}

/**
 * The copy bundled with the site (Vite copies `public/` into the build).
 * Used as a fallback when the raw GitHub fetch fails, and to make local
 * preview work before the repository is published.
 */
function bundledUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${cleanPath(path)}`;
}

function withCacheBust(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

async function fetchData(path: string): Promise<Response> {
  try {
    const remote = await fetch(withCacheBust(remoteUrl(path)), {
      cache: "no-store",
    });
    if (remote.ok) return remote;
  } catch {
    // Fall through to the bundled copy.
  }
  return fetch(withCacheBust(bundledUrl(path)), { cache: "no-store" });
}

export function normalizeManifest(data: unknown): Manifest {
  if (typeof data !== "object" || data === null) return { tutorials: [] };
  const raw = (data as { tutorials?: unknown }).tutorials;
  const tutorials = Array.isArray(raw) ? raw.filter(isTutorialEntry) : [];
  return { tutorials };
}

export async function loadManifest(): Promise<Manifest> {
  const res = await fetchData("manifest.json");
  if (!res.ok) {
    throw new Error(`Could not load the tutorial list (HTTP ${res.status}).`);
  }
  return normalizeManifest(await res.json());
}

export async function loadTutorialMarkdown(file: string): Promise<string> {
  const res = await fetchData(file);
  if (!res.ok) {
    throw new Error(`Could not load the tutorial (HTTP ${res.status}).`);
  }
  return res.text();
}

export function classesOf(manifest: Manifest): string[] {
  return [...new Set(manifest.tutorials.map((tutorial) => tutorial.class))].sort(
    (a, b) => a.localeCompare(b, undefined, { numeric: true }),
  );
}

export function tutorialsForClass(
  manifest: Manifest,
  className: string,
): TutorialEntry[] {
  return manifest.tutorials
    .filter((tutorial) => tutorial.class === className)
    .sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title),
    );
}

function isTutorialEntry(value: unknown): value is TutorialEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.class === "string" &&
    typeof v.title === "string" &&
    typeof v.file === "string"
  );
}
