import { createRoot } from "react-dom/client";
import { ObservatoryDraft } from "../src/features/design/ObservatoryDraft";
import "../src/styles/pages/studio.css";
import "../src/styles/base/studio-tokens.css";
import "../src/styles/design/observatory.css";

createRoot(document.getElementById("root")!).render(<ObservatoryDraft />);
