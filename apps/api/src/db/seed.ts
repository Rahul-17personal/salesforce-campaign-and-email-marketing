import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { pool } from "./pool.js";

type DemoUser = { id: string; fullName: string; email: string; password: string; role: "admin" | "marketer" | "viewer" };

async function seed(): Promise<void> {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Demo seeding is only permitted when NODE_ENV=development.");
  }

  const users: DemoUser[] = [
    { id: randomUUID(), fullName: "CampaignHub Administrator", email: "admin@campaignhub.local", password: process.env.DEMO_ADMIN_PASSWORD || "CampaignHub!2026", role: "admin" },
    { id: randomUUID(), fullName: "Marketing Manager", email: "marketing@campaignhub.local", password: process.env.DEMO_MARKETER_PASSWORD || "Marketing!2026", role: "marketer" },
    { id: randomUUID(), fullName: "Campaign Viewer", email: "viewer@campaignhub.local", password: process.env.DEMO_VIEWER_PASSWORD || "Viewer!2026", role: "viewer" }
  ];

  const ids = new Map<string, string>();
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    const result = await pool.query<{ id: string }>(
      `INSERT INTO app_users (id, full_name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         status = 'active',
         updated_at = NOW()
       RETURNING id`,
      [user.id, user.fullName, user.email, passwordHash, user.role]
    );
    ids.set(user.email, result.rows[0]!.id);
  }

  const adminId = ids.get("admin@campaignhub.local")!;
  const contacts = [
    ["contact","Aarav","Mehta","aarav.mehta@example.com","Northstar Systems","IT Director","Gurugram","Haryana","India",true,"customer"],
    ["contact","Priya","Sharma","priya.sharma@example.com","BluePeak Technologies","Marketing Lead","Noida","Uttar Pradesh","India",true,"customer"],
    ["lead","Rohan","Kapoor","rohan.kapoor@example.com","Vertex Digital","VP Operations","Bengaluru","Karnataka","India",true,"prospect"],
    ["contact","Ananya","Iyer","ananya.iyer@example.com","Cedar Labs","Product Manager","Pune","Maharashtra","India",true,"customer"],
    ["lead","Kabir","Malhotra","kabir.malhotra@example.com","Summit Retail","Founder","Delhi","Delhi","India",false,"prospect"],
    ["contact","Ishita","Rao","ishita.rao@example.com","BrightPath Consulting","Customer Success","Hyderabad","Telangana","India",true,"customer"],
    ["contact","Dev","Nair","dev.nair@example.com","Orbit Cloud","Cloud Architect","Chennai","Tamil Nadu","India",true,"active"],
    ["lead","Meera","Joshi","meera.joshi@example.com","Greenfield Foods","E-commerce Head","Mumbai","Maharashtra","India",true,"prospect"],
    ["contact","Arjun","Verma","arjun.verma@example.com","Pioneer Finance","IT Manager","Jaipur","Rajasthan","India",false,"inactive"],
    ["contact","Sana","Khan","sana.khan@example.com","Nova Healthcare","Operations Head","Lucknow","Uttar Pradesh","India",true,"customer"],
    ["lead","Vihaan","Patel","vihaan.patel@example.com","Cloudline Services","CTO","Ahmedabad","Gujarat","India",true,"prospect"],
    ["contact","Tara","Sen","tara.sen@example.com","Maple Education","Communications Lead","Kolkata","West Bengal","India",true,"active"],
    ["contact","Neil","D'Souza","neil.dsouza@example.com","Crest Manufacturing","Sales Director","Mumbai","Maharashtra","India",false,"inactive"],
    ["lead","Aditi","Bansal","aditi.bansal@example.com","UrbanCart","Growth Manager","Gurugram","Haryana","India",true,"prospect"],
    ["contact","Reyansh","Gupta","reyansh.gupta@example.com","Silverline Media","Digital Lead","Noida","Uttar Pradesh","India",true,"customer"]
  ] as const;

  for (const row of contacts) {
    const [recordType, firstName, lastName, email, company, jobTitle, city, state, country, consent, lifecycle] = row;
    await pool.query(
      `INSERT INTO contacts
       (id, record_type, first_name, last_name, email, company, job_title, city, state, country,
        marketing_consent, lifecycle_status, source, owner_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'demo-seed',$13)
       ON CONFLICT (email) DO NOTHING`,
      [randomUUID(), recordType, firstName, lastName, email, company, jobTitle, city, state, country, consent, lifecycle, adminId]
    );
  }

  const campaigns = [
    { name:"November Product Update", description:"Monthly product news and feature highlights.", status:"sent", subject:"What's new at CampaignHub this month?", total:2450, delivered:2400, bounced:50, opens:1200, clicks:350, unsubs:12, sent:"2026-11-10T09:00:00Z" },
    { name:"Customer Onboarding Series", description:"A welcome and onboarding sequence for new customers.", status:"sending", subject:"Welcome aboard — here's how to get started", total:860, delivered:812, bounced:18, opens:406, clicks:128, unsubs:2, sent:null },
    { name:"November Webinar Invitation", description:"Invitation to the November customer webinar.", status:"scheduled", subject:"You're invited: November customer webinar", total:1320, delivered:0, bounced:0, opens:0, clicks:0, unsubs:0, sent:null },
    { name:"Q4 Customer Newsletter", description:"Quarterly updates, customer stories and announcements.", status:"sent", subject:"Your Q4 customer newsletter is here", total:1980, delivered:1942, bounced:38, opens:941, clicks:276, unsubs:8, sent:"2026-10-29T10:30:00Z" },
    { name:"Winter Offers Preview", description:"Early look at seasonal promotions.", status:"draft", subject:"A first look at our winter collection", total:0, delivered:0, bounced:0, opens:0, clicks:0, unsubs:0, sent:null }
  ] as const;

  for (const campaign of campaigns) {
    await pool.query(
      `INSERT INTO campaigns
       (id,name,description,status,subject_line,from_name,from_email,total_recipients,delivered_count,bounced_count,open_count,click_count,unsubscribe_count,created_by_user_id,sent_at,scheduled_at)
       VALUES ($1,$2,$3,$4,$5,'CampaignHub Demo','hello@example.com',$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (name) DO UPDATE SET
         description=EXCLUDED.description,status=EXCLUDED.status,subject_line=EXCLUDED.subject_line,
         total_recipients=EXCLUDED.total_recipients,delivered_count=EXCLUDED.delivered_count,
         bounced_count=EXCLUDED.bounced_count,open_count=EXCLUDED.open_count,
         click_count=EXCLUDED.click_count,unsubscribe_count=EXCLUDED.unsubscribe_count,
         sent_at=EXCLUDED.sent_at,scheduled_at=EXCLUDED.scheduled_at,updated_at=NOW()`,
      [randomUUID(),campaign.name,campaign.description,campaign.status,campaign.subject,campaign.total,campaign.delivered,campaign.bounced,campaign.opens,campaign.clicks,campaign.unsubs,adminId,campaign.sent,campaign.status==="scheduled"?"2026-11-20T10:00:00Z":null]
    );
  }

  const templates = [
    { name:"Product Announcement", category:"Product update", subject:"Introducing {{product_name}}", preview:"Discover what's new this month.", html:"<h1>Hello {{first_name}},</h1><p>We are excited to introduce <strong>{{product_name}}</strong>.</p><p>Explore the update and let us know what you think.</p><p><a href=\"{{cta_url}}\">Explore the update</a></p>" },
    { name:"Monthly Newsletter", category:"Newsletter", subject:"Your monthly update from {{company_name}}", preview:"News, insights and updates in one place.", html:"<h1>Hi {{first_name}},</h1><p>Here is your monthly round-up of news and insights.</p><h2>In this issue</h2><ul><li>Product news</li><li>Customer stories</li><li>Upcoming events</li></ul>" },
    { name:"Webinar Invitation", category:"Event invitation", subject:"You are invited: {{event_name}}", preview:"Save your seat for our upcoming session.", html:"<h1>Save your seat, {{first_name}}</h1><p>Join us for {{event_name}} on {{event_date}}.</p><p><a href=\"{{registration_url}}\">Register now</a></p>" },
    { name:"Welcome Email", category:"Onboarding", subject:"Welcome to {{company_name}}, {{first_name}}", preview:"A few helpful steps to get started.", html:"<h1>Welcome, {{first_name}}!</h1><p>We are delighted to have you with us.</p><p>Here are three steps to get started:</p><ol><li>Set up your profile</li><li>Explore the workspace</li><li>Contact your account team</li></ol>" }
  ] as const;

  for (const template of templates) {
    await pool.query(
      `INSERT INTO email_templates (id,name,category,subject_line,preview_text,html_body,created_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (name) DO UPDATE SET category=EXCLUDED.category,subject_line=EXCLUDED.subject_line,
       preview_text=EXCLUDED.preview_text,html_body=EXCLUDED.html_body,updated_at=NOW()`,
      [randomUUID(),template.name,template.category,template.subject,template.preview,template.html,adminId]
    );
  }

  console.log("Demo data seeded successfully.");
  console.log("Demo accounts (development only):");
  console.log("Admin:     admin@campaignhub.local / " + users[0]!.password);
  console.log("Marketer:  marketing@campaignhub.local / " + users[1]!.password);
  console.log("Viewer:    viewer@campaignhub.local / " + users[2]!.password);
}

seed().catch((error: unknown) => {
  console.error("Demo seed failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
}).finally(async () => {
  await pool.end();
});
