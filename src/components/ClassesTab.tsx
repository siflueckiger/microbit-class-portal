import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createClass,
  deleteClass,
  listAssignments,
  listClasses,
  listTutorials,
  regenerateClassCode,
  setAssignments,
} from "../lib/api";
import type { Klass, Tutorial } from "../lib/types";

export function ClassesTab() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [classList, tutorialList] = await Promise.all([
        listClasses(),
        listTutorials(),
      ]);
      setClasses(classList);
      setTutorials(tutorialList);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Daten konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(undefined);
    try {
      const created = await createClass(name);
      setName("");
      await load();
      setManaging(created.id);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Klasse konnte nicht erstellt werden.",
      );
    } finally {
      setCreating(false);
    }
  };

  const remove = async (klass: Klass) => {
    if (!window.confirm(`Klasse „${klass.name}“ löschen?`)) return;
    try {
      await deleteClass(klass.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
    }
  };

  const regenerate = async (klass: Klass) => {
    if (
      !window.confirm(
        `Neuen Code für „${klass.name}“ erzeugen? Der alte Code funktioniert danach nicht mehr.`,
      )
    ) {
      return;
    }
    try {
      await regenerateClassCode(klass.id);
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Code konnte nicht erneuert werden.",
      );
    }
  };

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => undefined);
  };

  return (
    <section className="tab">
      <div className="tab__head">
        <div>
          <h2 className="tab__title">Klassen</h2>
          <p className="muted">
            Jede Klasse hat einen Code. Weise ihr Tutorials aus dem Pool zu.
          </p>
        </div>
      </div>

      <form className="row" onSubmit={create}>
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Klassenname, z. B. 5a"
        />
        <button
          className="btn btn--primary"
          type="submit"
          disabled={creating || !name.trim()}
        >
          {creating ? "Erstellen…" : "+ Klasse erstellen"}
        </button>
      </form>

      {error ? <div className="banner banner--error">{error}</div> : null}
      {loading ? <p className="muted">Wird geladen…</p> : null}

      <ul className="items">
        {classes.map((klass) => (
          <li key={klass.id} className="item item--column">
            <div className="item__row">
              <div className="item__body">
                <div className="item__title">{klass.name}</div>
                <div className="codeRow">
                  <code className="code">{klass.code}</code>
                  <button
                    type="button"
                    className="btn btn--small"
                    onClick={() => copy(klass.code)}
                  >
                    Kopieren
                  </button>
                  <button
                    type="button"
                    className="btn btn--small"
                    onClick={() => regenerate(klass)}
                  >
                    Neuer Code
                  </button>
                </div>
              </div>
              <div className="item__actions">
                <button
                  type="button"
                  className="btn btn--small"
                  onClick={() =>
                    setManaging(managing === klass.id ? undefined : klass.id)
                  }
                >
                  {managing === klass.id ? "Schließen" : "Tutorials zuweisen"}
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--small"
                  onClick={() => remove(klass)}
                >
                  Löschen
                </button>
              </div>
            </div>

            {managing === klass.id ? (
              <ClassAssignments klass={klass} tutorials={tutorials} />
            ) : null}
          </li>
        ))}
      </ul>

      {!loading && classes.length === 0 ? (
        <div className="empty">Noch keine Klassen.</div>
      ) : null}
    </section>
  );
}

function ClassAssignments({
  klass,
  tutorials,
}: {
  klass: Klass;
  tutorials: Tutorial[];
}) {
  const [selected, setSelected] = useState<string[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    setSelected(undefined);
    setError(undefined);

    listAssignments(klass.id)
      .then((ids) => {
        if (active) setSelected(ids);
      })
      .catch((e) => {
        if (!active) return;
        setError(
          e instanceof Error
            ? e.message
            : "Zuweisungen konnten nicht geladen werden.",
        );
      });

    return () => {
      active = false;
    };
  }, [klass.id]);

  const toggle = (id: string) => {
    setSaved(false);
    setSelected((current) => {
      if (!current) return current;
      return current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
    });
  };

  const move = (id: string, direction: -1 | 1) => {
    setSaved(false);
    setSelected((current) => {
      if (!current) return current;
      const index = current.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setError(undefined);
    setSaved(false);
    try {
      await setAssignments(klass.id, selected);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  if (selected === undefined) {
    return <p className="muted">Zuweisungen werden geladen…</p>;
  }

  return (
    <div className="assign">
      {tutorials.length === 0 ? (
        <p className="muted">Noch keine Tutorials im Pool.</p>
      ) : null}
      {error ? <div className="banner banner--error">{error}</div> : null}

      <ul className="assignList">
        {tutorials.map((tutorial) => {
          const index = selected.indexOf(tutorial.id);
          const isSelected = index >= 0;
          return (
            <li
              key={tutorial.id}
              className={"assignItem" + (isSelected ? " assignItem--on" : "")}
            >
              <label className="assignItem__check">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(tutorial.id)}
                />
                <span>
                  <span className="assignItem__title">{tutorial.title}</span>
                  <span className="assignItem__meta">
                    {tutorial.steps.length} Schritte
                  </span>
                </span>
              </label>

              {isSelected ? (
                <span className="assignItem__order">
                  <button
                    type="button"
                    className="iconBtn"
                    disabled={index === 0}
                    onClick={() => move(tutorial.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="iconBtn"
                    disabled={index === selected.length - 1}
                    onClick={() => move(tutorial.id, 1)}
                  >
                    ↓
                  </button>
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="row">
        <button
          type="button"
          className="btn btn--primary btn--small"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Speichern…" : "Zuweisung speichern"}
        </button>
        <span className="muted">{selected.length} Tutorial(s) ausgewählt</span>
        {saved ? <span className="ok">Gespeichert</span> : null}
      </div>
    </div>
  );
}
