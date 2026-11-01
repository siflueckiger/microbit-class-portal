import { useEffect } from "react";
import { useSession } from "./lib/auth";
import { navigate, useRoute } from "./lib/router";
import { Landing } from "./components/Landing";
import { Login } from "./components/Login";
import { StudentClass } from "./components/StudentClass";
import { TutorialRunner } from "./components/TutorialRunner";
import { TeacherDashboard } from "./components/TeacherDashboard";
import { TutorialBuilder } from "./components/TutorialBuilder";

function Redirect({ to }: { to: string }) {
  useEffect(() => {
    navigate(to);
  }, [to]);
  return null;
}

export default function App() {
  const route = useRoute();
  const session = useSession();

  if (session === undefined) {
    return <div className="center-screen">Lädt…</div>;
  }

  switch (route.name) {
    case "login":
      return session ? <Redirect to="/admin" /> : <Login />;

    case "admin":
      return session ? (
        <TeacherDashboard email={session.user.email ?? ""} />
      ) : (
        <Redirect to="/login" />
      );

    case "builder":
      return session ? (
        <TutorialBuilder tutorialId={route.tutorialId} />
      ) : (
        <Redirect to="/login" />
      );

    case "class":
      return <StudentClass code={route.code} />;

    case "play":
      return (
        <TutorialRunner code={route.code} tutorialId={route.tutorialId} />
      );

    default:
      return <Landing />;
  }
}
