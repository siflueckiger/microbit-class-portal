import { useCallback, useEffect, useState } from "react";
import { deleteTutorial, listTutorials } from "../lib/api";
import { navigate } from "../lib/router";
import type { Tutorial } from "../lib/types";

export function TutorialsTab() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setTutorials(await listTutorials());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Tutorials konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (tutorial: Tutorial) => {
    if (!window.confirm(`Tutorial „${tutorial.title}“ löschen?`)) return;
    try {
      await deleteTutorial(tutorial.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
    }
  };

  return (
    <section className="tab">
      <div className="tab__head">
        <div>
          <h2 className="tab__title">Tutorial-Pool</h2>
          <p className="muted">
            Erstelle Tutorials und weise sie anschließend Klassen zu.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => navigate("/admin/tutorial/new")}
        >
          + Neues Tutorial
        </button>
      </div>

      {error ? <div className="banner banner--error">{error}</div> : null}
      {loading ? <p className="muted">Wird geladen…</p> : null}

      {!loading && tutorials.length === 0 ? (
        <div className="empty">
          Noch keine Tutorials. Erstelle dein erstes Tutorial.
        </div>
      ) : null}

      <ul className="items">
        {tutorials.map((tutorial) => (
          <li key={tutorial.id} className="item">
            <div className="item__body">
              <div className="item__title">{tutorial.title}</div>
              {tutorial.description ? (
                <div className="item__desc">{tutorial.description}</div>
              ) : null}
              <div className="item__meta">{tutorial.steps.length} Schritte</div>
            </div>
            <div className="item__actions">
              <button
                type="button"
                className="btn btn--small"
                onClick={() => navigate(`/admin/tutorial/${tutorial.id}`)}
              >
                Bearbeiten
              </button>
              <button
                type="button"
                className="btn btn--danger btn--small"
                onClick={() => remove(tutorial)}
              >
                Löschen
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
