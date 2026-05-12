import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sendEmail } from "../Utils/emailService.js";

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const makeOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const hash = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

export const signToken = (userId) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing in env");
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};

export async function sendSignupOtpEmail(toEmail, otp) {
  await sendEmail({
    to: toEmail,
    subject: "Your Luumilo verification code",
    text: `Your verification code is: ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;">
        <h2>Verify your email</h2>
        <p>Your Luumilo verification code is:</p>
        <div style="font-size:28px;font-weight:800;letter-spacing:6px;margin:16px 0;">${otp}</div>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
}


export const getCurrentWeekNumber = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now - startOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
};


export const normalizeGender = (g) => {
  if (g === undefined || g === null || String(g).trim() === "") return null;
  const val = String(g).trim().toLowerCase();
  const allowed = ["male", "female", "other"];
  if (!allowed.includes(val)) return "INVALID";
  return val;
};


export const normGender = (g) => {
  const v = String(g || "").trim().toLowerCase();
  if (!v) return null;
  if (!["male", "female", "other"].includes(v)) return "INVALID";
  return v;
};

export const getUserId = (req) => req.user?.id || req.user?._id || req.userId;
