import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell, Building2, CalendarDays,
  CheckCircle2, ChevronDown, CircleHelp, Contact, FileText, LayoutDashboard, LockKeyhole,
  LogOut, Mail, Megaphone, Search, Settings, ShieldCheck, Sparkles, Users, Workflow, Zap
} from "lucide-react";

type User = { id: string; fullName: string; email: string; role: "admin" | "marketer" | "viewer" };
type AuthState = { authenticated: boolean; csrfToken: string | null; user: User | null };
type Health = { status: string; service: string; environment: string; database: string; mode: string };
type Campaign = {
  id: string; name: string; status: string; subject_line: string | null;
  total_recipients: number; delivered_count: number; bounced_count: number;
  open_count: number; click_count: number; scheduled_at: string | null; sent_at: string | null;
};
type Contact = {
  id: string; record_type: string; first_name: string; last_name: string;
  email: string; company: string | null; city: string | null; country: string | null;
  lifecycle_status: string; marketing_consent: boolean; created_at: string;
};
type Template = { id: string; name: string; category: string; subject_line: string; preview_text: string | null; created_at: string };
type DashboardData = {
  stats: {
    totalContacts: number; marketableContacts: number; activeCampaigns: number;
    sentCampaigns: number; deliveredEmails: number; openRate: number;
    clickRate: number; templateCount: number;
  };
  campaigns: Campaign[];
  contacts: Contact[];
  templates: Template[];
};

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Contacts & Leads", icon: Contact },
  { label: "Campaigns", icon: Megaphone },
  { label: "Email Studio", icon: Mail },
  { label: "Audiences", icon: Users },
  { label: "Automation", icon: Workflow },
  { label: "Analytics", icon: BarChart3 }
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}
function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}
function statusClass(status: string): string {
  return `status-pill status-${status.toLowerCase()}`;
}

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [page, setPage] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [loginBusy, setLoginBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState("admin@campaignhub.local");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [appError, setAppError] = useState("");

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const [healthResponse, statusResponse] = await Promise.all([
        fetch("/api/health", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/auth/status", { credentials: "same-origin", cache: "no-store" })
      ]);
      if (healthResponse.ok) setHealth(await healthResponse.json() as Health);
      else setHealth(null);

      if (!statusResponse.ok) throw new Error("The API is not available. Check the backend terminal and database.");
      const status = await statusResponse.json() as AuthState;
      setAuth(status);

      if (status.authenticated) {
        const dashboardResponse = await fetch("/api/dashboard/summary", { credentials: "same-origin", cache: "no-store" });
        if (!dashboardResponse.ok) throw new Error("Could not load dashboard data. Please sign in again.");
        setData(await dashboardResponse.json() as DashboardData);
      } else {
        setData(null);
      }
      setAppError("");
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Unable to connect to CampaignHub.");
      setAuth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth?.csrfToken) {
      setLoginError("Your sign-in session is not ready. Refresh the page and try again.");
      return;
    }
    setLoginBusy(true);
    setLoginError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": auth.csrfToken },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.message ?? "Sign-in failed.");
      setLoginPassword("");
      await loadWorkspace();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setLoginBusy(false);
    }
  };

  const signOut = async () => {
    if (!auth?.csrfToken) return;
    setLogoutBusy(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": auth.csrfToken }
      });
      if (!response.ok) throw new Error("Sign-out was rejected.");
      setPage("Overview");
      await loadWorkspace();
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setLogoutBusy(false);
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="brand-mark"><Zap size={21}/></div><strong>CampaignHub</strong><span>Preparing your workspace…</span></div>;
  }

  if (!auth?.authenticated || !auth.user) {
    return <LoginScreen
      csrfReady={Boolean(auth?.csrfToken)}
      email={loginEmail}
      password={loginPassword}
      busy={loginBusy}
      error={loginError || appError}
      onEmail={setLoginEmail}
      onPassword={setLoginPassword}
      onSubmit={submitLogin}
      onDemo={(email) => { setLoginEmail(email); setLoginPassword(email.startsWith("admin") ? "CampaignHub!2026" : email.startsWith("marketing") ? "Marketing!2026" : "Viewer!2026"); setLoginError(""); }}
    />;
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Zap size={19}/></div>
        <div><strong>CampaignHub</strong><span>EMAIL MARKETING WORKSPACE</span></div>
      </div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="sidebar-nav">
        {navigation.map(({ label, icon: Icon }) =>
          <button key={label} className={page === label ? "nav-item selected" : "nav-item"} onClick={() => setPage(label)}>
            <Icon size={18}/><span>{label}</span>{page === label && <i className="nav-dot"/>}
          </button>
        )}
      </nav>
      <div className="sidebar-bottom">
        <div className="mode-card"><span className="mode-indicator"/>Standalone demo mode</div>
        <button className="nav-item" onClick={() => setPage("Settings")}><Settings size={18}/><span>Settings</span></button>
        <button className="nav-item" onClick={() => setPage("Help & support")}><CircleHelp size={18}/><span>Help & support</span></button>
        <div className="user-card">
          <div className="avatar">{initials(auth.user.fullName)}</div>
          <div className="user-details"><strong>{auth.user.fullName}</strong><span>{auth.user.role} account</span></div>
          <button className="user-menu-button" onClick={signOut} disabled={logoutBusy} title="Sign out" aria-label="Sign out"><LogOut size={15}/></button>
        </div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumbs">Workspace <span>/</span> {page}</div>
        <div className="top-actions">
          <span className={health?.database === "connected" ? "api-status online" : "api-status"}><i/>{health?.database === "connected" ? "Database connected" : "Database unavailable"}</span>
          <span className="local-mode"><span/>LOCAL WORKSPACE</span>
          <button className="icon-button" title="Notifications" aria-label="Notifications"><Bell size={18}/></button>
          <div className="avatar small">{initials(auth.user.fullName)}</div>
        </div>
      </header>

      <div className="page-content">
        {appError && <div className="inline-error"><ShieldCheck size={17}/>{appError}<button onClick={() => void loadWorkspace()}>Retry</button></div>}
        {page === "Overview" && data && <OverviewPage data={data} user={auth.user} onViewCampaigns={() => setPage("Campaigns")}/>}
        {page === "Contacts & Leads" && data && <ContactsPage contacts={data.contacts}/>}
        {page === "Campaigns" && data && <CampaignsPage campaigns={data.campaigns}/>}
        {page === "Email Studio" && data && <TemplatesPage templates={data.templates}/>}
        {!["Overview", "Contacts & Leads", "Campaigns", "Email Studio"].includes(page) && <ComingSoonPage page={page}/>}
        <footer className="app-footer"><span>CampaignHub <b>•</b> Standalone mode</span><span>Demo records are synthetic and stored locally in PostgreSQL</span></footer>
      </div>
    </main>
  </div>;
}

