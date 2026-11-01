import { useCallback, useEffect, useMemo, useState } from "react";
import { REPO, TOKEN_STORAGE_KEY } from "../config";
import {
  deleteTutorial,
  getManifest,
  publishTutorial,
  validateToken,
} from "../lib/github";
import {
  classesOf,
  tutorialsForClass,
  type Manifest,
  type TutorialEntry,
} from "../lib/manifest";

export function AdminView() {
  const [token, setToken] = useState(
    () => window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "",
  );
  const [tokenInput, setTokenInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string>();

  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [className, setClassName] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setManifest(await getManifest(token || undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tutorials.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const classes = useMemo(
    () => (manifest ? classesOf(manifest) : []),
    [manifest],
  );

  const connect = useCallback(async () => {
    const value = tokenInput.trim();
    if (!value) return;

    setConnecting(true);
    setConnectError(undefined);
    try {
      await validateToken(value);
      window.localStorage.setItem(TOKEN_STORAGE_KEY, value);
      setToken(value);
      setTokenInput("");
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "Could not connect.");
    } finally {
      setConnecting(false);
    }
  }, [tokenInput]);

  const disconnect = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken("");
    setManifest(null);
    setError(undefined);
    setMessage(undefined);
  }, []);

  const publish = useCallback(async () => {
    setError(undefined);
    setMessage(undefined);

    if (!token) {
      setError("Connect GitHub before publishing.");
      return;
    }

    const input = {
      title: title.trim(),
      description: description.trim(),
      className: className.trim(),
      markdown: markdown.trim(),
    };
    if (!input.title || !input.className || !input.markdown) {
      setError("Title, class, and Markdown are required.");
      return;
    }

    setPublishing(true);
    try {
      const entry = await publishTutorial(input, token);
      setMessage(
        `Published “${entry.title}” to class ${entry.class}. Students see it within a few minutes.`,
      );
      setTitle("");
      setDescription("");
      setMarkdown("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setPublishing(false);
    }
  }, [className, description, markdown, refresh, title, token]);

  const remove = useCallback(
    async (entry: TutorialEntry) => {
      if (!token) {
        setError("Connect GitHub before deleting.");
        return;
      }
      if (!window.confirm(`Delete “${entry.title}”? This cannot be undone.`)) {
        return;
      }

      setDeletingId(entry.id);
      setError(undefined);
      setMessage(undefined);
      try {
        await deleteTutorial(entry, token);
        setMessage(`Deleted “${entry.title}”.`);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed.");
      } finally {
        setDeletingId(undefined);
      }
    },
    [refresh, token],
  );

  return (
    <div className="admin">
      <header className="admin__header">
        <div>
          <h1 className="admin__title">Tutorial admin</h1>
          <p className="admin__subtitle">
            {REPO.owner}/{REPO.name}
          </p>
        </div>
        <a className="btn btn--ghost" href="#/">
          ← Back to site
        </a>
      </header>

      {error ? <div className="banner banner--error">{error}</div> : null}
      {message ? <div className="banner banner--ok">{message}</div> : null}

      <section className="panel">
        <h2>GitHub connection</h2>
        {token ? (
          <div className="row">
            <span className="ok">Connected</span>
            <button type="button" className="btn" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          <>
            <p className="hint">
              Create a <strong>fine-grained token</strong> with{" "}
              <strong>Contents: Read and write</strong> for this repository,
              then paste it here. It is stored only in this browser.
            </p>
            <div className="row">
              <input
                className="input"
                type="password"
                value={tokenInput}
                placeholder="github_pat_…"
                onChange={(e) => setTokenInput(e.target.value)}
              />
              <button
                type="button"
                className="btn btn--primary"
                onClick={connect}
                disabled={connecting || !tokenInput.trim()}
              >
                {connecting ? "Checking…" : "Connect"}
              </button>
            </div>
            {connectError ? (
              <div className="banner banner--error">{connectError}</div>
            ) : null}
            <a
              className="hint"
              href="https://github.com/settings/tokens?type=beta"
              target="_blank"
              rel="noreferrer"
            >
              Create a token on GitHub →
            </a>
          </>
        )}
      </section>

      <section className="panel">
        <h2>Add a tutorial</h2>

        <label className="field">
          <span className="field__label">Title</span>
          <input
            className="input"
            value={title}
            placeholder="e.g. Flashing heart"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Description</span>
          <input
            className="input"
            value={description}
            placeholder="One sentence for the card"
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Class</span>
          <input
            className="input"
            list="admin-classes"
            value={className}
            placeholder="e.g. 5a"
            onChange={(e) => setClassName(e.target.value)}
          />
          <datalist id="admin-classes">
            {classes.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="field">
          <span className="field__label">Tutorial Markdown</span>
          <textarea
            className="input input--code"
            rows={12}
            spellCheck={false}
            value={markdown}
            placeholder={"# My tutorial\n\n## Step 1\n\n…"}
            onChange={(e) => setMarkdown(e.target.value)}
          />
        </label>

        <div className="row">
          <button
            type="button"
            className="btn btn--primary"
            onClick={publish}
            disabled={publishing || !token}
          >
            {publishing ? "Publishing…" : "Publish tutorial"}
          </button>
          {!token ? (
            <span className="hint">Connect GitHub to publish.</span>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <h2>Published tutorials</h2>
        {loading ? <p className="hint">Loading…</p> : null}
        {!loading && manifest && manifest.tutorials.length === 0 ? (
          <p className="hint">No tutorials yet.</p>
        ) : null}

        {manifest
          ? classes.map((item) => (
              <div key={item} className="admin__group">
                <h3 className="admin__groupTitle">Class {item}</h3>
                <ul className="entries">
                  {tutorialsForClass(manifest, item).map((entry) => (
                    <li key={entry.id} className="entry">
                      <div>
                        <div className="entry__title">{entry.title}</div>
                        {entry.description ? (
                          <div className="entry__desc">
                            {entry.description}
                          </div>
                        ) : null}
                        <code className="entry__file">public/{entry.file}</code>
                      </div>
                      <button
                        type="button"
                        className="btn btn--danger btn--small"
                        onClick={() => remove(entry)}
                        disabled={!token || deletingId === entry.id}
                      >
                        {deletingId === entry.id ? "Deleting…" : "Delete"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          : null}
      </section>
    </div>
  );
}
