// backend/app/services/mailer.brevo.js
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");

const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications["api-key"].apiKey =
  process.env.BREVO_API_KEY?.trim();

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendMailBrevo({ to, subject, html, text }) {
  const senderName = process.env.BREVO_SENDER_NAME?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();

  if (!senderName || !senderEmail) {
    console.error("❌ Sender missing in .env");
    return { ok: false, err: "Sender missing" };
  }

  if (!to || !subject || (!html && !text)) {
    console.error("❌ Missing required fields", { to, subject, html, text });
    return { ok: false, err: "Missing required fields" };
  }

  // Plain object payload
  const sendSmtpEmail = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to }],
    subject: subject.trim(),
    htmlContent: html,
    textContent: text,
  };

  console.log("📨 Payload to Brevo:", sendSmtpEmail);

  try {
    const response = await tranEmailApi.sendTransacEmail(sendSmtpEmail);
    console.log("[BREVO MAIL OK] messageId:", response?.messageId);
    return { ok: true, response };
  } catch (err) {
    console.error(
      "[BREVO MAIL ERR]",
      err?.response?.body || err?.message || err,
    );
    return { ok: false, err };
  }
}

module.exports = { sendMailBrevo };
