import { useCallback, useEffect, useMemo, useState } from "react";
import { SITE_SUBTITLE, SITE_TITLE } from "../config";
import {
  classesOf,
  loadManifest,
  loadTutorialMarkdown,
  tutorialsForClass,
  type Manifest,
  type TutorialEntry,
} from "../lib/manifest";
import { TutorialViewer } from "./TutorialViewer";

interface ActiveTutorial {
  entry: TutorialEntry;
  markdown: string;
}

export function StudentView() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [activeClass, setActiveClass] = useState<string>();
  const [openingId, setOpeningId] = useState<string>();
  const [active, setActive] = useState<ActiveTutorial>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await loadManifest();
      setManifest(result);
      const classNames = classesOf(result);
      setActiveClass((current) =>
        current && classNames.includes(current) ? current : classNames[0],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tutorials.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const classes = useMemo(
    () => (manifest ? classesOf(manifest) : []),
    [manifest],
  );

  const tutorials = useMemo(
    () =>
      manifest && activeClass
        ? tutorialsForClass(manifest, activeClass)
        : [],
    [manifest, activeClass],
  );

  const openTutorial = useCallback(async (entry: TutorialEntry) => {
    setOpeningId(entry.id);
    setError(undefined);
    try {
      const markdown = await loadTutorialMarkdown(entry.file);
      setActive({ entry, markdown });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the tutorial.");
    } finally {
      setOpeningId(undefined);
    }
  }, []);

  if (active) {
    return (
      <TutorialViewer
        entry={active.entry}
        markdown={active.markdown}
        onBack={() => setActive(undefined)}
      />
    );
  }

  return (
    <div className="site">
      <header className="site__header">
        <div>
          <h1 className="site__title">{SITE_TITLE}</h1>
          <p className="site__subtitle">{SITE_SUBTITLE}</p>
        </div>
        <a className="btn btn--ghost" href="#/admin">
          Teacher
        </a>
      </header>

      <main className="site__main">
        {loading ? <div className="state">Loading tutorials…</div> : null}

        {error ? (
          <div className="banner banner--error">
            <span>{error}</span>
            <button type="button" className="btn btn--small" onClick={refresh}>
              Retry
            </button>
          </div>
        ) : null}

        {!loading && manifest ? (
          <>
            <nav className="classes" aria-label="Classes">
              {classes.map((className) => (
                <button
                  key={className}
                  type="button"
                  className={
                    "chip" + (className === activeClass ? " chip--active" : "")
                  }
                  onClick={() => setActiveClass(className)}
                >
                  {className}
                </button>
              ))}
            </nav>

            <div className="cards">
              {tutorials.map((tutorial) => (
                <button
                  key={tutorial.id}
                  type="button"
                  className="card"
                  onClick={() => openTutorial(tutorial)}
                  disabled={openingId === tutorial.id}
                >
                  <span className="card__title">{tutorial.title}</span>
                  <span className="card__desc">{tutorial.description}</span>
                  <span className="card__cta">
                    {openingId === tutorial.id ? "Opening…" : "Start →"}
                  </span>
                </button>
              ))}

              {tutorials.length === 0 ? (
                <div className="state">No tutorials in this class yet.</div>
              ) : null}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
