import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PasswordField } from "../admin/PasswordField";
import { api, clearCsrf } from "../portfolio/projectApi";

const products = [
  { id: "powers", name: "Crystal Powers", route: "/account/dashboard" },
  { id: "docks", name: "Crystal Docks", route: "/account/dashboard/docks" },
  { id: "hub", name: "CrystalHub", route: "/account/dashboard/hub" },
] as const;

type Product = typeof products[number]["id"];
type WorkspaceLink = { connected: boolean };
const endpoint = "/api/client/auth/product-link";

export function DashboardNavigation({ product }: { product: Product }) {
  return <nav className="product-dashboard-nav" aria-label="Your products">
    {products.map(item => <Link key={item.id} to={item.route}
      aria-current={product === item.id ? "page" : undefined}>{item.name}</Link>)}
  </nav>;
}

export function DashboardProductView({ product, token }: { product: Exclude<Product, "docks">; token: string }) {
  if (product === "hub") return <section className="product-dashboard-panel" aria-labelledby="hub-title">
    <h2 id="hub-title">CrystalHub</h2>
    <p>Under construction.</p>
  </section>;

  return <ClientWorkspaceLink token={token} />;
}

function ClientWorkspaceLink({ token }: { token: string }) {
  const navigate = useNavigate();
  const [link, setLink] = useState<WorkspaceLink | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void api<WorkspaceLink>(endpoint, {
      headers: { Authorization: "Bearer " + token }, signal: controller.signal,
    }).then(setLink).catch(failure => {
      if (!controller.signal.aborted) setError((failure as Error).message);
    });
    return () => controller.abort();
  }, [token, refresh]);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setError("");
    setNotice("");
    setBusy(true);
    try { await action(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }

  function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    void run(async () => {
      const result = await api<WorkspaceLink>(endpoint, {
        method: "POST", headers: { Authorization: "Bearer " + token },
        body: JSON.stringify({ email: values.get("email"), password: values.get("password") }),
      });
      form.reset();
      setLink(result);
      setNotice("Client workspace connected.");
    });
  }

  return <section className="product-dashboard-panel" aria-labelledby="powers-title">
    <h2 id="powers-title">Crystal Powers</h2>
    <p>See project progress, files and conversations in your client workspace.</p>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {link?.connected ? <div className="product-dashboard-toolbar">
      <button type="button" className="admin-primary" disabled={busy} onClick={() => void run(async () => {
        await api(endpoint + "/open", { method: "POST", headers: { Authorization: "Bearer " + token } });
        clearCsrf();
        void navigate("/client");
      })}>Open client workspace</button>
      <button type="button" className="admin-secondary" disabled={busy} onClick={() => {
        if (!window.confirm("Disconnect this client workspace from your product dashboard?")) return;
        void run(async () => {
          setLink(await api<WorkspaceLink>(endpoint, { method: "DELETE", headers: { Authorization: "Bearer " + token } }));
          setNotice("Client workspace disconnected.");
        });
      }}>Disconnect workspace</button>
    </div> : link ? <form className="admin-form" onSubmit={connect} aria-busy={busy}>
      <p>Already have a client workspace? Confirm your client sign-in once to connect it to this dashboard.</p>
      <fieldset disabled={busy}>
        <label>Client email address<input name="email" type="email" autoComplete="username" maxLength={254} required /></label>
        <PasswordField label="Client password" name="password" />
        <button className="admin-primary">Connect workspace</button>
      </fieldset>
      <Link to="/contact">Contact Crystal Powers</Link>
    </form> : error ? <button className="admin-secondary" type="button" onClick={() => {
      setError(""); setRefresh(value => value + 1);
    }}>Retry workspace check</button> : <p role="status">Checking your workspace…</p>}
  </section>;
}
