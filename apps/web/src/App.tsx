import {useEffect,useState} from "react";
import {Activity,BarChart3,Bell,ChevronDown,CircleHelp,Contact,LayoutDashboard,Mail,Megaphone,Settings,ShieldCheck,Users,Workflow,Zap} from "lucide-react";

type Health={status:string;service:string;environment:string};
const nav=[{label:"Overview",icon:LayoutDashboard},{label:"Contacts & Leads",icon:Contact},{label:"Audiences",icon:Users},{label:"Campaigns",icon:Megaphone},{label:"Email Studio",icon:Mail},{label:"Automation",icon:Workflow},{label:"Analytics",icon:BarChart3}];

export default function App(){
 const [health,setHealth]=useState<Health|null>(null);
 const [active,setActive]=useState("Overview");
 useEffect(()=>{fetch("/api/health").then(async r=>{if(r.ok)setHealth(await r.json() as Health)}).catch(()=>setHealth(null))},[]);
 return <div className="shell">
  <aside className="sidebar">
   <div className="brand"><div className="brand-mark"><Zap size={19}/></div><div><strong>CampaignHub</strong><span>SALESFORCE MARKETING</span></div></div>
   <div className="workspace-label">WORKSPACE</div>
   <nav>{nav.map(({label,icon:Icon})=><button key={label} className={active===label?"nav-item selected":"nav-item"} onClick={()=>setActive(label)}><Icon size={18}/><span>{label}</span>{active===label&&<i className="nav-dot"/>}</button>)}</nav>
   <div className="sidebar-bottom">
    <button className="nav-item" onClick={()=>setActive("Settings")}><Settings size={18}/><span>Settings</span></button>
    <button className="nav-item" onClick={()=>setActive("Help & support")}><CircleHelp size={18}/><span>Help & support</span></button>
    <div className="user-card"><div className="avatar">M</div><div><strong>Marketing Team</strong><span>Salesforce not connected</span></div><ChevronDown size={15}/></div>
   </div>
  </aside>
  <main className="main">
   <header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> {active}</div><div className="top-actions"><span className={health?"api-status online":"api-status"}><i/>{health?"API connected":"API not connected"}</span><button className="icon-button" aria-label="Notifications"><Bell size={18}/></button><div className="avatar small">M</div></div></header>
   <div className="content">
    <section className="welcome"><div><div className="eyebrow">MARKETING WORKSPACE</div><h1>Good afternoon 👋</h1><p>Here's what's happening with your marketing workspace.</p></div><button className="connect-button" disabled><ShieldCheck size={17}/>Connect Salesforce<span className="soon">NEXT PHASE</span></button></section>
    <section className="notice"><div className="notice-icon"><ShieldCheck size={19}/></div><div><strong>Secure foundation is ready</strong><p>This is the initial application shell. Salesforce and email delivery will be enabled after OAuth, permissions, consent and sending safeguards are configured.</p></div></section>
    <section className="metrics">
     <Metric title="Active campaigns" note="Connect Salesforce to load data" icon={<Megaphone/>}/>
     <Metric title="Contacts available" note="Live CRM data not connected" icon={<Users/>}/>
     <Metric title="Emails delivered" note="SES integration not configured" icon={<Mail/>}/>
     <Metric title="Engagement rate" note="Analytics not configured" icon={<Activity/>}/>
    </section>
    <section className="panel-grid">
     <div className="panel"><div className="panel-heading"><div><h2>Campaign performance</h2><p>Monitor the results of your email campaigns</p></div><button className="select-button">Last 30 days <ChevronDown size={14}/></button></div><div className="empty-chart"><div className="chart-icon"><BarChart3 size={27}/></div><strong>Your campaign insights will appear here</strong><span>Connect Salesforce and configure SES to start tracking performance.</span></div></div>
     <div className="panel activity-panel"><div className="panel-heading"><div><h2>Getting started</h2><p>Your setup checklist</p></div></div>
      <Check n="01" title="Connect Salesforce" detail="Authorize access using your Salesforce account"/>
      <Check n="02" title="Configure Amazon SES" detail="Verify your sending domain and request production access"/>
      <Check n="03" title="Set up campaign approvals" detail="Define who can review and authorize sends"/>
      <Check n="04" title="Build your first audience" detail="Use Salesforce contacts and leads" locked/>
     </div>
    </section>
    <footer><span>CampaignHub <b>•</b> Phase 1 foundation</span><span>Designed with security and governance first</span></footer>
   </div>
  </main>
 </div>
}
function Metric({title,note,icon}:{title:string;note:string;icon:React.ReactNode}){return <div className="metric-card"><div className="metric-top"><span>{title}</span><div className="metric-icon">{icon}</div></div><strong>—</strong><small>{note}</small></div>}
function Check({n,title,detail,locked=false}:{n:string;title:string;detail:string;locked?:boolean}){return <div className="check-row"><span className="check-number">{n}</span><div><strong>{title}</strong><small>{detail}</small></div><span className={locked?"tag locked":"tag pending"}>{locked?"Locked":"Pending"}</span></div>}
