// backend/app/services/mailer.smtp.js
const nodemailer = require("nodemailer");

const {
  SMTP_HOST = "smtp.example.com",
  SMTP_PORT = "587",
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const port = Number(SMTP_PORT) || 587;
  const secure = port === 465;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST.replace(/"/g, "").trim(),
    port,
    secure,
    auth: {
      user: SMTP_USER && SMTP_USER.replace(/"/g, "").trim(),
      pass: SMTP_PASS && SMTP_PASS.replace(/"/g, "").trim(),
    },
  });

  return transporter;
}

const from =
  (SMTP_FROM && SMTP_FROM.replace(/"/g, "").trim()) ||
  `Student Portal <${SMTP_USER}>`;

async function sendMailSMTP({ to, subject, html, text }) {
  try {
    const t = getTransporter();
    const info = await t.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });
    console.log("[SMTP MAIL OK]", info && info.messageId);
    return { ok: true };
  } catch (err) {
    console.error("[SMTP MAIL ERR]", err?.message || err);
    return { ok: false, err };
  }
}

module.exports = { sendMailSMTP, from };
