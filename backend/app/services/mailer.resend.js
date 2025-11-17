// backend/app/services/mailer.resend.js
const { Resend } = require("resend");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM_EMAIL = process.env.MAIL_FROM_EMAIL || "onboarding@resend.dev";

let client = null;
function getClient() {
  if (!client) client = new Resend(RESEND_API_KEY);
  return client;
}

async function sendMailResend({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    console.error("[RESEND] RESEND_API_KEY not set, skipping email.");
    return { ok: false, err: new Error("RESEND_API_KEY not set") };
  }
  try {
    const r = await getClient().emails.send({
      from: MAIL_FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });
    console.log("[RESEND MAIL OK]", r?.id);
    return { ok: true };
  } catch (err) {
    console.error("[RESEND MAIL ERR]", err?.message || err);
    return { ok: false, err };
  }
}

module.exports = { sendMailResend };
