import Activity from "../Models/Activity.js";
import Badge from "../Models/Badge.js";
import CompletedActivity from "../Models/CompletedActivity.js";
import User from "../Models/User.js";
import { areConsecutiveWeeks, getWeekOfYear, parseWeekKey } from "./ActivityHelper.js";

export const checkAndAwardAreaBadges = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return [];

        const areaBadgeMapping = {
            'emotionele gezondheid': {
                name: 'Feelings Finder',
                description: '3 of meer emotionele gezondheid-activiteiten voltooid met je kind.',
                requiredCount: 3
            },
            'dankbaarheid': {
                name: 'Gratitude Giver (Area)',
                description: '3 of meer dankbaarheidsactiviteiten voltooid met je kind.',
                requiredCount: 3
            },
            'zelfzorg': {
                name: 'Self Care Star',
                description: '3 of meer zelfzorgactiviteiten voltooid met je kind.',
                requiredCount: 3
            },
            'geldwijsheid': {
                name: 'Money Minded',
                description: '3 of meer financiële activiteiten voltooid met je kind.',
                requiredCount: 3
            },
            'ondernemerschap': {
                name: 'Mini Maker',
                description: '3 of meer ondernemerschapsactiviteiten voltooid met je kind.',
                requiredCount: 3
            },
            'anders denken': {
                name: 'Creative Thinker',
                description: '3 of meer creatieve activiteiten voltooid met je kind om verbeeldingskracht te stimuleren.',
                requiredCount: 3
            }
        };

        const completedActivities = await CompletedActivity.find({ userId })
            .populate({
                path: 'activityId',
                match: { isApproved: true },
                select: 'learningDomain'
            });

        const validCompletedActivities = completedActivities.filter(comp => comp.activityId);

        const domainCounts = {};
        validCompletedActivities.forEach(completion => {
            const domain = completion.activityId.learningDomain?.toLowerCase()?.trim();
            if (domain) {
                domainCounts[domain] = (domainCounts[domain] || 0) + 1;
            }
        });

        const newlyEarnedBadges = [];

        for (const [domain, badgeInfo] of Object.entries(areaBadgeMapping)) {
            const completedCount = domainCounts[domain] || 0;
            const alreadyHasBadge = user.badges.includes(badgeInfo.name);

            if (completedCount >= badgeInfo.requiredCount && !alreadyHasBadge) {
                const badgeFromDB = await Badge.findOne({ name: badgeInfo.name });

                if (badgeFromDB) {
                    user.badges.push(badgeInfo.name);

                    newlyEarnedBadges.push({
                        _id: badgeFromDB._id,
                        name: badgeFromDB.name,
                        description: badgeFromDB.description,
                        icon: badgeFromDB.icon,
                        category: badgeFromDB.category,
                    });
                }
            }
        }

        if (newlyEarnedBadges.length > 0) {
            await user.save();
        }

        return newlyEarnedBadges;

    } catch (error) {
        console.error('Error checking area badges:', error);
        return [];
    }
};
export const checkAndAwardCategoriesMaster = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return [];

        const badgeName = 'Categories Master';
        const alreadyHasBadge = user.badges.includes(badgeName);

        if (alreadyHasBadge) return [];

        // Get all approved activities grouped by learning domain
        const allActivities = await Activity.find({
            isApproved: true,
            learningDomain: { $ne: null, $ne: '' }
        });

        // Group activities by domain
        const domainGroups = {};
        allActivities.forEach(activity => {
            const domain = activity.learningDomain?.toLowerCase()?.trim();
            if (domain) {
                if (!domainGroups[domain]) {
                    domainGroups[domain] = [];
                }
                domainGroups[domain].push(activity._id);
            }
        });

        const completedActivities = await CompletedActivity.find({ userId })
            .populate({
                path: 'activityId',
                match: { isApproved: true },
                select: 'learningDomain'
            });

        const completedActivityIds = completedActivities
            .filter(comp => comp.activityId)
            .map(comp => comp.activityId._id.toString());

        // Check if user has completed all activities in at least one domain
        let hasCompletedFullCategory = false;
        for (const [domain, activityIds] of Object.entries(domainGroups)) {
            const allActivitiesInDomainCompleted = activityIds.every(activityId =>
                completedActivityIds.includes(activityId.toString())
            );

            if (allActivitiesInDomainCompleted && activityIds.length > 0) {
                hasCompletedFullCategory = true;
                break;
            }
        }

        if (hasCompletedFullCategory) {
            const badgeFromDB = await Badge.findOne({ name: badgeName });

            if (badgeFromDB) {
                user.badges.push(badgeName);
                await user.save();

                return [{
                    _id: badgeFromDB._id,
                    name: badgeFromDB.name,
                    description: badgeFromDB.description,
                    icon: badgeFromDB.icon,
                    category: badgeFromDB.category,
                }];
            }
        }

        return [];

    } catch (error) {
        console.error('Error checking Categories Master badge:', error);
        return [];
    }
};
export const checkAndAwardMasterParent = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return [];

        const badgeName = 'Master Parent';
        const alreadyHasBadge = user.badges.includes(badgeName);

        if (alreadyHasBadge) return [];

        const totalActivities = await Activity.countDocuments({ isApproved: true });

        const completedCount = await CompletedActivity.countDocuments({
            userId,
            activityId: { $in: await Activity.find({ isApproved: true }).distinct('_id') }
        });

        if (completedCount >= totalActivities && totalActivities > 0) {
            const badgeFromDB = await Badge.findOne({ name: badgeName });

            if (badgeFromDB) {
                user.badges.push(badgeName);
                await user.save();

                return [{
                    _id: badgeFromDB._id,
                    name: badgeFromDB.name,
                    description: badgeFromDB.description,
                    icon: badgeFromDB.icon,
                    category: badgeFromDB.category,
                }];
            }
        }

        return [];

    } catch (error) {
        console.error('Error checking Master Parent badge:', error);
        return [];
    }
};
export const checkAndAwardStreakBuilder = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return [];

        const badgeName = 'Streak Builder';
        const alreadyHasBadge = user.badges.includes(badgeName);

        if (alreadyHasBadge) return [];

        const completedActivities = await CompletedActivity.find({ userId })
            .sort({ completedAt: 1 });

        if (completedActivities.length === 0) return [];

        const weeklyActivity = {};
        completedActivities.forEach(activity => {
            const date = new Date(activity.completedAt);
            const year = date.getFullYear();
            const week = getWeekOfYear(date);
            const weekKey = `${year}-W${week}`;

            if (!weeklyActivity[weekKey]) {
                weeklyActivity[weekKey] = 0;
            }
            weeklyActivity[weekKey]++;
        });

        // Check for 3 consecutive weeks with at least 1 activity each
        const weeks = Object.keys(weeklyActivity).sort();
        let consecutiveWeeks = 0;
        let maxConsecutiveWeeks = 0;

        for (let i = 0; i < weeks.length; i++) {
            if (weeklyActivity[weeks[i]] >= 1) {
                consecutiveWeeks++;

                // Check if next week exists and is consecutive
                if (i < weeks.length - 1) {
                    const currentWeek = parseWeekKey(weeks[i]);
                    const nextWeek = parseWeekKey(weeks[i + 1]);

                    if (!areConsecutiveWeeks(currentWeek, nextWeek)) {
                        maxConsecutiveWeeks = Math.max(maxConsecutiveWeeks, consecutiveWeeks);
                        consecutiveWeeks = 0;
                    }
                } else {
                    maxConsecutiveWeeks = Math.max(maxConsecutiveWeeks, consecutiveWeeks);
                }
            } else {
                maxConsecutiveWeeks = Math.max(maxConsecutiveWeeks, consecutiveWeeks);
                consecutiveWeeks = 0;
            }
        }

        if (maxConsecutiveWeeks >= 3) {
            const badgeFromDB = await Badge.findOne({ name: badgeName });

            if (badgeFromDB) {
                user.badges.push(badgeName);
                await user.save();

                return [{
                    _id: badgeFromDB._id,
                    name: badgeFromDB.name,
                    description: badgeFromDB.description,
                    icon: badgeFromDB.icon,
                    category: badgeFromDB.category,
                }];
            }
        }

        return [];

    } catch (error) {
        console.error('Error checking Streak Builder badge:', error);
        return [];
    }
};
export const checkAndAwardChampion = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return [];

        const badgeName = 'Champion';
        const alreadyHasBadge = user.badges.includes(badgeName);

        if (alreadyHasBadge) return [];

        const completedActivities = await CompletedActivity.find({ userId })
            .sort({ completedAt: 1 });

        if (completedActivities.length === 0) return [];

        const weeklyActivity = {};
        completedActivities.forEach(activity => {
            const date = new Date(activity.completedAt);
            const year = date.getFullYear();
            const week = getWeekOfYear(date);
            const weekKey = `${year}-W${week}`;

            if (!weeklyActivity[weekKey]) {
                weeklyActivity[weekKey] = 0;
            }
            weeklyActivity[weekKey]++;
        });

        // Check for 12 consecutive weeks with at least 1 activity each
        const weeks = Object.keys(weeklyActivity).sort();
        let consecutiveWeeks = 0;
        let maxConsecutiveWeeks = 0;

        for (let i = 0; i < weeks.length; i++) {
            if (weeklyActivity[weeks[i]] >= 1) {
                consecutiveWeeks++;

                // Check if next week exists and is consecutive
                if (i < weeks.length - 1) {
                    const currentWeek = parseWeekKey(weeks[i]);
                    const nextWeek = parseWeekKey(weeks[i + 1]);

                    if (!areConsecutiveWeeks(currentWeek, nextWeek)) {
                        maxConsecutiveWeeks = Math.max(maxConsecutiveWeeks, consecutiveWeeks);
                        consecutiveWeeks = 0;
                    }
                } else {
                    maxConsecutiveWeeks = Math.max(maxConsecutiveWeeks, consecutiveWeeks);
                }
            } else {
                maxConsecutiveWeeks = Math.max(maxConsecutiveWeeks, consecutiveWeeks);
                consecutiveWeeks = 0;
            }
        }

        if (maxConsecutiveWeeks >= 12) {
            const badgeFromDB = await Badge.findOne({ name: badgeName });

            if (badgeFromDB) {
                user.badges.push(badgeName);
                await user.save();

                return [{
                    _id: badgeFromDB._id,
                    name: badgeFromDB.name,
                    description: badgeFromDB.description,
                    icon: badgeFromDB.icon,
                    category: badgeFromDB.category,
                }];
            }
        }

        return [];

    } catch (error) {
        console.error('Error checking Champion badge:', error);
        return [];
    }
};
export const checkAndAwardSurprisePlayer = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return [];

        const badgeName = 'Surprise Player';
        const alreadyHasBadge = user.badges.includes(badgeName);

        if (alreadyHasBadge) return [];

        const surpriseBadgeNames = [
            'First Step',
            'Feelings Finder',
            'Gratitude Giver (Area)',
            'Self Care Star',
            'Money Minded',
            'Mini Maker',
            'Creative Thinker'
            // Add more badge names that you consider as surprise/hidden badges
        ];

        const userSurpriseBadges = user.badges.filter(badgeName =>
            surpriseBadgeNames.includes(badgeName)
        );

        if (userSurpriseBadges.length >= 3) {
            const badgeFromDB = await Badge.findOne({ name: badgeName });

            if (badgeFromDB) {
                user.badges.push(badgeName);
                await user.save();

                return [{
                    _id: badgeFromDB._id,
                    name: badgeFromDB.name,
                    description: badgeFromDB.description,
                    icon: badgeFromDB.icon,
                    category: badgeFromDB.category,
                }];
            }
        }

        return [];

    } catch (error) {
        console.error('Error checking Surprise Player badge:', error);
        return [];
    }
};
export const checkAndAwardMobileExplorer = async (userId, req) => {
    try {
        const user = await User.findById(userId);
        if (!user) return [];

        const badgeName = 'Mobile Explorer';
        const alreadyHasBadge = user.badges.includes(badgeName);

        if (alreadyHasBadge) return [];

        // Check if request is from mobile device
        const userAgent = req.headers['user-agent'] || '';
        const isMobile = /Mobile|Android|iPhone|iPad|iPod|Windows Phone/i.test(userAgent);

        if (!isMobile) return [];

        // Get completed activities from mobile (you'll need to track device type in CompletedActivity model)
        // For now, we'll check if current completion is on mobile and user has 3+ completions from mobile

        // Get all completed activities for this user
        const completedActivities = await CompletedActivity.find({ userId })
            .populate({
                path: 'activityId',
                match: { isApproved: true, learningDomain: 'zelfzorg' }, // Self-care activities
                select: 'learningDomain'
            });

        // Filter for self-care activities
        const selfCareCompletions = completedActivities.filter(comp =>
            comp.activityId && comp.activityId.learningDomain === 'zelfzorg'
        );

        // For this implementation, we'll assume if user is currently on mobile and has 3+ self-care completions
        // In a real implementation, you'd track device type in CompletedActivity model
        if (selfCareCompletions.length >= 3 && isMobile) {
            const badgeFromDB = await Badge.findOne({ name: badgeName });

            if (badgeFromDB) {
                user.badges.push(badgeName);
                await user.save();

                return [{
                    _id: badgeFromDB._id,
                    name: badgeFromDB.name,
                    description: badgeFromDB.description,
                    icon: badgeFromDB.icon,
                    category: badgeFromDB.category,
                }];
            }
        }

        return [];

    } catch (error) {
        console.error('Error checking Mobile Explorer badge:', error);
        return [];
    }
};
export const checkAndAwardSurpriseStreak = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return [];

        const badgeName = 'Surprise Streak';
        const alreadyHasBadge = user.badges.includes(badgeName);

        if (alreadyHasBadge) return [];

        const completedActivities = await CompletedActivity.find({ userId })
            .sort({ completedAt: 1 });

        if (completedActivities.length === 0) return [];

        // Check for random engagement patterns (multiple criteria)
        const now = new Date();
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Recent activity in last 7 days
        const recentActivity = completedActivities.filter(activity =>
            new Date(activity.completedAt) >= last7Days
        ).length;

        // Activity in last 30 days
        const monthlyActivity = completedActivities.filter(activity =>
            new Date(activity.completedAt) >= last30Days
        ).length;

        // Check for various "surprise" criteria
        const totalBadges = user.badges.length;
        const hasConsistentEngagement = recentActivity >= 2 && monthlyActivity >= 5;
        const hasMultipleBadges = totalBadges >= 2;

        // Award badge based on random engagement criteria
        const surpriseCriteria = [
            hasConsistentEngagement,
            hasMultipleBadges,
            completedActivities.length >= 7, // Has completed at least 7 activities
            recentActivity >= 3 // Very active recently
        ];

        const metCriteria = surpriseCriteria.filter(Boolean).length;

        // Award if user meets at least 2 surprise criteria
        if (metCriteria >= 2) {
            const badgeFromDB = await Badge.findOne({ name: badgeName });

            if (badgeFromDB) {
                user.badges.push(badgeName);
                await user.save();

                return [{
                    _id: badgeFromDB._id,
                    name: badgeFromDB.name,
                    description: badgeFromDB.description,
                    icon: badgeFromDB.icon,
                    category: badgeFromDB.category,
                }];
            }
        }

        return [];

    } catch (error) {
        console.error('Error checking Surprise Streak badge:', error);
        return [];
    }
};
export const checkAndAwardFiveInARow = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return [];

        const badgeName = '5-In-A-Row';
        const alreadyHasBadge = user.badges.includes(badgeName);

        if (alreadyHasBadge) return [];

        const completedActivities = await CompletedActivity.find({ userId })
            .sort({ completedAt: 1 });

        if (completedActivities.length === 0) return [];

        const weeklyActivity = {};
        completedActivities.forEach(activity => {
            const date = new Date(activity.completedAt);
            const year = date.getFullYear();
            const week = getWeekOfYear(date);
            const weekKey = `${year}-W${week}`;

            if (!weeklyActivity[weekKey]) {
                weeklyActivity[weekKey] = 0;
            }
            weeklyActivity[weekKey]++;
        });

        // Check if any week has 5 or more completed activities
        const hasWeekWith5Activities = Object.values(weeklyActivity).some(count => count >= 5);

        if (hasWeekWith5Activities) {
            const badgeFromDB = await Badge.findOne({ name: badgeName });

            if (badgeFromDB) {
                user.badges.push(badgeName);
                await user.save();

                return [{
                    _id: badgeFromDB._id,
                    name: badgeFromDB.name,
                    description: badgeFromDB.description,
                    icon: badgeFromDB.icon,
                    category: badgeFromDB.category,
                }];
            }
        }

        return [];

    } catch (error) {
        console.error('Error checking 5-In-A-Row badge:', error);
        return [];
    }
};

