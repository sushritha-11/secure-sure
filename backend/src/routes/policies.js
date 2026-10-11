const r = require("express").Router();
const auth = require("../middleware/auth");
const { search } = require("../controllers/policyController");
r.get("/search", auth, search);
module.exports = r;
