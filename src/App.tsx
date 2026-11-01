import { useHashRoute } from "./lib/useHashRoute";
import { StudentView } from "./components/StudentView";
import { AdminView } from "./components/AdminView";

export default function App() {
  const route = useHashRoute();
  return route === "admin" ? <AdminView /> : <StudentView />;
}
