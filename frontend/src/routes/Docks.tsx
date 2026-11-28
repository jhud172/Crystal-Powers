import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PrivacyLink } from "../features/privacy/PrivacyPublication";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { EnquiryForm } from "../features/contact/EnquiryForm";
import { EnquiryProvider } from "../features/contact/EnquiryContext";
import "../styles/pages/docks.css";

const releasePath = "/api/docks/releases/windows-x64";
const preview = "/renders/docks/overview.png";
type Release = { state: "loading" | "unlisted" | "error" } | { state: "available"; version: string; sha256: string };

function readRelease(data: unknown): Release {
  if (!data || typeof data !== "object" || Array.isArray(data)) return { state: "error" };
  if (!("version" in data)) return { state: "unlisted" };
  const { version } = data;
  if (typeof version !== "string" || !/^(0|[1-9][0-9]{0,4})\.(0|[1-9][0-9]{0,4})\.(0|[1-9][0-9]{0,4})\.0$/.test(version))
    return { state: "error" };
  const parts = version.split(".").map(Number);
  if (parts.some(part => part > 65535) || (parts[0] === 0 && parts[1] === 0)) return { state: "error" };
  const sha256 = "sha256" in data ? data.sha256 : undefined;
  if (typeof sha256 !== "string" || !/^[a-f0-9]{64}$/.test(sha256)) return { state: "error" };
  return { state: "available", version, sha256 };
}

export default function Docks() {
  const [release, setRelease] = useState<Release>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  usePageMetadata("Crystal Docks for Windows | Crystal Powers",
    "Check your Windows 11 PC, understand what Crystal Docks finds and review supported repairs.", "/projects/docks", preview);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setRelease({ state: "error" });
      controller.abort();
    }, 8000);
    void fetch(releasePath, { signal: controller.signal, credentials: "omit", redirect: "error", cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error("Release unavailable");
        return response.json() as Promise<unknown>;
      })
      .then(data => {
        if (!controller.signal.aborted) setRelease(readRelease(data));
      })
      .catch(() => {
        if (!controller.signal.aborted) setRelease({ state: "error" });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  return <article className="docks-page studio-section">
    <div className="docks-intro">
      <header className="docks-copy">
        <p className="studio-eyebrow">Crystal Docks for Windows</p>
        <h1>See how your PC is doing.</h1>
        <p className="docks-lede">Check your PC’s performance, storage and drive health. Get clear explanations and review supported maintenance tasks before they run.</p>
        <div className="docks-download">
          <div className="docks-actions">
            {release.state === "available" && <a className="docks-primary" href={releasePath + "/" + release.version + "/download"}>Download for Windows</a>}
            {release.state === "error" && <button className="docks-primary" type="button" onClick={() => {
              setRelease({ state: "loading" });
              setAttempt(value => value + 1);
            }}>Check again</button>}
            <Link className="docks-report-link" to="/account/dashboard/docks">Open device reports <span aria-hidden="true">→</span></Link>
          </div>
          <p className="docks-release" role="status">
            {release.state === "loading" && "Checking for a Windows download…"}
            {release.state === "unlisted" && "The public download is coming later."}
            {release.state === "error" && "Couldn’t check download availability."}
            {release.state === "available" && `Signed installer · Version ${release.version}`}
          </p>
          <p className="docks-requirements">Requires Windows 11 (x64) and a Crystal Docks account.</p>
          {release.state === "available" && <details className="docks-integrity">
            <summary>Installer checksum</summary>
            <p>Compare this SHA-256 checksum with the downloaded file before installing.</p>
            <code>{release.sha256}</code>
          </details>}
        </div>
      </header>
      <figure className="docks-preview">
        <img src={preview} width={954} height={751} alt="Crystal Docks device overview showing processor and memory measurements, drive health and maintenance tools." />
        <figcaption>Advanced view with example data</figcaption>
      </figure>
    </div>
    <section className="docks-details" aria-label="Plans and privacy">
      <div><h2>Free checks</h2><p>Run checks and keep a local history. Switch to the advanced view for detailed findings and installed software.</p></div>
      <div><h2>Premium repairs</h2><p>Review each supported repair and choose whether to run it. Crystal Docks checks your Premium access online before a repair.</p></div>
      <div><h2>Optional report sharing</h2><p>Device history stays on your PC. You can choose to share device summaries to view them online.</p></div>
    </section>
    <p><Link className="docks-report-link" to="/docks/support">Get Crystal Docks support <span aria-hidden="true">→</span></Link></p>
    <PrivacyLink className="docks-report-link" />
  </article>;
}

export function DocksSupport() {
  usePageMetadata("Crystal Docks support | Crystal Powers",
    "Get help with the Windows app, your account or a Crystal Docks subscription.", "/docks/support", preview);
  return <section className="studio-section enquiry-page" aria-labelledby="docks-support-title">
    <h1 id="docks-support-title">Crystal Docks support</h1>
    <p>Get help with the Windows app, your account or a subscription. You can send a request without signing in.</p>
    <p>If you chose to share a diagnostic log or device summary, you can include its support reference. Keep passwords and sign-in codes out of the request.</p>
    <p><Link to="/projects/docks">About Crystal Docks</Link>{" · "}<Link to="/account/dashboard/docks">Manage reports and access</Link></p>
    <EnquiryProvider startingIntent="support"><EnquiryForm docksSupport /></EnquiryProvider>
  </section>;
}
