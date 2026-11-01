import { useCallback, useEffect, useMemo, useState } from "react";
import { getTutorial, saveTutorial } from "../lib/api";
import { navigate } from "../lib/router";
import { newStepId, STEP_KINDS } from "../lib/tutorial";
import type { StepKind, Tutorial, TutorialStep } from "../lib/types";
import { projectFromStep, useMakeCodeEditor } from "../lib/useMakeCodeEditor";
import { ErrorScreen, LoadingScreen } from "./Screens";

export function TutorialBuilder({ tutorialId }: { tutorialId?: string }) {
  const [initial, setInitial] = useState<Tutorial | null | undefined>(
    tutorialId
      ? undefined
      : { id: "", title: "", description: "", steps: [] },
  );
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!tutorialId) {
      setInitial({ id: "", title: "", description: "", steps: [] });
      return;
    }

    let active = true;
    setInitial(undefined);
    setError(undefined);

    getTutorial(tutorialId)
      .then((result) => {
        if (active) setInitial(result);
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
  }, [tutorialId]);

  if (error) return <ErrorScreen message={error} backTo="/admin" />;
  if (initial === undefined) {
    return <LoadingScreen label="Tutorial wird geladen…" />;
  }
  if (initial === null) {
    return <ErrorScreen message="Tutorial nicht gefunden." backTo="/admin" />;
  }

  return <Builder initial={initial} />;
}

