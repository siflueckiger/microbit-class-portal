import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

interface Teacher {
  id: string;
  email: string;
}

async function callTeacherFunction(
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke("teacher", { body });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  return (data ?? {}) as Record<string, unknown>;
}

export function TeachersTab() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const data = await callTeacherFunction({ action: "list" });
      setTeachers(Array.isArray(data.teachers) ? (data.teachers as Teacher[]) : []);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Lehrpersonen konnten nicht geladen werden.",
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
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await callTeacherFunction({ action: "create", email, password });
      setMessage(`Lehrperson ${email.trim().toLowerCase()} wurde angelegt.`);
      setEmail("");
      setPassword("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anlegen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (teacher: Teacher) => {
    if (!window.confirm(`Lehrperson ${teacher.email} komplett löschen?`)) return;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await callTeacherFunction({ action: "delete", userId: teacher.id });
      setMessage(`Lehrperson ${teacher.email} wurde gelöscht.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tab">
      <div className="tab__head">
        <div>
          <h2 className="tab__title">Lehrpersonen</h2>
          <p className="muted">
            Lege neue Lehrpersonen an und verwalte ihre Konten.
          </p>
        </div>
      </div>

      {error ? <div className="banner banner--error">{error}</div> : null}
      {message ? <div className="banner banner--ok">{message}</div> : null}

      <form className="panel" onSubmit={create}>
        <h3 className="panel__subtitle">Neue Lehrperson</h3>
        <div className="row">
          <input
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-Mail"
            autoComplete="off"
            required
          />
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Passwort (min. 8 Zeichen)"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <button
            className="btn btn--primary"
            type="submit"
            disabled={busy || !email.trim() || password.length < 8}
          >
            {busy ? "Wird angelegt…" : "Hinzufügen"}
          </button>
        </div>
        <p className="hint">
          Die Person kann sich danach unter „/#/login“ anmelden und Tutorials
          sowie Klassen verwalten.
        </p>
      </form>

      {loading ? <p className="muted">Wird geladen…</p> : null}

      <ul className="items">
        {teachers.map((teacher) => (
          <li key={teacher.id} className="item">
            <div className="item__body">
              <div className="item__title">{teacher.email}</div>
            </div>
            <div className="item__actions">
              <button
                type="button"
                className="btn btn--danger btn--small"
                onClick={() => remove(teacher)}
                disabled={busy}
              >
                Entfernen
              </button>
            </div>
          </li>
        ))}
      </ul>

      {!loading && teachers.length === 0 ? (
        <div className="empty">Noch keine Lehrpersonen.</div>
      ) : null}
    </section>
  );
}
