// backend/app/services/mail.service.js
const { sendMailSMTP } = require("./mailer.smtp");
const { sendMailResend } = require("./mailer.resend");

const MAIL_PROVIDER = (process.env.MAIL_PROVIDER || "smtp").toLowerCase();
const { sendMailBrevo } = require("./mailer.brevo");

const BRAND_NAME = process.env.BRAND_NAME || "Student Portal";
const BRAND_SCHOOL = process.env.BRAND_SCHOOL || "Demo School";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@example.com";
const FRONTEND_BASE_URL =
  process.env.FRONTEND_BASE_URL || "http://localhost:5173";

function wrapHtml({ title, bodyHtml }) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto;background:#f7f8fa;padding:24px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <tr>
        <td style="background:#4F46E5;padding:16px 20px;color:#fff;">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:32px;height:32px;border-radius:6px;background:#ffffff;color:#4F46E5;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:16px;">SP</div>
            <div style="font-weight:700">${BRAND_NAME} • ${BRAND_SCHOOL}</div>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px">
          <h2 style="margin:0 0 12px 0;font-size:18px;color:#111827">${title}</h2>
          ${bodyHtml}
          <p style="margin-top:20px;color:#6b7280;font-size:12px">
            Need help? Contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#f9fafb;padding:14px 20px;color:#6b7280;font-size:12px">
          © ${new Date().getFullYear()} ${BRAND_SCHOOL}. All rights reserved.
        </td>
      </tr>
    </table>
  </div>`;
}

function sendMail({ to, subject, html, text }) {
  console.log("[MAIL PROVIDER]", MAIL_PROVIDER);

  if (MAIL_PROVIDER === "brevo") {
    return sendMailBrevo({ to, subject, html, text });
  }

  if (MAIL_PROVIDER === "resend") {
    return sendMailResend({ to, subject, html, text });
  }

  return sendMailSMTP({ to, subject, html, text });
}
// ---------- helpers for controllers ----------

function invitePayload(to, tempPassword) {
  return {
    to,
    tempPassword,
    dashboardUrl: `${FRONTEND_BASE_URL}/auth`,
  };
}

// Teacher invite
async function sendTeacherInvite({ to, tempPassword, dashboardUrl }) {
  const title = "Your Teacher Account";
  const bodyHtml = `
    <p>Hi,</p>
    <p>You’ve been added as a teacher in ${BRAND_SCHOOL}. Use the credentials below to sign in. You’ll be asked to change your password on first login.</p>
    <p style="padding:12px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px">
      <b>Email:</b> ${to}<br/>
      <b>Temporary password:</b> ${tempPassword}
    </p>
    <p style="margin:18px 0">
      <a href="${dashboardUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">
        Open your dashboard
      </a>
    </p>`;

  const html = wrapHtml({ title, bodyHtml });
  const text = `Welcome to ${BRAND_NAME} for ${BRAND_SCHOOL}
Email: ${to}
Temporary password: ${tempPassword}
Dashboard: ${dashboardUrl}`;

  return sendMail({ to, subject: "Your Teacher Account", html, text });
}

// Form teacher assignment notification
async function sendFormTeacherNotification({ to, className }) {
  const title = "You Have Been Assigned as Form Teacher";
  const dashboardUrl = `${FRONTEND_BASE_URL}/auth`;

  const bodyHtml = `
    <p>Hi,</p>
    <p>You have been assigned as <b>Form Teacher</b> for <b>${className}</b> at ${BRAND_SCHOOL}.</p>
    <p>You can now access the Form Teacher section in the system, where you will:</p>
    <ul>
      <li>Configure grade schemes for your class</li>
      <li>View overall results and rankings</li>
      <li>Monitor class performance and pass rate</li>
    </ul>
    <p style="margin:18px 0">
      <a href="${dashboardUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">
        Open Form Teacher Portal
      </a>
    </p>`;

  const html = wrapHtml({ title, bodyHtml });
  const text = `You have been assigned as form teacher for ${className} at ${BRAND_SCHOOL}.
Login: ${dashboardUrl}`;

  return sendMail({ to, subject: "Form Teacher Assignment", html, text });
}

// Exam results to guardian
async function sendExamResultsEmail({
  to,
  studentName,
  className,
  totalPoints,
  totalMarks,
  passed,
  subjects,
}) {
  const title = `Exam Results for ${studentName}`;

  const rows =
    (subjects || [])
      .map(
        (s) =>
          `<tr><td>${s.subjectName || ""}</td><td>${s.total}</td><td>${
            s.grade
          }</td><td>${s.points}</td></tr>`,
      )
      .join("") ||
    `<tr><td colspan="4" style="border:1px solid #e5e7eb;padding:6px 8px;font-size:12px">No subject breakdown available.</td></tr>`;

  const bodyHtml = `
    <p>Dear Parent/Guardian,</p>
    <p>Here is the exam summary for <b>${studentName}</b> in <b>${className}</b> at ${BRAND_SCHOOL}.</p>
    <p><b>Total Points:</b> ${totalPoints} &nbsp; • &nbsp; <b>Total Marks:</b> ${totalMarks} &nbsp; • &nbsp; <b>Result:</b> ${
      passed ? "Pass" : "Fail"
    }</p>
    <table style="border-collapse:collapse;width:100%;margin-top:12px">
      <thead>
        <tr>
          <th style="border:1px solid #e5e7eb;padding:6px 8px;background:#f3f4f6;text-align:left;font-size:12px">Subject</th>
          <th style="border:1px solid #e5e7eb;padding:6px 8px;background:#f3f4f6;text-align:left;font-size:12px">Total</th>
          <th style="border:1px solid #e5e7eb;padding:6px 8px;background:#f3f4f6;text-align:left;font-size:12px">Grade</th>
          <th style="border:1px solid #e5e7eb;padding:6px 8px;background:#f3f4f6;text-align:left;font-size:12px">Points</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  const html = wrapHtml({ title, bodyHtml });
  const text = `Exam summary for ${studentName} (${className})
Total Points: ${totalPoints}
Total Marks: ${totalMarks}
Result: ${passed ? "Pass" : "Fail"}`;

  return sendMail({
    to,
    subject: `Exam Results for ${studentName}`,
    html,
    text,
  });
}

// Payment receipt to guardian
async function sendPaymentReceiptEmail({
  to,
  studentName,
  amount,
  invoiceId,
  schoolName,
}) {
  const title = `Payment Receipt — ${studentName}`;
  const bodyHtml = `
    <p>Dear Parent/Guardian,</p>
    <p>A payment of <b>MWK ${Number(amount).toLocaleString()}</b> has been
    recorded for <b>${studentName}</b> at ${schoolName || BRAND_SCHOOL}.</p>
    <p style="padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">
      <b>Amount Paid:</b> MWK ${Number(amount).toLocaleString()}<br/>
      <b>Invoice Ref:</b> ${invoiceId?.slice(0, 8) || "N/A"}<br/>
      <b>School:</b> ${schoolName || BRAND_SCHOOL}
    </p>
    <p>Thank you for your payment. Please keep this as your receipt.</p>`;

  const html = wrapHtml({ title, bodyHtml });
  const text = `Payment of MWK ${Number(amount).toLocaleString()} received for ${studentName} at ${schoolName}.`;

  return sendMail({
    to,
    subject: `Payment Receipt — ${studentName}`,
    html,
    text,
  });
}

module.exports = {
  // low-level
  sendMail,
  // high-level
  sendTeacherInvite,
  invitePayload,
  sendFormTeacherNotification,
  sendExamResultsEmail,
  sendPaymentReceiptEmail,
};
