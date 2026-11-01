export const REPO = {
  owner: "siflueckiger",
  name: "microbit-class-portal",
  branch: "main",
} as const;

/**
 * Tutorial data is kept under `public/` so it is served by Vite in dev and
 * copied into the build. In production it is fetched from the raw GitHub
 * branch instead, so publishing a tutorial needs no rebuild.
 */
export const DATA_PREFIX = "public";

export const RAW_BASE = `https://raw.githubusercontent.com/${REPO.owner}/${REPO.name}/${REPO.branch}/${DATA_PREFIX}`;
export const REPO_URL = `https://github.com/${REPO.owner}/${REPO.name}`;

export const SITE_TITLE = "micro:bit Tutorials";
export const SITE_SUBTITLE = "Pick your class and start a tutorial.";

export const TOKEN_STORAGE_KEY = "microbit-class-portal:token";
