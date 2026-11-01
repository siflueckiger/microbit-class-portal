import { useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "login" }
  | { name: "class"; code: string }
  | { name: "play"; code: string; tutorialId: string }
  | { name: "admin" }
  | { name: "builder"; tutorialId?: string };

export function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "");
  const parts = clean.split("/").filter(Boolean).map(decodeURIComponent);

  if (parts[0] === "login") return { name: "login" };

  if (parts[0] === "class" && parts[1]) {
    if (parts[2] === "play" && parts[3]) {
      return { name: "play", code: parts[1], tutorialId: parts[3] };
    }
    return { name: "class", code: parts[1] };
  }

  if (parts[0] === "admin") {
    if (parts[1] === "tutorial") {
      if (!parts[2] || parts[2] === "new") return { name: "builder" };
      return { name: "builder", tutorialId: parts[2] };
    }
    return { name: "admin" };
  }

  return { name: "home" };
}

export function useRoute(): Route {
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

export function navigate(path: string): void {
  window.location.hash = path.startsWith("#") ? path : `#${path}`;
}
