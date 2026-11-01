import { useEffect, useMemo, useState } from "react";
import { studentGetTutorial } from "../lib/api";
import { navigate } from "../lib/router";
import { tutorialToMarkdown } from "../lib/tutorial";
import type { Tutorial } from "../lib/types";
import { useTutorialDriver } from "../lib/useTutorialDriver";
import { ErrorScreen, LoadingScreen } from "./Screens";

export function TutorialRunner({
  code,
  tutorialId,
}: {
  code: string;
  tutorialId: string;
}) {
  const [tutorial, setTutorial] = useState<Tutorial | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    setTutorial(undefined);
    setError(undefined);

    studentGetTutorial(code, tutorialId)
      .then((result) => {
        if (active) setTutorial(result);
      })
      .catch((e) => {
        if (!active) return;
        setError(
          e instanceof Error
            ? e.message
            : "Tutorial konnte nicht geladen werden.",
        );
      });

    return () => {
      active = false;
    };
  }, [code, tutorialId]);

  if (error) return <ErrorScreen message={error} backTo={`/class/${code}`} />;
  if (tutorial === undefined) {
    return <LoadingScreen label="Tutorial wird geladen…" />;
  }
  if (tutorial === null) {
    return (
      <ErrorScreen
        message="Dieses Tutorial ist für deine Klasse nicht verfügbar."
        backTo={`/class/${code}`}
      />
    );
  }

  return <Runner tutorial={tutorial} code={code} />;
}

function Runner({ tutorial, code }: { tutorial: Tutorial; code: string }) {
  const { iframeRef, iframeSrc, ready, loadTutorial } = useTutorialDriver();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();

  const markdown = useMemo(() => tutorialToMarkdown(tutorial), [tutorial]);

  useEffect(() => {
    if (!ready) return;

    let active = true;
    setLoaded(false);
    setError(undefined);

    loadTutorial(markdown)
      .then(() => {
        if (active) setLoaded(true);
      })
      .catch((e) => {
        if (!active) return;
        setError(
          e instanceof Error
            ? e.message
            : "Tutorial konnte nicht gestartet werden.",
        );
      });

    return () => {
      active = false;
    };
  }, [ready, markdown, loadTutorial]);

  return (
    <div className="viewer">
      <header className="viewer__header">
        <button
          type="button"
          className="btn"
          onClick={() => navigate(`/class/${encodeURIComponent(code)}`)}
        >
          ← Zurück
        </button>
        <span className="viewer__title">{tutorial.title}</span>
      </header>

      <div className="viewer__frame">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title={tutorial.title}
          allow="usb; autoplay; camera; microphone;"
        />
        {!loaded && !error ? (
          <div className="viewer__overlay">MakeCode wird geladen…</div>
        ) : null}
        {error ? (
          <div className="viewer__overlay viewer__overlay--error">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