function LoginScreen(props: {
  csrfReady: boolean; email: string; password: string; busy: boolean; error: string;
  onEmail: (value: string) => void; onPassword: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDemo: (email: string) => void;
}) {
  return <main className="login-layout">
    <section className="login-hero">
      <div className="login-brand"><div className="brand-mark"><Zap size={21}/></div><span>CampaignHub</span></div>
      <div className="hero-copy">
        <span className="eyebrow hero-eyebrow">YOUR MARKETING COMMAND CENTRE</span>
        <h1>Campaigns that<br/><em>move business</em><br/>forward.</h1>
        <p>Organise audiences, plan campaigns and build better email experiences from one workspace.</p>
        <div className="hero-features"><span><CheckCircle2 size={16}/> Local workspace</span><span><ShieldCheck size={16}/> Role-based access</span><span><Activity size={16}/> Campaign insights</span></div>
      </div>
      <div className="hero-foot">A focused workspace for modern marketing teams.</div>
    </section>
    <section className="login-panel">
      <div className="login-card">
        <div className="login-icon"><LockKeyhole size={20}/></div>
        <span className="eyebrow">WELCOME BACK</span>
        <h2>Sign in to CampaignHub</h2>
        <p className="login-subtitle">Use your local workspace account to continue.</p>
        <form onSubmit={props.onSubmit} className="login-form">
          <label htmlFor="login-email">Email address</label>
          <input id="login-email" type="email" autoComplete="username" required value={props.email} onChange={e => props.onEmail(e.target.value)} placeholder="you@company.com"/>
          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" autoComplete="current-password" minLength={10} required value={props.password} onChange={e => props.onPassword(e.target.value)} placeholder="Enter your password"/>
          {props.error && <div className="login-error" role="alert">{props.error}</div>}
          <button className="primary-button login-submit" type="submit" disabled={props.busy || !props.csrfReady}>
            {props.busy ? "Signing in…" : "Sign in"} <span>→</span>
          </button>
        </form>
        <div className="demo-access">
          <div className="demo-heading"><Sparkles size={15}/> DEMO ACCOUNTS <span>LOCAL ONLY</span></div>
          <button onClick={() => props.onDemo("admin@campaignhub.local")}><span className="demo-avatar admin-avatar">A</span><span><strong>Administrator</strong><small>Full workspace access</small></span><b>Use account ↗</b></button>
          <button onClick={() => props.onDemo("marketing@campaignhub.local")}><span className="demo-avatar marketer-avatar">M</span><span><strong>Marketing manager</strong><small>Campaign workspace</small></span><b>Use account ↗</b></button>
          <button onClick={() => props.onDemo("viewer@campaignhub.local")}><span className="demo-avatar viewer-avatar">V</span><span><strong>Read-only viewer</strong><small>View reports and records</small></span><b>Use account ↗</b></button>
        </div>
        <div className="login-note"><ShieldCheck size={14}/> Demo accounts are for local development only. Change the seeded passwords before any shared deployment.</div>
      </div>
    </section>
  </main>;
}

