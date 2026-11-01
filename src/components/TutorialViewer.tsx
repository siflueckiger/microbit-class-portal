import { useEffect, useState } from "react";
import type { TutorialEntry } from "../lib/manifest";
import { useTutorialDriver } from "../lib/useTutorialDriver";

interface TutorialViewerProps {
  entry: TutorialEntry;
  markdown: string;
  onBack: () => void;
}

export function TutorialViewer({
  entry,
  markdown,
  onBack,
}: TutorialViewerProps) {
  const { iframeRef, iframeSrc, ready, status, loadTutorial } =
    useTutorialDriver();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    setLoaded(false);
    setError(undefined);

    (async () => {
      try {
        await loadTutorial(markdown);
        if (!cancelled) setLoaded(true);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Could not start the tutorial.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, markdown, loadTutorial]);

  return (
    <div className="viewer">
      <header className="viewer__header">
        <button type="button" className="btn" onClick={onBack}>
          ← All tutorials
        </button>
        <span className="viewer__title">{entry.title}</span>
        <span className="viewer__class">Class {entry.class}</span>
      </header>

      <div className="viewer__frame">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title={`MakeCode tutorial: ${entry.title}`}
          allow="usb; autoplay; camera; microphone;"
        />
        {!loaded && !error ? (
          <div className="viewer__overlay">{status}</div>
        ) : null}
        {error ? (
          <div className="viewer__overlay viewer__overlay--error">{error}</div>
        ) : null}
      </div>
    </div>
  );
}
