/**
 * Cart Helper Functions
 *
 * Shared utilities for cart operations to avoid duplicate logic
 * across add, edit, and remove handlers.
 */

/**
 * Recalculates member.totalAmount from all cart items.
 * Ensures consistency: totalAmount always equals sum of all itemTotal values.
 *
 * @param {Object} member - The member sub-document from the group
 * @returns {Number} - The recalculated total amount
 */
const recalculateMemberTotal = (member) => {
    member.totalAmount = member.cartItems.reduce(
        (sum, item) => sum + item.itemTotal, 0
    );
    return member.totalAmount;
};

/**
 * Validates cart item input for add/edit operations.
 *
 * @param {Object} body - The request body
 * @param {Object} options - Validation options
 * @param {Boolean} options.requireProductName - Whether productName is required
 * @param {Boolean} options.requireQuantity - Whether quantity is required
 * @param {Boolean} options.requirePrice - Whether price is required
 * @returns {Object|null} - Error object { message } or null if valid
 */
const validateCartInput = (body, options = {}) => {
    const { requireProductName = false, requireQuantity = false, requirePrice = false } = options;

    if (requireProductName) {
        if (!body.productName || typeof body.productName !== "string" || body.productName.trim() === "") {
            return { message: "productName is required" };
        }
    }

    if (requireQuantity) {
        if (body.quantity === undefined || typeof body.quantity !== "number" || body.quantity <= 0) {
            return { message: "quantity must be a number greater than 0" };
        }
    }

    if (requirePrice) {
        if (body.price === undefined || typeof body.price !== "number" || body.price <= 0) {
            return { message: "price must be a number greater than 0" };
        }
    }

    // For edit operations: validate quantity/price if provided (but not required)
    if (!requireQuantity && body.quantity !== undefined) {
        if (typeof body.quantity !== "number" || body.quantity <= 0) {
            return { message: "quantity must be a number greater than 0" };
        }
    }

    if (!requirePrice && body.price !== undefined) {
        if (typeof body.price !== "number" || body.price <= 0) {
            return { message: "price must be a number greater than 0" };
        }
    }

    return null;
};

/**
/**
 * Checks if a TIME-mode group should be closed based on closingTime.
 * Only used by the cleanup scheduler for TIME-mode groups past their closing time.
 *
 * @param {Object} group - The Mongoose group document
 * @returns {Object} - { autoClosed: Boolean }
 */
const checkTimeBasedClosure = async (group) => {
    if (
        group.closeMode === "TIME" &&
        !group.isClosed &&
        group.closingTime &&
        new Date() >= new Date(group.closingTime)
    ) {
        group.isClosed = true;
        group.closedAt = new Date();
        await group.save();
        return { autoClosed: true };
    }
    return { autoClosed: false };
};

module.exports = {
    recalculateMemberTotal,
    validateCartInput,
    checkTimeBasedClosure
};
