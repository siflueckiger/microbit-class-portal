import { useEffect, useState } from "react";
import {
  studentGetClass,
  type StudentClass as StudentClassData,
} from "../lib/api";
import { rememberClass } from "../lib/joined";
import { navigate } from "../lib/router";
import { ErrorScreen, NotFoundClass } from "./Screens";

export function StudentClass({ code }: { code: string }) {
  const [data, setData] = useState<StudentClassData | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    setData(undefined);
    setError(undefined);

    studentGetClass(code)
      .then((result) => {
        if (!active) return;
        setData(result);
        if (result) {
          rememberClass({ code: code.toUpperCase(), name: result.name });
        }
      })
      .catch((e) => {
        if (!active) return;
        setError(
          e instanceof Error
            ? e.message
            : "Klasse konnte nicht geladen werden.",
        );
      });

    return () => {
      active = false;
    };
  }, [code]);

  if (error) return <ErrorScreen message={error} />;
  if (data === undefined) {
    return <div className="center-screen">Klasse wird geladen…</div>;
  }
  if (data === null) return <NotFoundClass code={code} />;

  return (
    <div className="site">
      <header className="site__header">
        <div>
          <p className="eyebrow">Klasse</p>
          <h1 className="site__title">{data.name}</h1>
        </div>
        <button type="button" className="btn" onClick={() => navigate("/")}>
          Klasse wechseln
        </button>
      </header>

      <main className="site__main">
        {data.tutorials.length === 0 ? (
          <div className="state">
            Für diese Klasse sind noch keine Tutorials freigeschaltet.
          </div>
        ) : (
          <div className="cards">
            {data.tutorials.map((tutorial) => (
              <button
                key={tutorial.id}
                type="button"
                className="card"
                onClick={() =>
                  navigate(
                    `/class/${encodeURIComponent(code)}/play/${tutorial.id}`,
                  )
                }
              >
                <span className="card__title">{tutorial.title}</span>
                <span className="card__desc">{tutorial.description}</span>
                <span className="card__cta">Starten →</span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
