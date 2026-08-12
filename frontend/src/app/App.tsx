import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./Layout";
import { About } from "../routes/About";
import { Contact } from "../routes/Contact";
import { Home } from "../routes/Home";
import { NotFound } from "../routes/NotFound";
import { Portfolio } from "../routes/Portfolio";
import { PortfolioProject } from "../routes/PortfolioProject";
import { Services } from "../routes/Services";
import { Support } from "../routes/Support";

const BirthdayMission = lazy(() => import("../routes/BirthdayMission"));

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
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/portfolio/:slug" element={<PortfolioProject />} />
        <Route path="/support" element={<Support />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
