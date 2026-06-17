const mongoose = require("mongoose");
const Group = require("../models/group");

/**
 * Cart Lock Middleware
 *
 * Must be used AFTER auth middleware in route chain: [auth, cartLock]
 *
 * Responsibilities:
 * 1. Validates req.user exists (auth middleware ran)
 * 2. Resolves group ID from req.params.groupId or req.params.id
 * 3. Validates MongoDB ObjectId format
 * 4. Fetches group from database
 * 5. Finds member by authenticated user's email (req.user.email)
 * 6. Blocks request if member.paymentVerified === true
 * 7. Attaches req.group and req.member for downstream handlers
 *
 * This middleware performs ZERO write operations to the database.
 */
const cartLock = async (req, res, next) => {
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

        // 5. Find member by authenticated user's email (from JWT, not request body)
        const member = group.members.find(
            m => m.email === req.user.email
        );

        if (!member) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        // 5.5 Block if group is closed (TARGET mode auto-closed or manually closed)
        if (group.isClosed) {
            return res.status(403).json({
                message: "Group is closed. Cart modifications are not allowed."
            });
        }

        // 6. Check lock condition — block if payment already verified
        if (member.paymentVerified === true) {
            return res.status(403).json({
                message: "Cart locked after payment verification"
            });
        }

        // 7. Attach group and member to request for handler reuse (avoids duplicate queries)
        req.group = group;
        req.member = member;
        next();
    } catch (error) {
        res.status(500).json({
            message: "Cart lock check failed"
        });
    }
};

module.exports = cartLock;
