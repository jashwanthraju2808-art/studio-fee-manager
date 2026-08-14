/**
 * Shared WhatsApp utility — Antar Yoga
 *
 * Uses wa.me Click-to-Chat (Option 3).
 * Application opens WhatsApp with a pre-filled message.
 * The user reviews and manually presses Send.
 *
 * IMPORTANT: We never report "sent" — only "opened".
 * Desktop: opens WhatsApp Web. Mobile: opens the WhatsApp app.
 */

const STUDIO = "Antar Yoga";

/* ── Phone normalisation ──────────────────────────────────
 * Handles:
 *   9876543210          → 919876543210
 *   +91 9876543210      → 919876543210
 *   91 9876543210       → 919876543210
 *   98765 43210         → 919876543210
 *   +91-98765-43210     → 919876543210
 *   (098) 765 43210     → 919876543210
 * ─────────────────────────────────────────────────────────*/
export function normalizePhone(raw) {
  if (!raw) return null;
  // Strip everything except digits
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  // Remove leading 0 (Indian local format)
  if (digits.startsWith("0")) digits = digits.slice(1);

  // If 10 digits → add India country code
  if (digits.length === 10) digits = "91" + digits;

  // If starts with 91 and is 12 digits → already correct
  if (digits.length === 12 && digits.startsWith("91")) return digits;

  // If longer (e.g. user typed full +country code for another country) return as-is
  if (digits.length >= 10) return digits;

  return null; // too short to be valid
}

/* ── URL builder ──────────────────────────────────────────*/
export function buildWhatsAppUrl(phone, message) {
  const number = normalizePhone(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/* ── Open WhatsApp — returns false if no valid number ─────*/
export function openWhatsApp(phone, message) {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

/* ── Message templates ────────────────────────────────────*/

export function msgWelcome(member) {
  return `Hello ${member.first_name} 🙏

Welcome to *${STUDIO}*! We are so happy to have you join us.

Your monthly yoga fee is *₹${member.fee}*.

Looking forward to practising with you.

Thank you,
${STUDIO}`;
}

export function msgFeeReminder(member, month) {
  return `Hello ${member.first_name} 🙏

This is a friendly reminder from *${STUDIO}*.

Your yoga fee of *₹${member.fee}* for *${month}* is pending.

Please make the payment at your earliest convenience.

Thank you,
${STUDIO}`;
}

export function msgPaymentConfirmation(member, amount, month) {
  return `Hello ${member.first_name} 🙏

Thank you for your payment of *₹${amount}* for *${month}*.

Your payment has been received successfully.

Thank you for being part of *${STUDIO}*. 🙏

${STUDIO}`;
}

export function msgDiscontinued(member) {
  return `Hello ${member.first_name} 🙏

We hope you are doing well.

Please feel free to reach out if you have any questions about your membership at *${STUDIO}*.

Thank you,
${STUDIO}`;
}

export function msgReactivated(member) {
  return `Hello ${member.first_name} 🙏

Welcome back to *${STUDIO}*! 🌿

Your membership has been reactivated. We are delighted to have you back.

Looking forward to seeing you soon.

Thank you,
${STUDIO}`;
}

export function msgAbsent(member, dateStr) {
  return `Hello ${member.first_name} 🙏

We noticed that you were absent from your *${STUDIO}* session on *${dateStr}*.

We hope everything is well. See you at the next class! 🌿

${STUDIO}`;
}
