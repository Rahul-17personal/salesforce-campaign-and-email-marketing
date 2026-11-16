import { useCallback, useEffect, useState } from "react";
import {
  Activity, BarChart3, Bell, ChevronDown, CircleHelp, Contact, LayoutDashboard,
  LogOut, Mail, Megaphone, Settings, ShieldCheck, Users, Workflow, Zap
} from "lucide-react";

type Health = { status: string; service: string; environment: string };
type AuthStatus = {
  configured: boolean;
  authenticated: boolean;
  csrfToken: string | null;
  user: { userId: string; orgId: string; username: string; displayName: string; email?: string } | null;
};

const nav = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Contacts & Leads", icon: Contact },
  { label: "Audiences", icon: Users },
  { label: "Campaigns", icon: Megaphone },
  { label: "Email Studio", icon: Mail },
  { label: "Automation", icon: Workflow },
  { label: "Analytics", icon: BarChart3 }
];

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [active, setActive] = useState("Overview");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const refreshStatus = useCallback(async () => {
    const [healthResult, authResult] = await Promise.allSettled([
      fetch("/api/health", { credentials: "same-origin" }),
      fetch("/api/auth/status", { credentials: "same-origin", cache: "no-store" })
    ]);
    if (healthResult.status === "fulfilled" && healthResult.value.ok) {
      setHealth(await healthResult.value.json() as Health);
    } else {
      setHealth(null);
    }
    if (authResult.status === "fulfilled" && authResult.value.ok) {
      setAuth(await authResult.value.json() as AuthStatus);
    } else {
      setAuth(null);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    const query = new URLSearchParams(window.location.search);
    const errorCode = query.get("authError");
    if (errorCode) {
      const messages: Record<string, string> = {
        state_validation_failed: "The Salesforce sign-in could not be verified. Please try again.",
        access_denied: "Salesforce access was not approved.",
        authorization_failed: "Salesforce authorization was not completed.",
        oauth_not_configured: "Salesforce OAuth is not configured on the API server.",
        salesforce_login_failed: "Salesforce sign-in failed. Check the External Client App configuration and API logs."
      };
      setAuthError(messages[errorCode] ?? "Salesforce sign-in failed. Please try again.");
      query.delete("authError");
      const remaining = query.toString();
      const nextUrl = remaining ? `${window.location.pathname}?${remaining}` : window.location.pathname;
      window.history.replaceState({}, "", nextUrl);
    }
  }, [refreshStatus]);

  const connectSalesforce = () => {
    // Keep OAuth start and callback on the same host so the session cookie survives the redirect.
    const base = window.location.hostname === "127.0.0.1" ? "http://localhost:5173" : "";
    window.location.assign(`${base}/api/auth/salesforce`);
  };

  const logout = async () => {
    if (!auth?.csrfToken) return;
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": auth.csrfToken }
      });
      if (!response.ok) throw new Error("Logout request was rejected.");
      setAuthError(null);
      await refreshStatus();
    } catch {
      setAuthError("Could not complete sign-out. Please refresh and try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const userName = auth?.user?.displayName ?? "Marketing Team";
  const initials = auth?.user?.displayName?.trim().slice(0, 1).toUpperCase() ?? "M";

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Zap size={19}/></div><div><strong>CampaignHub</strong><span>SALESFORCE MARKETING</span></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(({ label, icon: Icon }) =>
        <button key={label} className={active === label ? "nav-item selected" : "nav-item"} onClick={() => setActive(label)}>
          <Icon size={18}/><span>{label}</span>{active === label && <i className="nav-dot"/>}
        </button>)}</nav>
      <div className="sidebar-bottom">
        <button className="nav-item" onClick={() => setActive("Settings")}><Settings size={18}/><span>Settings</span></button>
        <button className="nav-item" onClick={() => setActive("Help & support")}><CircleHelp size={18}/><span>Help & support</span></button>
        <div className="user-card"><div className="avatar">{initials}</div><div><strong>{userName}</strong><span>{auth?.authenticated ? auth.user?.username : "Salesforce not connected"}</span></div><ChevronDown size={15}/></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="breadcrumbs">Workspace <span>/</span> {active}</div>
        <div className="top-actions">
          <span className={health ? "api-status online" : "api-status"}><i/>{health ? "API connected" : "API not connected"}</span>
          {auth?.authenticated && <span className="salesforce-status"><i/>Salesforce connected</span>}
          <button className="icon-button" aria-label="Notifications"><Bell size={18}/></button>
          {auth?.authenticated && <button className="profile-action" onClick={logout} disabled={loggingOut}><LogOut size={15}/>{loggingOut ? "Signing out" : "Sign out"}</button>}
          <div className="avatar small">{initials}</div>
        </div>
      </header>

      <div className="content">
        <section className="welcome">
          <div><div className="eyebrow">MARKETING WORKSPACE</div><h1>Good afternoon 👋</h1><p>Here's what's happening with your marketing workspace.</p></div>
          <button className="connect-button" onClick={connectSalesforce} disabled={!auth?.configured || auth.authenticated}>
            <ShieldCheck size={17}/>{auth?.authenticated ? "Salesforce Connected" : auth?.configured ? "Connect Salesforce" : "Configure Salesforce OAuth"}
            {!auth?.configured && <span className="soon">SETUP REQUIRED</span>}
          </button>
        </section>

        {authError && <section className="notice error-notice"><div className="notice-icon"><ShieldCheck size={19}/></div><div><strong>Sign-in message</strong><p>{authError}</p></div></section>}

        <section className="notice">
          <div className="notice-icon"><ShieldCheck size={19}/></div>
          <div>
            <strong>{auth?.authenticated ? `Salesforce connected as ${auth.user?.displayName}` : auth?.configured ? "Salesforce OAuth is configured" : "Complete Salesforce OAuth setup"}</strong>
            <p>{auth?.authenticated
              ? "Your Salesforce identity has been verified. The next step is to add permission-aware CRM queries."
              : auth?.configured
                ? "Your server credentials are present. Connect your individual Salesforce account to continue."
                : "Create a Salesforce External Client App, then add its client ID and secret to the API server's local .env file. Never place those values in frontend code or GitHub."}</p>
          </div>
        </section>

        <section className="metrics">
          <Metric title="Active campaigns" note="CRM integration comes in Phase 3" icon={<Megaphone/>}/>
          <Metric title="Contacts available" note="Live CRM data not connected" icon={<Users/>}/>
          <Metric title="Emails delivered" note="SES integration not configured" icon={<Mail/>}/>
          <Metric title="Engagement rate" note="Analytics not configured" icon={<Activity/>}/>
        </section>

        <section className="panel-grid">
          <div className="panel">
            <div className="panel-heading"><div><h2>Campaign performance</h2><p>Monitor the results of your email campaigns</p></div><button className="select-button">Last 30 days <ChevronDown size={14}/></button></div>
            <div className="empty-chart"><div className="chart-icon"><BarChart3 size={27}/></div><strong>Your campaign insights will appear here</strong><span>Connect Salesforce and configure SES to start tracking performance.</span></div>
          </div>
          <div className="panel activity-panel">
            <div className="panel-heading"><div><h2>Getting started</h2><p>Your setup checklist</p></div></div>
            <Check n="01" title="Connect Salesforce" detail={auth?.authenticated ? "Salesforce identity connected" : "Authorize access using your Salesforce account"} complete={Boolean(auth?.authenticated)}/>
            <Check n="02" title="Configure Amazon SES" detail="Verify your sending domain and request production access"/>
            <Check n="03" title="Set up campaign approvals" detail="Define who can review and authorize sends"/>
            <Check n="04" title="Build your first audience" detail="Use Salesforce contacts and leads" locked/>
          </div>
        </section>
        <footer><span>CampaignHub <b>•</b> Phase 2 – Salesforce authentication</span><span>Designed with security and governance first</span></footer>
      </div>
    </main>
  </div>;
}

function Metric({ title, note, icon }: { title: string; note: string; icon: React.ReactNode }) {
  return <div className="metric-card"><div className="metric-top"><span>{title}</span><div className="metric-icon">{icon}</div></div><strong>—</strong><small>{note}</small></div>;
}
function Check({ n, title, detail, locked = false, complete = false }: { n: string; title: string; detail: string; locked?: boolean; complete?: boolean }) {
  return <div className="check-row"><span className="check-number">{complete ? "✓" : n}</span><div><strong>{title}</strong><small>{detail}</small></div><span className={complete ? "tag complete" : locked ? "tag locked" : "tag pending"}>{complete ? "Complete" : locked ? "Locked" : "Pending"}</span></div>;
}
