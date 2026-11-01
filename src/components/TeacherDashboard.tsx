import { useState } from "react";
import { signOut } from "../lib/auth";
import { navigate } from "../lib/router";
import { ClassesTab } from "./ClassesTab";
import { TutorialsTab } from "./TutorialsTab";

export function TeacherDashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<"tutorials" | "classes">("tutorials");

  const logout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="admin">
      <header className="admin__header">
        <div>
          <p className="eyebrow">Lehrperson</p>
          <h1 className="admin__title">Verwaltung</h1>
          <p className="muted">{email}</p>
        </div>
        <div className="row">
          <a className="btn" href="#/">
            Zur Website
          </a>
          <button type="button" className="btn" onClick={logout}>
            Abmelden
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button
          type="button"
          className={"tabBtn" + (tab === "tutorials" ? " tabBtn--active" : "")}
          onClick={() => setTab("tutorials")}
        >
          Tutorials
        </button>
        <button
          type="button"
          className={"tabBtn" + (tab === "classes" ? " tabBtn--active" : "")}
          onClick={() => setTab("classes")}
        >
          Klassen
        </button>
      </nav>

      {tab === "tutorials" ? <TutorialsTab /> : <ClassesTab />}
    </div>
  );
}
