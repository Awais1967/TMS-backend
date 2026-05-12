import {
  register,
  login,
  sendResetLink,
  resetPasswordWithToken,
  sendSignupOTP,
  verifySignupOTP,
  googleAuth,
  getMyProfile,
  updateMyProfile,
  changePassword,
  requestDeleteAccount,
  cancelDeleteAccount,
  getOnboarding,
  onboardingStep1,
  onboardingStep3,
  completeOnboarding,
  uploadOnboardingAvatar, 
} from "../Controllers/authController.js";
import {
  checkUserSubscription,
  guestUserEmail,
  getUserDetail,
  checkShareLimit,
  recordActivityShare,
} from "../Controllers/UserController.js";
import express from "express";
import { authenticate } from "../Middleware/Authenticate.js";
import upload from "../Middleware/Upload.js";

const router = express.Router();

router.post("/register", register);
router.post("/send-signup-otp", sendSignupOTP);
router.post("/verify-signup-otp", verifySignupOTP);
router.post("/auth/google", googleAuth);

// Onboarding (Protected)
router.get("/onboarding", authenticate, getOnboarding);
router.post(
  "/onboarding/avatar",
  authenticate,
  (req, _res, next) => {
    req.cloudinaryFolder = "avatars";
    req.s3Folder = "avatars";
    next();
  },
  upload.single("avatar"),
  uploadOnboardingAvatar
);
router.put("/onboarding/step-1", authenticate, onboardingStep1);
router.put("/onboarding/step-3", authenticate, onboardingStep3);
router.post("/onboarding/complete", authenticate, completeOnboarding);

// Google auth (NEW main route)
router.post("/google", googleAuth);

// Backward compatible alias (keep if your frontend already calls this)
router.post("/auth/google", googleAuth);

router.post("/login", login);

router.post("/send-reset-link", sendResetLink);
router.post("/reset-password-with-token", resetPasswordWithToken);

// Profile
router.get("/me", authenticate, getMyProfile);
router.put("/me", authenticate, updateMyProfile);



// Password
router.put("/change-password", authenticate, changePassword);

// Delete account (30 days)
router.post("/delete-account/request", authenticate, requestDeleteAccount);
router.post("/delete-account/cancel", authenticate, cancelDeleteAccount);

router.get(
  "/check-user-subscription-status",
  authenticate,
  checkUserSubscription
);
router.post("/collect-email-for-guest", guestUserEmail);
router.get("/get-child-setting", authenticate, getUserDetail);

router.get("/check-share-limit", authenticate, checkShareLimit);
router.post("/record-activity-share", authenticate, recordActivityShare);

export default router;
