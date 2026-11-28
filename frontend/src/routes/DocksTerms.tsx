import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PrivacyLink } from "../features/privacy/PrivacyPublication";
import { api, ApiError } from "../features/portfolio/projectApi";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { NotFound } from "./NotFound";

type Terms = { body: string };
type State =
  | { status: "loading" | "unavailable" | "missing" }
  | { status: "published"; terms: Terms };

export default function DocksTerms() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    void api<Terms>("/api/site/docks-terms", { signal: controller.signal })
      .then(terms => {
        if (controller.signal.aborted) return;
        if (typeof terms?.body === "string" && terms.body.trim()) setState({ status: "published", terms });
        else setState({ status: "unavailable" });
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setState({ status: error instanceof ApiError && error.status === 404 ? "missing" : "unavailable" });
      });
    return () => controller.abort();
  }, []);

  const published = state.status === "published";
  usePageMetadata(
    published ? "Crystal Docks terms | Crystal Powers" : "Crystal Powers",
    published ? "Terms for the Crystal Docks website and account." : "Crystal Powers website and applications.",
    "/projects/docks/terms",
  );

  if (state.status === "missing") return <NotFound />;

  return <article className="privacy-page studio-section">
    <header>
      <h1>Crystal Docks terms</h1>
      <p><Link to="/projects/docks">About Crystal Docks</Link>{" · "}<Link to="/docks/support">Get support</Link></p>
      <PrivacyLink />
    </header>
    {state.status === "loading" && <p role="status">Loading Crystal Docks terms…</p>}
    {state.status === "unavailable" && <p role="alert">The terms couldn’t be loaded. Reload this page to try again.</p>}
    {state.status === "published" && <section aria-label="Terms"><p>{state.terms.body}</p></section>}
  </article>;
}
