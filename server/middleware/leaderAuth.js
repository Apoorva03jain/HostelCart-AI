const mongoose = require("mongoose");
const Group = require("../models/group");

/**
 * Leader Authorization Middleware
 *
 * Must be used AFTER auth middleware in route chain: [auth, leaderAuth]
 *
 * Responsibilities:
 * 1. Validates req.user exists (auth middleware ran)
 * 2. Resolves group ID from req.params.groupId or req.params.id
 * 3. Validates MongoDB ObjectId format
 * 4. Fetches group from database
 * 5. Compares authenticated user email with group leader (case-insensitive)
 * 6. Attaches group to req.group for downstream handlers
 */
const leaderAuth = async (req, res, next) => {
    try {
        // 1. Ensure auth middleware ran and attached user
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        // 2. Resolve group ID from route params (supports both :groupId and :id)
        const groupId = req.params.groupId || req.params.id;

        // 3. Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({
                message: "Invalid group identifier"
            });
        }

        // 4. Fetch group from database
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        // 5. Case-insensitive email comparison
        if (req.user.email.toLowerCase() !== group.groupLeader.toLowerCase()) {
            return res.status(403).json({
                message: "Only group leader can perform this action"
            });
        }

        // 6. Attach group to request for reuse in handler (avoids duplicate query)
        req.group = group;
        next();
    } catch (error) {
        res.status(500).json({
            message: "Authorization check failed"
        });
    }
};

module.exports = leaderAuth;