export const checkAndAwardConsistencyChamp = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return [];

        const badgeName = 'Consistency Champ';
        const alreadyHasBadge = user.badges.includes(badgeName);

        if (alreadyHasBadge) return [];

        const completedActivities = await CompletedActivity.find({ userId })
            .sort({ completedAt: 1 });

        if (completedActivities.length === 0) return [];

        const weeklyActivity = {};
        completedActivities.forEach(activity => {
            const date = new Date(activity.completedAt);
            const year = date.getFullYear();
            const week = getWeekOfYear(date);
            const weekKey = `${year}-W${week}`;

            if (!weeklyActivity[weekKey]) {
                weeklyActivity[weekKey] = 0;
            }
            weeklyActivity[weekKey]++;
        });

        // Check for 4 consecutive weeks with at least 1 activity each
        const weeks = Object.keys(weeklyActivity).sort();
        let consecutiveWeeks = 0;
        let maxConsecutiveWeeks = 0;

        for (let i = 0; i < weeks.length; i++) {
            if (weeklyActivity[weeks[i]] >= 1) {
                consecutiveWeeks++;

                // Check if next week exists and is consecutive
                if (i < weeks.length - 1) {
                    const currentWeek = parseWeekKey(weeks[i]);
                    const nextWeek = parseWeekKey(weeks[i + 1]);

                    if (!areConsecutiveWeeks(currentWeek, nextWeek)) {
                        maxConsecutiveWeeks = Math.max(maxConsecutiveWeeks, consecutiveWeeks);
                        consecutiveWeeks = 0;
                    }
                } else {
                    maxConsecutiveWeeks = Math.max(maxConsecutiveWeeks, consecutiveWeeks);
                }
            } else {
                maxConsecutiveWeeks = Math.max(maxConsecutiveWeeks, consecutiveWeeks);
                consecutiveWeeks = 0;
            }
        }

        if (maxConsecutiveWeeks >= 4) {
            const badgeFromDB = await Badge.findOne({ name: badgeName });

            if (badgeFromDB) {
                user.badges.push(badgeName);
                await user.save();

                return [{
                    _id: badgeFromDB._id,
                    name: badgeFromDB.name,
                    description: badgeFromDB.description,
                    icon: badgeFromDB.icon,
                    category: badgeFromDB.category,
                }];
            }
        }

        return [];

    } catch (error) {
        console.error('Error checking Consistency Champ badge:', error);
        return [];
    }
};

