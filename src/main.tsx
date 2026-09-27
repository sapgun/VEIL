import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Landing from "./Landing";
import "./styles.css";
import "./analog.css";

const path = window.location.pathname.replace(/\/+$/, "") || "/";
// Real links intentionally navigate directly to the app, with no sign-up gate.
const page = path === "/" ? <Landing /> :
  path === "/app" || path === "/verifier" ? <App /> :
  <main className="shell"><h1>Page not found.</h1><p><a href="/">Return to VEIL</a> · <a href="/app">Open app →</a></p></main>;

createRoot(document.getElementById("root")!).render(
  <StrictMode>{page}</StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/sw.js").catch(() => {
    /* The online desktop demo does not require a service worker. */
  });
}
