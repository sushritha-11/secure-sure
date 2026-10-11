const r = require("express").Router(),
  multer = require("multer"),
  fs = require("fs"),
  path = require("path");
const auth = require("../middleware/auth"),
  c = require("../controllers/claimController");
const dir = path.join(__dirname, "../../uploads");
fs.mkdirSync(dir, { recursive: true });
const upload = multer({ dest: dir, limits: { fileSize: 10 * 1024 * 1024 } });
r.use(auth);
r.get("/", c.list);
r.get("/:id", c.one);
r.patch("/:id/status", c.status);
r.post("/:id/documents", upload.single("document"), c.upload);
r.post("/:id/generate-assessment", c.assessment);
module.exports = r;