function Builder({ initial }: { initial: Tutorial }) {
  const [currentId, setCurrentId] = useState(initial.id || undefined);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [steps, setSteps] = useState<TutorialStep[]>(initial.steps);
  const [selectedId, setSelectedId] = useState<string | undefined>(
    initial.steps[0]?.id,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const initialProject = useMemo(
    () => projectFromStep(initial.steps[initial.steps.length - 1]),
    // The editor is initialized once from the tutorial as it was opened.
    [],
  );

  const { iframeRef, iframeSrc, ready, requestLatestFiles } =
    useMakeCodeEditor(initialProject);

  const selected = steps.find((step) => step.id === selectedId);

  const addStep = useCallback(async () => {
    setBusy(true);
    setSaved(false);
    try {
      const files = await requestLatestFiles();
      const id = newStepId();
      setSteps((current) => [
        ...current,
        {
          id,
          title: `Schritt ${current.length + 1}`,
          description: "",
          code: files.mainTs.trim(),
          blockXml: files.mainBlocks,
          kind: "blocks",
        },
      ]);
      setSelectedId(id);
    } finally {
      setBusy(false);
    }
  }, [requestLatestFiles]);

  const captureIntoStep = useCallback(
    async (id: string) => {
      setBusy(true);
      setSaved(false);
      try {
        const files = await requestLatestFiles();
        setSteps((current) =>
          current.map((step) =>
            step.id === id
              ? { ...step, code: files.mainTs.trim(), blockXml: files.mainBlocks }
              : step,
          ),
        );
      } finally {
        setBusy(false);
      }
    },
    [requestLatestFiles],
  );

  const updateStep = (id: string, patch: Partial<TutorialStep>) => {
    setSaved(false);
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    );
  };

  const moveStep = (id: string, direction: -1 | 1) => {
    setSaved(false);
    setSteps((current) => {
      const index = current.findIndex((step) => step.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const deleteStep = (id: string) => {
    setSaved(false);
    setSteps((current) => current.filter((step) => step.id !== id));
    setSelectedId((current) => (current === id ? undefined : current));
  };

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setError(undefined);
    setSaved(false);
    try {
      const id = await saveTutorial({
        id: currentId,
        title,
        description,
        steps,
      });
      if (!currentId) {
        navigate(`/admin/tutorial/${id}`);
      } else {
        setCurrentId(id);
        setSaved(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="builder">
      <header className="builder__header">
        <button type="button" className="btn" onClick={() => navigate("/admin")}>
          ← Zurück
        </button>
        <span className="builder__status">
          {busy ? "Bitte warten…" : ready ? "Editor bereit" : "Editor wird geladen…"}
        </span>
        <button
          type="button"
          className="btn btn--primary"
          onClick={save}
          disabled={busy || !title.trim()}
        >
          {currentId ? "Speichern" : "Tutorial erstellen"}
        </button>
      </header>

      <div className="builder__body">
        <div className="builder__editor">
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title="MakeCode Editor"
            allow="usb; autoplay; camera; microphone;"
          />
          {!ready ? (
            <div className="builder__overlay">MakeCode wird geladen…</div>
          ) : null}
        </div>

        <aside className="builder__panel">
          <div className="builder__meta">
            <label className="field">
              <span className="field__label">Titel</span>
              <input
                className="input"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setSaved(false);
                }}
                placeholder="z. B. Herz blinken lassen"
              />
            </label>

            <label className="field">
              <span className="field__label">Beschreibung</span>
              <input
                className="input"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setSaved(false);
                }}
                placeholder="Ein Satz für die Karte"
              />
            </label>

            <button
              type="button"
              className="btn btn--primary"
              onClick={addStep}
              disabled={busy || !ready}
            >
              + Schritt aus Workspace
            </button>

            {error ? <div className="banner banner--error">{error}</div> : null}
            {saved ? <div className="banner banner--ok">Gespeichert.</div> : null}
          </div>

          <ol className="stepList">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className={
                  "stepItem" + (step.id === selectedId ? " stepItem--active" : "")
                }
              >
                <button
                  type="button"
                  className="stepItem__main"
                  onClick={() => setSelectedId(step.id)}
                >
                  <span className="stepItem__index">{index + 1}</span>
                  <span className="stepItem__title">
                    {step.title.trim() || `Schritt ${index + 1}`}
                  </span>
                </button>
                <div className="stepItem__actions">
                  <button
                    type="button"
                    className="iconBtn"
                    disabled={index === 0}
                    onClick={() => moveStep(step.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="iconBtn"
                    disabled={index === steps.length - 1}
                    onClick={() => moveStep(step.id, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="iconBtn iconBtn--danger"
                    onClick={() => deleteStep(step.id)}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ol>

          {selected ? (
            <div className="stepEditor">
              <label className="field">
                <span className="field__label">Schritt-Titel</span>
                <input
                  className="input"
                  value={selected.title}
                  onChange={(event) =>
                    updateStep(selected.id, { title: event.target.value })
                  }
                />
              </label>

              <label className="field">
                <span className="field__label">Beschreibung</span>
                <textarea
                  className="input input--area"
                  rows={3}
                  value={selected.description}
                  placeholder="Was sollen die Schüler:innen in diesem Schritt tun?"
                  onChange={(event) =>
                    updateStep(selected.id, { description: event.target.value })
                  }
                />
              </label>

              <label className="field">
                <span className="field__label">Typ</span>
                <select
                  className="input"
                  value={selected.kind}
                  onChange={(event) =>
                    updateStep(selected.id, {
                      kind: event.target.value as StepKind,
                    })
                  }
                >
                  {STEP_KINDS.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </select>
                <span className="field__hint">
                  {STEP_KINDS.find((kind) => kind.value === selected.kind)?.hint}
                </span>
              </label>

              <div className="field">
                <div className="field__row">
                  <span className="field__label">Code</span>
                  <button
                    type="button"
                    className="btn btn--small"
                    onClick={() => captureIntoStep(selected.id)}
                    disabled={busy || !ready}
                  >
                    Aus Workspace übernehmen
                  </button>
                </div>
                <textarea
                  className="input input--code"
                  rows={8}
                  spellCheck={false}
                  value={selected.code}
                  onChange={(event) =>
                    updateStep(selected.id, { code: event.target.value })
                  }
                />
              </div>
            </div>
          ) : steps.length === 0 ? (
            <div className="empty">
              Baue Blöcke im Editor und klicke „Schritt aus Workspace“.
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
