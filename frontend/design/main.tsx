import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { EnquiryProvider } from "../src/features/contact/EnquiryContext";
import { Layout } from "../src/app/Layout";
import { LiquidLightDraft } from "../src/features/design/LiquidLightDraft";
import "../src/styles/index.css";
import "../src/styles/design/liquid-light-draft.css";

createRoot(document.getElementById("root")!).render(<BrowserRouter><EnquiryProvider><Layout><LiquidLightDraft /></Layout></EnquiryProvider></BrowserRouter>);
