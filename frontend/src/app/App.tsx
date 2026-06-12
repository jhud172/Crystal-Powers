import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./Layout";
import { About } from "../routes/About";
import { Contact } from "../routes/Contact";
import { Home } from "../routes/Home";
import { NotFound } from "../routes/NotFound";
import { Portfolio } from "../routes/Portfolio";
import { PortfolioProject } from "../routes/PortfolioProject";
import { Services } from "../routes/Services";
import { Support } from "../routes/Support";

export default function App() {
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
