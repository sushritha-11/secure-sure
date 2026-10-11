const Claim = require("../models/Claim");
const { updateStatus } = require("../services/claimService");
const { generateClaimAssessment } = require("../services/ragService");
async function list(req, res) {
  const { type, status, priority, search } = req.query;
  const f = {};
  if (type) f.claimType = type;
  if (status) f.status = status;
  if (priority) f.priority = priority;
  if (search)
    f.$or = [
      { claimNumber: new RegExp(search, "i") },
      { policyNumber: new RegExp(search, "i") },
      { customerName: new RegExp(search, "i") },
    ];
  res.json(await Claim.find(f).sort({ createdAt: -1 }).limit(500));
}
async function one(req, res) {
  const c = await Claim.findById(req.params.id);
  if (!c) return res.status(404).json({ message: "Claim not found" });
  res.json(c);
}
async function status(req, res) {
  const c = await updateStatus(req.params.id, req.body.status);
  req.app
    .get("io")
    .emit("claim:status-changed", {
      claimId: c._id.toString(),
      claimNumber: c.claimNumber,
      status: c.status,
      changedBy: req.user.name,
    });
  res.json(c);
}
async function upload(req, res) {
  const c = await Claim.findById(req.params.id);
  if (!c) return res.status(404).json({ message: "Claim not found" });
  if (!req.file)
    return res.status(400).json({ message: "Document is required" });
  c.supportingDocuments.push({
    originalName: req.file.originalname,
    storedName: req.file.filename,
    path: req.file.path,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
  await c.save();
  res
    .status(201)
    .json({
      message: "Document uploaded",
      document: c.supportingDocuments.at(-1),
    });
}
async function assessment(req, res) {
  const c = await Claim.findById(req.params.id);
  if (!c) return res.status(404).json({ message: "Claim not found" });
  const r = await generateClaimAssessment(c);
  c.assessmentSummary = r.assessment;
  await c.save();
  res.json(r);
}
module.exports = { list, one, status, upload, assessment };
