export function LoadingScreen({ label = "Lädt…" }: { label?: string }) {
  return <div className="center-screen">{label}</div>;
}

export function ErrorScreen({
  message,
  backTo = "/",
}: {
  message: string;
  backTo?: string;
}) {
  return (
    <div className="center-screen">
      <div className="panel panel--narrow">
        <h2>Etwas ist schiefgelaufen</h2>
        <p className="muted">{message}</p>
        <a className="btn" href={`#${backTo}`}>
          Zurück
        </a>
      </div>
    </div>
  );
}

export function NotFoundClass({ code }: { code: string }) {
  return (
    <div className="center-screen">
      <div className="panel panel--narrow">
        <h2>Klasse nicht gefunden</h2>
        <p className="muted">
          Der Code <strong>{code}</strong> passt zu keiner Klasse. Bitte prüfe
          ihn noch einmal.
        </p>
        <a className="btn btn--primary" href="#/">
          Anderen Code eingeben
        </a>
      </div>
    </div>
  );
}