function OverviewPage({ data, user, onViewCampaigns }: { data: DashboardData; user: User; onViewCampaigns: () => void }) {
  const { stats } = data;
  return <>
    <section className="welcome-row">
      <div><div className="eyebrow">MONDAY, NOVEMBER 16, 2026 · WORKSPACE OVERVIEW</div><h1>Good afternoon, {user.fullName.split(" ")[0]} <span>✦</span></h1><p>Here is what's happening across your marketing workspace.</p></div>
      <div className="welcome-actions"><span className="demo-badge"><span/> Demo data loaded</span><button className="primary-button" onClick={onViewCampaigns}><Megaphone size={16}/> View campaigns</button></div>
    </section>

    <section className="workspace-banner">
      <div className="banner-icon"><ShieldCheck size={19}/></div>
      <div><strong>Standalone workspace is ready</strong><p>Your data is stored in your local PostgreSQL database. Salesforce and email delivery are intentionally disconnected at this stage.</p></div>
      <span className="banner-chip">PHASE 2</span>
    </section>

    <section className="metrics-grid">
      <MetricCard title="Total contacts" value={formatNumber(stats.totalContacts)} detail={`${formatNumber(stats.marketableContacts)} marketable contacts`} icon={<Users size={18}/>} tone="blue" trend="Demo records"/>
      <MetricCard title="Active campaigns" value={formatNumber(stats.activeCampaigns)} detail={`${formatNumber(stats.sentCampaigns)} campaigns sent`} icon={<Megaphone size={18}/>} tone="violet" trend="Current status"/>
      <MetricCard title="Emails delivered" value={formatNumber(stats.deliveredEmails)} detail="Across seeded campaigns" icon={<Mail size={18}/>} tone="green" trend="Sample metrics"/>
      <MetricCard title="Open rate" value={`${stats.openRate}%`} detail={`${stats.clickRate}% click rate`} icon={<Activity size={18}/>} tone="amber" trend="Sample metrics"/>
    </section>

    <section className="dashboard-grid">
      <div className="content-card campaigns-card">
        <div className="card-heading"><div><h2>Recent campaigns</h2><p>Track activity across your email campaigns</p></div><span className="card-count">{data.campaigns.length} records</span></div>
        <CampaignTable campaigns={data.campaigns.slice(0, 5)} compact/>
      </div>
      <div className="content-card contacts-card">
        <div className="card-heading"><div><h2>Recently added contacts</h2><p>Your latest demo CRM records</p></div><span className="card-count">{data.contacts.length} records</span></div>
        <div className="recent-contact-list">
          {data.contacts.slice(0, 5).map(contact => <div className="recent-contact" key={contact.id}>
            <div className="contact-avatar">{initials(contact.first_name + " " + contact.last_name)}</div>
            <div className="recent-contact-info"><strong>{contact.first_name} {contact.last_name}</strong><span>{contact.company ?? "No company"}</span></div>
            <span className={contact.marketing_consent ? "consent-dot subscribed" : "consent-dot unsubscribed"} title={contact.marketing_consent ? "Marketing consent recorded" : "No marketing consent"}/>
          </div>)}
        </div>
      </div>
    </section>

    <section className="bottom-grid">
      <div className="content-card summary-card">
        <div className="card-heading"><div><h2>Email studio</h2><p>Reusable message templates</p></div><span className="template-count"><FileText size={14}/>{stats.templateCount} templates</span></div>
        <div className="template-mini-grid">
          {data.templates.slice(0, 3).map(template => <div className="template-mini" key={template.id}><div className="template-mini-icon"><Mail size={16}/></div><div><strong>{template.name}</strong><span>{template.category}</span></div></div>)}
        </div>
      </div>
      <div className="content-card readiness-card">
        <div className="card-heading"><div><h2>Workspace setup</h2><p>Standalone application checklist</p></div><span className="card-count">2 / 4 ready</span></div>
        <div className="readiness-item"><CheckCircle2 size={16}/><span>Local authentication enabled</span><b>Ready</b></div>
        <div className="readiness-item"><CheckCircle2 size={16}/><span>PostgreSQL and demo data loaded</span><b>Ready</b></div>
        <div className="readiness-item future"><CalendarDays size={16}/><span>Campaign editing and audience builder</span><b>Next phase</b></div>
        <div className="readiness-item future"><Mail size={16}/><span>AWS SES email delivery</span><b>Later phase</b></div>
      </div>
    </section>
  </>;
}

