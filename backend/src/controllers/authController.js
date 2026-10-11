const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { jwtSecret } = require("../config");
async function login(req, res) {
  const { email, password } = req.body;
  const u = await User.findOne({ email: (email || "").toLowerCase() });
  if (!u || !(await bcrypt.compare(password || "", u.passwordHash)))
    return res.status(401).json({ message: "Invalid email or password" });
  const token = jwt.sign(
    { id: u._id.toString(), email: u.email, role: u.role, name: u.name },
    jwtSecret,
    { expiresIn: "8h" },
  );
  res.json({
    token,
    user: { id: u._id, name: u.name, email: u.email, role: u.role },
  });
}
module.exports = { login };
