const r = require("express").Router();
const { login } = require("../controllers/authController");
r.post("/login", login);
module.exports = r;
