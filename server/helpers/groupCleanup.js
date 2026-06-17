const Group = require("../models/group");

const CLEANUP_INTERVAL = 60 * 60 * 1000; // Run every 1 hour
const MAX_AGE_HOURS = 12;

/**
 * Auto-close TIME-mode groups past their closingTime.
 * Delete groups that have been closed for more than 12 hours.
 */
const runGroupCleanup = async () => {
    const now = new Date();

    try {
        // 1. Auto-close TIME-mode groups past their closingTime
        const expiredTimeGroups = await Group.find({
            closeMode: "TIME",
            isClosed: false,
            closingTime: { $lte: now },
        });

        for (const group of expiredTimeGroups) {
            group.isClosed = true;
            group.closedAt = new Date();
            await group.save();
            console.log(`⏰ TIME group auto-closed: ${group.storeName} (${group._id})`);
        }

        // 2. Delete groups closed more than 12 hours ago
        const cutoff = new Date(now.getTime() - MAX_AGE_HOURS * 60 * 60 * 1000);
        const result = await Group.deleteMany({
            isClosed: true,
            closedAt: { $lte: cutoff },
        });

        if (result.deletedCount > 0) {
            console.log(`🗑️ Deleted ${result.deletedCount} group(s) closed >12 hours ago`);
        }

    } catch (error) {
        console.error("❌ Group cleanup error:", error.message);
    }
};

/**
 * Start the periodic cleanup scheduler.
 */
const startCleanupScheduler = () => {
    console.log("🧹 Group cleanup scheduler started (interval: 1 hour, max age: 12 hours)");

    // Run immediately on start
    runGroupCleanup();

    // Then run every hour
    setInterval(runGroupCleanup, CLEANUP_INTERVAL);
};

module.exports = { startCleanupScheduler, runGroupCleanup };
