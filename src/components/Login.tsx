import { useState, type FormEvent } from "react";
import { signIn } from "../lib/auth";
import { navigate } from "../lib/router";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await signIn(email, password);
      navigate("/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center-screen">
      <form className="panel authPanel" onSubmit={submit}>
        <h1 className="authPanel__title">Lehrperson anmelden</h1>

        <label className="field">
          <span className="field__label">E-Mail</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Passwort</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error ? <div className="banner banner--error">{error}</div> : null}

        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? "Anmelden…" : "Anmelden"}
        </button>

        <a className="muted link" href="#/">
          ← Zur Startseite
        </a>
      </form>
    </div>
  );
}
