import mongoose from "mongoose";

const testerAccessSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
      index: true,
    },
    appliedAt: { type: Date, default: null },
    decidedAt: { type: Date, default: null },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // application fields
    fullName: { type: String, default: "" },
    country: { type: String, default: "" },
    childAge: { type: String, default: "" },
    motivation: { type: String, default: "" },

    // admin note / rejection reason
    decisionNote: { type: String, default: "" },

    // for email dedupe if needed later
    lastNotifiedAt: { type: Date, default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    password: {
      type: String,
      default: null,
      required: function requiredPassword() {
        return this.authProvider !== "google";
      },
      select: false,
    },

    // Unique only when present (actual Google logins); allow many nulls
    googleId: { type: String, default: undefined },
    authProvider: { type: String, enum: ["email", "google"], default: "email" },

    role: { type: String, enum: ["user", "tester", "admin"], default: "user" },

    // ✅ used in JWT payload already in your code (was missing in schema)
    isTestFamily: { type: Boolean, default: false, index: true },

    // ✅ new tester workflow
    testerAccess: { type: testerAccessSchema, default: () => ({}) },

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say", ""],
      default: "",
    },
    ageGroup: { type: String, default: "" },

    avatar: { type: String, default: "" },
    avatarPublicId: { type: String, default: "" },
    avatarKey: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    storageProvider: { type: String, default: "" },
    focusAreas: { type: [String], default: [] },

    emailVerified: { type: Boolean, default: false },
    emailVerificationOTP: { type: String, select: false },
    emailVerificationOTPExpires: { type: Date, select: false },

    resetPasswordToken: { type: String, select: false },
    resetPasswordTokenExpires: { type: Date, select: false },
    resetPasswordOTP: { type: String, select: false },
    resetPasswordOTPExpires: { type: Date, select: false },

    playweekSettings: {
      exerciseFrequency: { type: String, default: "" },
      bestTimeOfDay: { type: String, default: "" },
      remindersEnabled: { type: Boolean, default: false },
    },

    onboarding: {
      step: { type: Number, default: 0 },
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
    },

    badges: { type: [String], default: [] },
    notificationsEnabled: { type: Boolean, default: false },
    weeklyProgressEnabled: { type: Boolean, default: false },
    countryCode: { type: String, default: "US" },
    timezone: { type: String, default: "America/New_York" },

    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    referralCount: { type: Number, default: 0 },
    referralRewards: {
      type: [
        {
          type: { type: String, default: "" },
          reason: { type: String, default: "" },
          awardedAt: { type: Date, default: null },
          expiresAt: { type: Date, default: null },
        },
      ],
      default: [],
    },

    deleteRequestedAt: { type: Date, default: null },
    deleteScheduledFor: { type: Date, default: null },

    subscription: { type: String, default: null },
    subscriptionActive: { type: Boolean, default: false },
    subscriptionExpiresAt: { type: Date, default: null },
    isInTrial: { type: Boolean, default: false },
    trialEndDate: { type: Date, default: null },
    stripeCustomerId: { type: String, default: null },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ "testerAccess.status": 1, createdAt: -1 });
userSchema.index(
  { googleId: 1 },
  {
    name: "googleId_unique_when_string",
    unique: true,
    partialFilterExpression: { googleId: { $type: "string" } },
  }
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.emailVerificationOTP;
    delete ret.emailVerificationOTPExpires;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordTokenExpires;
    delete ret.resetPasswordOTP;
    delete ret.resetPasswordOTPExpires;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
