// src/utils/mailer.js
import nodemailer from "nodemailer";

const {
  SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS,
  MAIL_FROM_NAME, MAIL_FROM_EMAIL, APP_LOGIN_URL
} = process.env;

function mailEnabled() {
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && MAIL_FROM_EMAIL);
}

function getTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: String(SMTP_SECURE || "false") === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendApprovalEmail(to, name, role) {
  if (!mailEnabled()) return { sent: false, reason: "SMTP not configured" };

  const transporter = getTransporter();
  const from = `"${MAIL_FROM_NAME || "FoodNest"}" <${MAIL_FROM_EMAIL}>`;

  const loginLine = APP_LOGIN_URL
    ? `You can now login here: ${APP_LOGIN_URL}`
    : `Open the FoodNest app and log in with the same email and password.`;

  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6">
      <h2>You're approved, ${name}!</h2>
      <p>Your FoodNest account request has been <b>approved</b> for the role: <b>${role}</b>.</p>
      <p>${loginLine}</p>
      <p style="color:#555">If you didn’t request this, please ignore this email.</p>
      <hr />
      <p style="font-size:12px;color:#999">— The FoodNest Team</p>
    </div>
  `;

  const text = `You're approved, ${name}!
Your FoodNest account request has been approved for role: ${role}.
${loginLine}
— The FoodNest Team`;

  await transporter.sendMail({
    from, to, subject: "Your FoodNest account is approved 🎉", text, html,
  });

  return { sent: true };
}

// (Optional) use if you also want to notify on decline:
export async function sendDeclinedEmail(to, name) {
  if (!mailEnabled()) return { sent: false, reason: "SMTP not configured" };
  const transporter = getTransporter();
  const from = `"${MAIL_FROM_NAME || "FoodNest"}" <${MAIL_FROM_EMAIL}>`;

  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6">
      <h2>Hello ${name},</h2>
      <p>We’re sorry—your FoodNest account request was not approved.</p>
      <p>You may contact your SuperAdmin for more details.</p>
      <hr />
      <p style="font-size:12px;color:#999">— The FoodNest Team</p>
    </div>
  `;

  await transporter.sendMail({
    from, to, subject: "FoodNest request status", html,
  });

  return { sent: true };
}
