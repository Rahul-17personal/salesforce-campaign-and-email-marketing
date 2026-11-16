import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../auth/requireAuth.js";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (_req, res, next) => {
  try {
    const [statsResult, campaignsResult, contactsResult, templatesResult] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM contacts)::int AS total_contacts,
          (SELECT COUNT(*) FROM contacts WHERE marketing_consent = TRUE AND unsubscribed_at IS NULL)::int AS marketable_contacts,
          (SELECT COUNT(*) FROM campaigns WHERE status IN ('scheduled','sending'))::int AS active_campaigns,
          (SELECT COUNT(*) FROM campaigns WHERE status = 'sent')::int AS sent_campaigns,
          COALESCE((SELECT SUM(delivered_count) FROM campaigns),0)::int AS delivered_emails,
          COALESCE((SELECT SUM(open_count) FROM campaigns),0)::int AS total_opens,
          COALESCE((SELECT SUM(click_count) FROM campaigns),0)::int AS total_clicks,
          (SELECT COUNT(*) FROM email_templates)::int AS template_count
      `),
      pool.query(`
        SELECT id, name, status, subject_line, total_recipients, delivered_count,
               bounced_count, open_count, click_count, scheduled_at, sent_at
        FROM campaigns ORDER BY COALESCE(sent_at, scheduled_at, created_at) DESC LIMIT 8
      `),
      pool.query(`
        SELECT id, record_type, first_name, last_name, email, company, city, country,
               lifecycle_status, marketing_consent, created_at
        FROM contacts ORDER BY created_at DESC LIMIT 100
      `),
      pool.query(`
        SELECT id, name, category, subject_line, preview_text, created_at
        FROM email_templates ORDER BY updated_at DESC LIMIT 8
      `)
    ]);

    const statsRow = statsResult.rows[0] as Record<string, number>;
    const delivered = Number(statsRow.delivered_emails);
    res.setHeader("Cache-Control", "no-store");
    res.json({
      stats: {
        totalContacts: Number(statsRow.total_contacts),
        marketableContacts: Number(statsRow.marketable_contacts),
        activeCampaigns: Number(statsRow.active_campaigns),
        sentCampaigns: Number(statsRow.sent_campaigns),
        deliveredEmails: delivered,
        openRate: delivered > 0 ? Number(((Number(statsRow.total_opens) / delivered) * 100).toFixed(1)) : 0,
        clickRate: delivered > 0 ? Number(((Number(statsRow.total_clicks) / delivered) * 100).toFixed(1)) : 0,
        templateCount: Number(statsRow.template_count)
      },
      campaigns: campaignsResult.rows,
      contacts: contactsResult.rows,
      templates: templatesResult.rows
    });
  } catch (error) { next(error); }
});

export default router;
