const express = require("express"),
  http = require("http"),
  cors = require("cors"),
  mongoose = require("mongoose"),
  { Server } = require("socket.io"),
  config = require("./config");
const app = express(),
  server = http.createServer(app),
  io = new Server(server, { cors: { origin: config.clientUrl } });
app.set("io", io);
app.use(cors({ origin: config.clientUrl }));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static("uploads"));
app.get("/health", (q, s) =>
  s.json({
    status: "ok",
    service: "securesure-backend",
    timestamp: new Date().toISOString(),
  }),
);
app.use("/auth", require("./routes/auth"));
app.use("/api/claims", require("./routes/claims"));
app.use("/api/policies", require("./routes/policies"));
app.use(require("./middleware/errorHandler"));
io.on("connection", (s) => console.log("[SOCKET] connected", s.id));
mongoose
  .connect(config.mongoUri)
  .then(() =>
    server.listen(config.port, () =>
      console.log(`SecureSure backend on ${config.port}`),
    ),
  )
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
