import User from "../Models/User.js";

export function clampInt(n, min, max, fallback) {
  const x = Number.parseInt(String(n ?? ""), 10);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, x));
}

// IMPORTANT: avoid Date("YYYY-MM-DD") UTC shifting
export function parseYYYYMMDD(s) {
  if (!s) return null;
  const str = String(s).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(`${str}T00:00:00`); // local midnight
  return Number.isNaN(d.getTime()) ? null : d;
}

// local YYYY-MM-DD (no UTC shift)
export function toLocalISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ✅ Sunday start (dayIndex 0 = Sunday) — matches your earlier API response
export function startOfWeekSunday(date) {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  d.setDate(d.getDate() - day);
  return d;
}

// Optional: Monday start
export function startOfWeekMonday(date) {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function startOfMonth(date) {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const daysInNewMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, daysInNewMonth));
  return startOfDay(d);
}

export function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function buildDefaultPlan(activityIds) {
  const ids = (activityIds || []).map((x) => String(x));
  const plan = [];
  for (let i = 0; i < ids.length; i++) {
    plan.push({ dayIndex: i % 7, activityId: ids[i] });
  }
  return plan;
}

// ✅ better subscription check
export async function checkUserSubscription(userId) {
  const now = new Date();
  const u = await User.findById(userId)
    .select("subscriptionActive subscriptionExpiresAt isInTrial trialEndDate")
    .lean();

  if (!u) return false;

  const active =
    !!u.subscriptionActive &&
    (!u.subscriptionExpiresAt || new Date(u.subscriptionExpiresAt) > now);

  const trial =
    !!u.isInTrial && !!u.trialEndDate && new Date(u.trialEndDate) > now;

  return active || trial;
}
