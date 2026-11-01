import { DATA_PREFIX, REPO } from "../config";
import { loadManifest, normalizeManifest, type Manifest, type TutorialEntry } from "./manifest";
import { slugify } from "./slug";

const API = "https://api.github.com";

export interface GitHubFile {
  sha: string;
  content: string;
}

export interface PublishInput {
  title: string;
  description: string;
  className: string;
  markdown: string;
}

function headers(token?: string): Record<string, string> {
  const result: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) result.Authorization = `Bearer ${token}`;
  return result;
}

function repoDataPath(path: string): string {
  return `${DATA_PREFIX}/${path.replace(/^\/+/, "")}`;
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(encoded: string): string {
  const binary = atob(encoded.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    return body.message
      ? `GitHub says: ${body.message} (HTTP ${res.status})`
      : `GitHub request failed (HTTP ${res.status}).`;
  } catch {
    return `GitHub request failed (HTTP ${res.status}).`;
  }
}

async function getFile(
  path: string,
  token?: string,
): Promise<GitHubFile | undefined> {
  const url = `${API}/repos/${REPO.owner}/${REPO.name}/contents/${encodePath(
    path,
  )}?ref=${REPO.branch}`;
  const res = await fetch(url, { headers: headers(token), cache: "no-store" });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(await errorMessage(res));

  const data = (await res.json()) as {
    type?: string;
    sha?: string;
    content?: string;
  };
  if (data.type !== "file" || !data.sha || typeof data.content !== "string") {
    return undefined;
  }
  return { sha: data.sha, content: fromBase64(data.content) };
}

async function putFile(
  path: string,
  content: string,
  message: string,
  token: string,
  sha?: string,
): Promise<void> {
  const res = await fetch(
    `${API}/repos/${REPO.owner}/${REPO.name}/contents/${encodePath(path)}`,
    {
      method: "PUT",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        content: toBase64(content),
        branch: REPO.branch,
        ...(sha ? { sha } : {}),
      }),
    },
  );
  if (!res.ok) throw new Error(await errorMessage(res));
}

async function deleteFile(
  path: string,
  message: string,
  token: string,
  sha: string,
): Promise<void> {
  const res = await fetch(
    `${API}/repos/${REPO.owner}/${REPO.name}/contents/${encodePath(path)}`,
    {
      method: "DELETE",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ message, sha, branch: REPO.branch }),
    },
  );
  if (!res.ok) throw new Error(await errorMessage(res));
}

export async function validateToken(
  token: string,
): Promise<{ fullName: string }> {
  const res = await fetch(`${API}/repos/${REPO.owner}/${REPO.name}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  const data = (await res.json()) as { full_name?: string };
  return { fullName: data.full_name ?? `${REPO.owner}/${REPO.name}` };
}

export async function getManifest(token?: string): Promise<Manifest> {
  if (!token) return loadManifest();

  const file = await getFile(repoDataPath("manifest.json"), token);
  return file ? normalizeManifest(JSON.parse(file.content)) : { tutorials: [] };
}

export async function publishTutorial(
  input: PublishInput,
  token: string,
): Promise<TutorialEntry> {
  const classSlug = slugify(input.className) || "class";
  const baseSlug = slugify(input.title) || "tutorial";

  let slug = baseSlug;
  let file = `tutorials/${classSlug}/${slug}.md`;
  if (await getFile(repoDataPath(file), token)) {
    slug = `${baseSlug}-${Date.now().toString(36)}`;
    file = `tutorials/${classSlug}/${slug}.md`;
  }

  await putFile(
    repoDataPath(file),
    ensureTrailingNewline(input.markdown),
    `Add tutorial: ${input.title}`,
    token,
  );

  const manifestFile = await getFile(repoDataPath("manifest.json"), token);
  const manifest = manifestFile
    ? normalizeManifest(JSON.parse(manifestFile.content))
    : { tutorials: [] };

  const entry: TutorialEntry = {
    id: `${classSlug}-${slug}-${Date.now().toString(36)}`,
    class: input.className,
    title: input.title,
    description: input.description,
    file,
  };
  manifest.tutorials.push(entry);

  await putFile(
    repoDataPath("manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    `Add “${input.title}” to the tutorial manifest`,
    token,
    manifestFile?.sha,
  );

  return entry;
}

export async function deleteTutorial(
  entry: TutorialEntry,
  token: string,
): Promise<void> {
  const tutorialFile = await getFile(repoDataPath(entry.file), token);
  if (tutorialFile) {
    await deleteFile(
      repoDataPath(entry.file),
      `Delete tutorial: ${entry.title}`,
      token,
      tutorialFile.sha,
    );
  }

  const manifestFile = await getFile(repoDataPath("manifest.json"), token);
  if (!manifestFile) return;

  const manifest = normalizeManifest(JSON.parse(manifestFile.content));
  manifest.tutorials = manifest.tutorials.filter((item) => item.id !== entry.id);

  await putFile(
    repoDataPath("manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    `Remove “${entry.title}” from the tutorial manifest`,
    token,
    manifestFile.sha,
  );
}

function ensureTrailingNewline(text: string): string {
  return text.endsWith("\n") ? text : `${text}\n`;
}
