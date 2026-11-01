import { useState, type FormEvent } from "react";
import { SITE_SUBTITLE, SITE_TITLE } from "../config";
import { forgetClass, getJoinedClasses } from "../lib/joined";
import { navigate } from "../lib/router";

export function Landing() {
  const [code, setCode] = useState("");
  const [joined, setJoined] = useState(getJoinedClasses);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = code.trim().toUpperCase();
    if (value) navigate(`/class/${encodeURIComponent(value)}`);
  };

  const remove = (value: string) => {
    forgetClass(value);
    setJoined(getJoinedClasses());
  };

  return (
    <div className="landing">
      <header className="landing__header">
        <h1 className="landing__title">{SITE_TITLE}</h1>
        <p className="landing__subtitle">{SITE_SUBTITLE}</p>
      </header>

      <main className="landing__main">
        <section className="panel panel--hero">
          <h2>Als Schüler:in starten</h2>
          <p className="muted">
            Gib den Klassencode ein, den du von deiner Lehrperson erhalten hast.
          </p>

          <form className="joinForm" onSubmit={submit}>
            <input
              className="input input--code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="z. B. 7K2M9F"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={12}
              aria-label="Klassencode"
            />
            <button
              className="btn btn--primary"
              type="submit"
              disabled={!code.trim()}
            >
              Beitreten
            </button>
          </form>

          {joined.length > 0 ? (
            <div className="joined">
              <span className="joined__label">Zuletzt besucht:</span>
              {joined.map((item) => (
                <span key={item.code} className="joined__item">
                  <button
                    type="button"
                    className="chip"
                    onClick={() =>
                      navigate(`/class/${encodeURIComponent(item.code)}`)
                    }
                  >
                    {item.name} · {item.code}
                  </button>
                  <button
                    type="button"
                    className="iconBtn"
                    title="Entfernen"
                    onClick={() => remove(item.code)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <section className="panel panel--teacher">
          <h2>Lehrperson</h2>
          <p className="muted">Tutorials erstellen und Klassen verwalten.</p>
          <a className="btn" href="#/login">
            Anmelden
          </a>
        </section>
      </main>
    </div>
  );
}