export const checkAndAwardBounceBack = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return [];

        const badgeName = 'Bounce Back';
        const alreadyHasBadge = user.badges.includes(badgeName);

        if (alreadyHasBadge) return [];

        // Get completed activities in the resilience (veerkracht) domain
        const completedActivities = await CompletedActivity.find({ userId })
            .populate({
                path: 'activityId',
                match: {
                    isApproved: true,
                    learningDomain: { $regex: /veerkracht/i } // Case-insensitive match for resilience
                },
                select: 'learningDomain'
            });

        // Filter for resilience activities (veerkracht)
        const resilienceCompletions = completedActivities.filter(comp =>
            comp.activityId &&
            comp.activityId.learningDomain &&
            comp.activityId.learningDomain.toLowerCase().includes('veerkracht')
        );

        if (resilienceCompletions.length >= 3) {
            const badgeFromDB = await Badge.findOne({ name: badgeName });

            if (badgeFromDB) {
                user.badges.push(badgeName);
                await user.save();

                return [{
                    _id: badgeFromDB._id,
                    name: badgeFromDB.name,
                    description: badgeFromDB.description,
                    icon: badgeFromDB.icon,
                    category: badgeFromDB.category,
                }];
            }
        }

        return [];

    } catch (error) {
        console.error('Error checking Bounce Back badge:', error);
        return [];
    }
};

