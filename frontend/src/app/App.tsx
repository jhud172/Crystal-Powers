import { PrivacyPublication } from "../features/privacy/PrivacyPublication";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./Layout";
import { About } from "../routes/About";
import { Accessibility } from "../routes/Accessibility";
import { Contact } from "../routes/Contact";
import { Home } from "../routes/Home";
import { NotFound } from "../routes/NotFound";
import { Portfolio } from "../routes/Portfolio";
import { PortfolioProject } from "../routes/PortfolioProject";
import { Services } from "../routes/Services";
import { Support } from "../routes/Support";

const Privacy=lazy(()=>import("../routes/Privacy").then(module=>({default:module.Privacy})));
const BirthdayMission = lazy(() => import("../routes/BirthdayMission"));
const Admin = lazy(() => import("../routes/Admin"));
const TeamEntry = lazy(() => import("../features/team/TeamEntry"));
const ClientEntry = lazy(() => import("../features/client/ClientEntry"));

export default function App() {
  const location = useLocation();

  if (location.pathname.replace(/\/+$/, "") === "/birthday/mission-vi") {
    return (
      <Suspense fallback={<div className="birthday-route-loading" role="status">Loading Mission VI status…</div>}>
        <BirthdayMission />
      </Suspense>
    );
  }

  return (
    <PrivacyPublication enabled={!/^\/(admin|team|client)(\/|$)/.test(location.pathname)}><Layout owner={/^\/(admin|team|client)(\/|$)/.test(location.pathname)}>
      <Routes>
        <Route path="/client/*" element={<Suspense fallback={<div className="studio-section" role="status">Opening your client workspace…</div>}><ClientEntry /></Suspense>} />
        <Route path="/team/*" element={<Suspense fallback={<div className="studio-section" role="status">Opening the team workspace…</div>}><TeamEntry /></Suspense>} />
        <Route path="/admin/*" element={<Suspense fallback={<div className="studio-section" role="status">Opening the owner studio…</div>}><Admin /></Suspense>} />
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Suspense fallback={<div className="studio-section" role="status">Loading privacy information…</div>}><Privacy/></Suspense>}/>
        <Route path="/accessibility" element={<Accessibility />} />
        <Route path="/services" element={<Services />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/portfolio/:slug" element={<PortfolioProject />} />
        <Route path="/support" element={<Support />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout></PrivacyPublication>
  );
}
