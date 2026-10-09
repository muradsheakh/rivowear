import nodemailer from "nodemailer";
import { config } from "../config.js";
import type { SendResult } from "./sms.js";

const transporter = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

export const sendEmail = async (to: string, subject: string, html: string): Promise<SendResult> => {
  if (!transporter) {
    console.log(`[email:console] to ${to}: ${subject}`);
    return { ok: true, detail: "console (no SMTP configured)" };
  }
  try {
    await transporter.sendMail({ from: config.smtp.from, to, subject, html });
    return { ok: true, detail: "sent" };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "Email failed" };
  }
};

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
