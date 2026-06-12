import { NavLink } from "react-router-dom";
import { PageHero } from "../components/PageHero";

export function NotFound() {
  return (
    <PageHero
      eyebrow="Page not found"
      signal="404"
      title="This route does not exist yet."
      body="Return to the main site routes and continue from a working page."
      actions={<NavLink to="/" className="primary-button">Back home</NavLink>}
    />
  );
}
