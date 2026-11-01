import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  createMakeCodeURL,
  defaultMakeCodeProject,
  MakeCodeFrameDriver,
} from "@microbit/makecode-embed/vanilla";

export interface TutorialDriver {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  iframeSrc: string;
  ready: boolean;
  loadTutorial: (markdown: string) => Promise<void>;
}

/**
 * Embeds the micro:bit MakeCode editor and starts a tutorial from generated
 * Markdown via the driver's `importTutorial`.
 */
export function useTutorialDriver(): TutorialDriver {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const driverRef = useRef<MakeCodeFrameDriver | null>(null);
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
        initialProjects: async () => [defaultMakeCodeProject],
        onEditorContentLoaded: () => setReady(true),
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

  const loadTutorial = useCallback(async (markdown: string) => {
    const driver = driverRef.current;
    if (!driver) throw new Error("Der Editor ist noch nicht bereit.");
    await driver.importTutorial({ markdown });
  }, []);

  return { iframeRef, iframeSrc, ready, loadTutorial };
}
