const mongoose = require("mongoose"),
  bcrypt = require("bcryptjs"),
  config = require("./config"),
  User = require("./models/User"),
  Claim = require("./models/Claim");
(async () => {
  await mongoose.connect(config.mongoUri);
  await User.deleteMany({});
  await Claim.deleteMany({});
  const passwordHash = await bcrypt.hash("Password123!", 10);
  await User.create([
    {
      name: "Claims Officer",
      email: "officer@securesure.com",
      passwordHash,
      role: "OFFICER",
    },
    {
      name: "Claims Manager",
      email: "manager@securesure.com",
      passwordHash,
      role: "MANAGER",
    },
  ]);
  await Claim.create([
    {
      claimNumber: "CLM-1001",
      policyNumber: "POL-HEALTH-001",
      customerName: "Ananya Rao",
      claimType: "HEALTH",
      status: "NEW",
      priority: "HIGH",
      incidentDate: "2026-09-12",
      incidentDescription: "Hospitalization for a covered medical procedure.",
      claimedAmount: 85000,
    },
    {
      claimNumber: "CLM-1002",
      policyNumber: "POL-MOTOR-014",
      customerName: "Rahul Shetty",
      claimType: "MOTOR",
      status: "UNDER_REVIEW",
      priority: "MEDIUM",
      incidentDate: "2026-09-20",
      incidentDescription:
        "Vehicle damaged in a road collision. Repair estimate attached.",
      claimedAmount: 145000,
    },
    {
      claimNumber: "CLM-1003",
      policyNumber: "POL-TRAVEL-007",
      customerName: "Meera Nair",
      claimType: "TRAVEL",
      status: "ADDITIONAL_INFO_REQUIRED",
      priority: "LOW",
      incidentDate: "2026-08-28",
      incidentDescription: "Delayed baggage during an international trip.",
      claimedAmount: 22000,
    },
    {
      claimNumber: "CLM-1004",
      policyNumber: "POL-PROPERTY-009",
      customerName: "Vikram Menon",
      claimType: "PROPERTY",
      status: "UNDER_REVIEW",
      priority: "HIGH",
      incidentDate: "2026-09-25",
      incidentDescription:
        "Water damage to insured residential property after a pipe failure.",
      claimedAmount: 310000,
    },
  ]);
  console.log("Seed complete");
  process.exit();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
