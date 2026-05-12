import UserSubscription from "../Models/UserSubscription.js";
import { checkReferralReward } from "../Controllers/referralController.js";
import { resolveMediaUrl } from "../Utils/mediaUrl.js";

export const getWeekOfYear = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

export const parseWeekKey = (weekKey) => {
    const [year, week] = weekKey.split('-W');
    return { year: parseInt(year), week: parseInt(week) };
};

export const areConsecutiveWeeks = (week1, week2) => {
    if (week1.year === week2.year) {
        return week2.week === week1.week + 1;
    } else if (week2.year === week1.year + 1) {
        // Check if it's the last week of year and first week of next year
        const lastWeekOfYear = getWeekOfYear(new Date(week1.year, 11, 31));
        return week1.week === lastWeekOfYear && week2.week === 1;
    }
    return false;
};

export const getTop5Activities = async () => {
    return await Activity.find({ isApproved: true })
        .sort({ averageRating: -1, createdAt: -1 })
        .limit(5);
};

export const isMoreThanAWeekOld = (date) => {
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return new Date() - new Date(date) > oneWeek;
};


export const getNextMondayAt6AM = (timezone = 'UTC') => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;

    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(6, 0, 0, 0); // Set to 6:00 AM

    return nextMonday;
};

// Helper function to get current Monday 6 AM of this week
export const getCurrentMondayAt6AM = (timezone = 'UTC') => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days since Monday

    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() - daysSinceMonday);
    currentMonday.setHours(6, 0, 0, 0); // Set to 6:00 AM

    return currentMonday;
};

// Helper function to check if it's past Monday 6 AM this week
export const isPastMondayRefresh = (lastRefreshDate, userTimezone = 'UTC') => {
    const currentMondayAt6AM = getCurrentMondayAt6AM(userTimezone);
    const now = new Date();

    // If today is past current Monday 6 AM and last refresh was before current Monday 6 AM
    return now >= currentMondayAt6AM && (!lastRefreshDate || new Date(lastRefreshDate) < currentMondayAt6AM);
};

// Helper function to get week number from Monday refresh date
export const getWeekNumberFromMondayRefresh = (startDate) => {
    const mondayRefreshEpoch = new Date('2024-01-01T06:00:00.000Z'); // Start counting from this Monday
    const weeksDifference = Math.floor((new Date(startDate) - mondayRefreshEpoch) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, weeksDifference + 1);
};

export const getUserTimezone = (req) => {
    // Check multiple sources for timezone
    const timezone = 
      req.headers['x-user-timezone'] ||           // Frontend sends this
      req.body.timezone ||                        // From request body
      req.query.timezone ||                       // From query params
      req.user?.timezone ||                       // From user profile
      'UTC';                                      // Default fallback
  
    return timezone;
  };

export const formatActivityMedia = (activity) => {
  if (!activity) return activity;
  const obj = activity.toObject ? activity.toObject() : { ...activity };
  if (obj.coverImage) {
    obj.coverImage = {
      ...obj.coverImage,
      url: resolveMediaUrl({
        key: obj.coverImage.key,
        url: obj.coverImage.url,
        legacyUrl: obj.coverImage.url,
      }),
    };
  }
  obj.gallery = (obj.gallery || []).map((item) => ({
    ...item,
    url: resolveMediaUrl({
      key: item.key,
      url: item.url,
      legacyUrl: item.url,
    }),
  }));
  obj.resources = (obj.resources || []).map((item) => ({
    ...item,
    url: resolveMediaUrl({
      key: item.key,
      url: item.url,
      legacyUrl: item.url,
    }),
  }));
  return obj;
};

export const checkUserSubscription = async (userId) => {
  if (!userId) return false;

  const hasReferralReward = await checkReferralReward(userId);
  if (hasReferralReward) return true;

  const userSubscription = await UserSubscription.findOne({
    userId,
    status: { $in: ["active", "trial"] },
    orderStatus: "paid",
  });

  return !!userSubscription;
};

export function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeDomain(domain) {
  const d = normalizeText(domain);

  const map = {
    "emotional health": "emotional_health",
    "emotionele gezondheid": "emotional_health",

    "creative thinking": "different_thinking",
    "different thinking": "different_thinking",
    "anders denken": "different_thinking",

    "resilience": "resilience",
    "veerkracht": "resilience",

    "gratitude": "gratitude",
    "dankbaarheid": "gratitude",

    "self care": "self_care",
    "zelfzorg": "self_care",

    "money wisdom": "money_wisdom",
    "geldwijsheid": "money_wisdom",

    "entrepreneurship": "entrepreneurship",
    "ondernemerschap": "entrepreneurship",
  };

  return map[d] || d.replace(/\s+/g, "_");
}

export function parseAgeRange(ageGroupStr) {
  const s = normalizeText(ageGroupStr);
  const nums = s.match(/\d+/g);
  if (!nums || nums.length === 0) return null;

  const a = Number(nums[0]);
  const b = nums.length >= 2 ? Number(nums[1]) : a;

  if (!Number.isFinite(a)) return null;
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

export function userAgeMatchesActivity(userAge, activityAgeGroupStr) {
  if (!userAge) return true;
  const age = Number(userAge);
  if (!Number.isFinite(age)) return true;

  const r = parseAgeRange(activityAgeGroupStr);
  if (!r) return true;
  return age >= r.min && age <= r.max;
}



// Helper/playweekTarget.js
export const resolveTargetActivities = (exerciseFrequency, fallback = 5) => {
  if (!exerciseFrequency) return fallback;

  const s = String(exerciseFrequency).trim().toLowerCase();

  // examples: "2-3", "1-2"
  const range = s.match(/(\d+)\s*-\s*(\d+)/);
  if (range) {
    const max = Number(range[2]);
    return Number.isFinite(max) && max > 0 ? max : fallback;
  }

  // examples: "3"
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) return n;

  // examples: "daily"
  if (s.includes("daily") || s.includes("every day")) return 7;

  return fallback;
};
