/**
 * Script to create test notifications for admin users
 * Run with: node script/create-test-notifications.js
 */

import "../src/Utils/loadEnv.js";
import connectToDatabase from "../src/Utils/db.js";
import User from "../src/Models/User.js";
import Notification from "../src/Models/Notification.js";

const createTestNotifications = async () => {
  try {
    console.log("Connecting to database...");
    await connectToDatabase(process.env.MONGODB_URL);

    // Find all admin users
    const admins = await User.find({ role: "admin" });
    
    if (admins.length === 0) {
      console.log("❌ No admin users found. Please create an admin user first.");
      process.exit(1);
    }

    console.log(`Found ${admins.length} admin user(s). Creating test notifications...`);

    const testNotifications = [
      {
        type: "admin_new_user",
        title: "Playtime is ready",
        message: "Your New Playweek Activities Are Waiting. Let's start playing!",
        tone: "info",
        icon: "bell",
      },
      {
        type: "admin_activity_approved",
        title: "Ready for a little play?",
        message: "Just 10 Minutes Of Play Today Helps Build Big Skills!",
        tone: "success",
        icon: "bell",
      },
      {
        type: "admin_new_activity",
        title: "Try something new",
        message: "How About The Silly Dance Break? It Only Takes 5 Minutes!",
        tone: "info",
        icon: "bell",
      },
      {
        type: "admin_streak",
        title: "You're on a roll!",
        message: "3 Days In A Row! Keep The Streak Alive With Another Activity.",
        tone: "success",
        icon: "bell",
      },
      {
        type: "admin_badge_earned",
        title: "You did it",
        message: "Congrats! You Earned The Gratitude Builder Badge!",
        tone: "success",
        icon: "bell",
      },
      {
        type: "admin_progress",
        title: "Halfway there",
        message: "You've Completed 3 Of 5 Playweek Activities. Keep Going!",
        tone: "warning",
        icon: "bell",
      },
      {
        type: "admin_community",
        title: "Your community is buzzing",
        message: "See What Other Parents Shared In Gratitude Community Today!",
        tone: "info",
        icon: "bell",
      },
      {
        type: "admin_new_content",
        title: "Fresh ideas unlocked",
        message: "3 New Activities Were Just Added To The Library. Check Them Out!",
        tone: "info",
        icon: "bell",
      },
    ];

    let createdCount = 0;

    for (const admin of admins) {
      console.log(`Creating notifications for admin: ${admin.email} (${admin._id})`);

      for (const notif of testNotifications) {
        try {
          const notification = new Notification({
            userId: admin._id,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            tone: notif.tone,
            icon: notif.icon,
            isRead: false,
          });

          await notification.save();
          createdCount++;
        } catch (err) {
          if (err.code === 11000) {
            // Duplicate key error, skip
            console.log(`  ⚠️  Notification already exists: ${notif.title}`);
          } else {
            console.error(`  ❌ Error creating notification: ${notif.title}`, err.message);
          }
        }
      }
    }

    console.log(`\n✅ Created ${createdCount} test notifications for ${admins.length} admin user(s).`);
    console.log("You can now check the notifications in your admin panel!\n");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

createTestNotifications();

