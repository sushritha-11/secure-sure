const { searchPolicies } = require("../services/policyService");
async function search(req, res) {
  if (!req.query.q) return res.status(400).json({ message: "q is required" });
  res.json(await searchPolicies(req.query.q, 10));
}
module.exports = { search };