export const checkAndAwardGratitudeGiver = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return [];

        const badgeName = 'Gratitude Giver';
        const alreadyHasBadge = user.badges.includes(badgeName);

        if (alreadyHasBadge) return [];

        // Get completed activities in the gratitude (dankbaarheid) domain
        const completedActivities = await CompletedActivity.find({ userId })
            .populate({
                path: 'activityId',
                match: {
                    isApproved: true,
                    learningDomain: { $regex: /dankbaarheid/i } // Case-insensitive match for gratitude
                },
                select: 'learningDomain'
            });

        // Filter for gratitude activities (dankbaarheid)
        const gratitudeCompletions = completedActivities.filter(comp =>
            comp.activityId &&
            comp.activityId.learningDomain &&
            comp.activityId.learningDomain.toLowerCase().includes('dankbaarheid')
        );

        if (gratitudeCompletions.length >= 3) {
            const badgeFromDB = await Badge.findOne({ name: badgeName });

            if (badgeFromDB) {
                user.badges.push(badgeName);
                await user.save();

                return [{
                    _id: badgeFromDB._id,
                    name: badgeFromDB.name,
                    description: badgeFromDB.description,
                    icon: badgeFromDB.icon,
                    category: badgeFromDB.category,
                }];
            }
        }

        return [];

    } catch (error) {
        console.error('Error checking Gratitude Giver badge:', error);
        return [];
    }
};

