import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  createMakeCodeURL,
  defaultMakeCodeProject,
  MakeCodeFrameDriver,
  type MakeCodeProject,
} from "@microbit/makecode-embed/vanilla";

export interface EditorFiles {
  mainTs: string;
  mainBlocks: string;
}

export interface MakeCodeEditor {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  iframeSrc: string;
  ready: boolean;
  requestLatestFiles: () => Promise<EditorFiles>;
}

/**
 * Embeds the micro:bit MakeCode editor for authoring. The page owns project
 * persistence and can snapshot the workspace (`main.ts` + `main.blocks`).
 */
export function useMakeCodeEditor(
  initialProject: MakeCodeProject = defaultMakeCodeProject,
): MakeCodeEditor {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const driverRef = useRef<MakeCodeFrameDriver | null>(null);
  const initialRef = useRef(initialProject);
  const latestRef = useRef<MakeCodeProject | undefined>(initialProject);
  const pendingSaves = useRef<((project?: MakeCodeProject) => void)[]>([]);
  const [ready, setReady] = useState(false);

  const iframeSrc = useMemo(
    () =>
      createMakeCodeURL(
        "https://makecode.microbit.org",
        undefined,
        undefined,
        1,
        undefined,
      ),
    [],
  );

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const driver = new MakeCodeFrameDriver(
      {
        controllerId: "microbit-class-portal",
        initialProjects: async () => [initialRef.current],
        onEditorContentLoaded: () => setReady(true),
        onWorkspaceSave: (event) => {
          if (!event.project) return;
          latestRef.current = event.project;
          const resolvers = pendingSaves.current;
          pendingSaves.current = [];
          resolvers.forEach((resolve) => resolve(event.project));
        },
      },
      () => iframeRef.current ?? undefined,
    );

    driverRef.current = driver;
    driver.initialize();

    return () => {
      driver.dispose();
      driverRef.current = null;
    };
  }, []);

  const requestLatestFiles = useCallback(
    async (timeoutMs = 1500): Promise<EditorFiles> => {
      const driver = driverRef.current;
      const project = driver
        ? await new Promise<MakeCodeProject | undefined>((resolve) => {
            let settled = false;
            const finish = (result?: MakeCodeProject) => {
              if (settled) return;
              settled = true;
              resolve(result ?? latestRef.current);
            };
            pendingSaves.current.push(finish);
            driver.saveProject().catch(() => finish(latestRef.current));
            window.setTimeout(() => finish(latestRef.current), timeoutMs);
          })
        : latestRef.current;

      const text = project?.text ?? {};
      return {
        mainTs: text["main.ts"] ?? "",
        mainBlocks: text["main.blocks"] ?? "",
      };
    },
    [],
  );

  return { iframeRef, iframeSrc, ready, requestLatestFiles };
}

/**
 * Builds the initial MakeCode project for editing an existing tutorial. The
 * stored block XML lets the editor reopen the tutorial's final workspace.
 */
export function projectFromStep(step?: {
  code: string;
  blockXml?: string;
}): MakeCodeProject {
  if (!step?.blockXml?.trim()) return defaultMakeCodeProject;

  return {
    text: {
      "main.blocks": step.blockXml,
      "main.ts": step.code ?? "",
      "pxt.json": JSON.stringify(
        {
          name: "Untitled",
          dependencies: { core: "*", radio: "*" },
          description: "",
          files: ["main.blocks", "main.ts"],
          preferredEditor: "blocksprj",
        },
        null,
        2,
      ),
    },
  };
}
