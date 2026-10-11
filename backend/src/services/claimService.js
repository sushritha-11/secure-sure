const Claim = require("../models/Claim");
const transitions = {
  NEW: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["ADDITIONAL_INFO_REQUIRED", "APPROVED", "REJECTED"],
  ADDITIONAL_INFO_REQUIRED: ["UNDER_REVIEW"],
  APPROVED: ["SETTLEMENT_IN_PROGRESS"],
  REJECTED: ["CLOSED"],
  SETTLEMENT_IN_PROGRESS: ["CLOSED"],
  CLOSED: [],
};
function validateTransition(a, b) {
  if (!transitions[a]?.includes(b)) {
    const e = new Error(`Invalid status transition: ${a} -> ${b}`);
    e.status = 400;
    throw e;
  }
}
async function updateStatus(id, status) {
  const c = await Claim.findById(id);
  if (!c) {
    const e = new Error("Claim not found");
    e.status = 404;
    throw e;
  }
  validateTransition(c.status, status);
  c.status = status;
  return c.save();
}
module.exports = { transitions, validateTransition, updateStatus };