export const checkAndAwardFocusFinisher = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return [];

        const badgeName = 'Focus Finisher';
        const alreadyHasBadge = user.badges.includes(badgeName);

        if (alreadyHasBadge) return [];

        // Get completed activities in the focus domain
        const completedActivities = await CompletedActivity.find({ userId })
            .populate({
                path: 'activityId',
                match: {
                    isApproved: true,
                    learningDomain: { $regex: /focus|concentratie|aandacht/i } // Case-insensitive match for focus-related terms
                },
                select: 'learningDomain'
            });

        // Filter for focus activities
        const focusCompletions = completedActivities.filter(comp =>
            comp.activityId &&
            comp.activityId.learningDomain &&
            (comp.activityId.learningDomain.toLowerCase().includes('focus') ||
                comp.activityId.learningDomain.toLowerCase().includes('concentratie') ||
                comp.activityId.learningDomain.toLowerCase().includes('aandacht'))
        );

        if (focusCompletions.length >= 3) {
            const badgeFromDB = await Badge.findOne({ name: badgeName });

            if (badgeFromDB) {
                user.badges.push(badgeName);
                await user.save();

                return [{
                    _id: badgeFromDB._id,
                    name: badgeFromDB.name,
                    description: badgeFromDB.description,
                    icon: badgeFromDB.icon,
                    category: badgeFromDB.category,
                }];
            }
        }

        return [];

    } catch (error) {
        console.error('Error checking Focus Finisher badge:', error);
        return [];
    }
};