function MetricCard({ title, value, detail, icon, tone, trend }: { title: string; value: string; detail: string; icon: React.ReactNode; tone: string; trend: string }) {
  return <div className="metric-card"><div className="metric-card-top"><span>{title}</span><span className={`metric-icon tone-${tone}`}>{icon}</span></div><strong>{value}</strong><div className="metric-card-bottom"><span>{detail}</span><small>{trend}</small></div></div>;
}

function CampaignTable({ campaigns, compact = false }: { campaigns: Campaign[]; compact?: boolean }) {
  return <div className="table-wrap"><table className={compact ? "data-table compact-table" : "data-table"}>
    <thead><tr><th>Campaign</th><th>Status</th><th>Recipients</th><th>Delivered</th><th>{compact ? "Date" : "Subject"}</th></tr></thead>
    <tbody>{campaigns.map(campaign => <tr key={campaign.id}>
      <td><div className="table-primary">{campaign.name}</div>{!compact && <div className="table-secondary">{campaign.subject_line ?? "No subject yet"}</div>}</td>
      <td><span className={statusClass(campaign.status)}>{campaign.status}</span></td>
      <td>{formatNumber(campaign.total_recipients)}</td>
      <td>{formatNumber(campaign.delivered_count)}</td>
      <td>{compact ? formatDate(campaign.sent_at ?? campaign.scheduled_at) : (campaign.subject_line ?? "—")}</td>
    </tr>)}</tbody>
  </table></div>;
}

