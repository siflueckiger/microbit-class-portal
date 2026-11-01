import { useEffect, useState } from "react";

export type Route = "home" | "admin";

function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "").toLowerCase();
  return clean.startsWith("admin") ? "admin" : "home";
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(window.location.hash),
  );

  useEffect(() => {
    const handleChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", handleChange);
    return () => window.removeEventListener("hashchange", handleChange);
  }, []);

  return route;
}
