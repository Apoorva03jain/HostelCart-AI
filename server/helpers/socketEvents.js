/**
 * Socket.IO Event Emitter Helper
 *
 * Centralized helper to emit real-time events to group rooms.
 * The io instance is set once on server startup.
 */

let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const emitToGroup = (groupId, event, data) => {
  if (ioInstance) {
    ioInstance.to(groupId).emit(event, data);
  }
};

// Specific event emitters
const emitMemberJoined = (groupId, member) => {
  emitToGroup(groupId, "member-joined", { groupId, ...member });
};

const emitCartItemAdded = (groupId, data) => {
  emitToGroup(groupId, "cart-item-added", { groupId, ...data });
};

const emitCartItemUpdated = (groupId, data) => {
  emitToGroup(groupId, "cart-item-updated", { groupId, ...data });
};

const emitCartItemRemoved = (groupId, data) => {
  emitToGroup(groupId, "cart-item-removed", { groupId, ...data });
};

const emitPaymentSubmitted = (groupId, data) => {
  emitToGroup(groupId, "payment-submitted", { groupId, ...data });
};

const emitPaymentVerified = (groupId, data) => {
  emitToGroup(groupId, "payment-verified", { groupId, ...data });
};

const emitFeesUpdated = (groupId, data) => {
  emitToGroup(groupId, "fees-updated", { groupId, ...data });
};

const emitGroupClosed = (groupId, data) => {
  emitToGroup(groupId, "group-closed", { groupId, ...data });
};

module.exports = {
  setIO,
  emitToGroup,
  emitMemberJoined,
  emitCartItemAdded,
  emitCartItemUpdated,
  emitCartItemRemoved,
  emitPaymentSubmitted,
  emitPaymentVerified,
  emitFeesUpdated,
  emitGroupClosed,
};