function ContactsPage({ contacts }: { contacts: Contact[] }) {
  const [search, setSearch] = useState("");
  const filtered = contacts.filter(contact =>
    [contact.first_name, contact.last_name, contact.email, contact.company ?? "", contact.city ?? ""].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  return <>
    <PageHeader eyebrow="AUDIENCE DATA" title="Contacts & Leads" description="Sample records stored in your standalone workspace."/>
    <div className="content-card list-page-card">
      <div className="list-toolbar"><div><h2>All demo contacts</h2><p>{filtered.length} records in this preview</p></div><div className="search-box"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts"/></div></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Location</th><th>Type</th><th>Consent</th></tr></thead><tbody>
        {filtered.map(contact => <tr key={contact.id}><td><div className="table-primary">{contact.first_name} {contact.last_name}</div><div className="table-secondary">{contact.lifecycle_status}</div></td><td>{contact.email}</td><td>{contact.company ?? "—"}</td><td>{[contact.city,contact.country].filter(Boolean).join(", ")}</td><td><span className="type-pill">{contact.record_type}</span></td><td><span className={contact.marketing_consent ? "consent-label yes" : "consent-label no"}>{contact.marketing_consent ? "Consent recorded" : "Not marketable"}</span></td></tr>)}
      </tbody></table></div>
      <div className="table-footnote">Demo contacts use reserved example.com addresses. No real emails are contacted.</div>
    </div>
  </>;
}

function CampaignsPage({ campaigns }: { campaigns: Campaign[] }) {
  return <>
    <PageHeader eyebrow="MARKETING OPERATIONS" title="Campaigns" description="Review the sample campaigns and their demonstration performance."/>
    <div className="content-card list-page-card">
      <div className="list-toolbar"><div><h2>Campaign library</h2><p>{campaigns.length} demo campaigns</p></div><span className="demo-badge"><span/> Read-only demo records</span></div>
      <CampaignTable campaigns={campaigns}/>
      <div className="table-footnote">Create, edit, schedule and manage campaign members will be enabled in the campaign-management phase.</div>
    </div>
  </>;
}

function TemplatesPage({ templates }: { templates: Template[] }) {
  return <>
    <PageHeader eyebrow="CONTENT WORKSPACE" title="Email Studio" description="Browse the reusable email templates included with the demo workspace."/>
    <div className="template-grid">
      {templates.map((template,index) => <article className="template-card" key={template.id}>
        <div className={`template-art template-art-${index % 4}`}><div className="template-art-top"><span>CAMPAIGNHUB</span><Mail size={17}/></div><div className="template-art-lines"><i/><i/><i/></div><div className="template-art-button"/></div>
        <div className="template-card-body"><span className="template-category">{template.category}</span><h3>{template.name}</h3><p>{template.preview_text}</p><div className="template-subject">Subject: {template.subject_line}</div><span className="template-status"><CheckCircle2 size={14}/> Demo template</span></div>
      </article>)}
    </div>
  </>;
}

function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="page-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></section>;
}
function ComingSoonPage({ page }: { page: string }) {
  const description: Record<string,string> = {
    "Audiences": "Build reusable segments using contact attributes, consent and campaign activity.",
    "Automation": "Design automated journeys and schedule customer communication workflows.",
    "Analytics": "Explore campaign performance, engagement trends and delivery reporting.",
    "Settings": "Manage workspace configuration, user access and account preferences.",
    "Help & support": "Find setup notes and guidance for your marketing workspace."
  };
  return <div className="coming-soon-card"><div className="coming-icon"><Sparkles size={24}/></div><span className="eyebrow">ON THE ROADMAP</span><h1>{page}</h1><p>{description[page] ?? "This workspace module will be enabled in a later development phase."}</p><span className="coming-label">Planned for a later phase</span></div>;
}
