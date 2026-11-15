require("dotenv").config({
  path: `.env.${process.env.NODE_ENV || "development"}`,
});

const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const credentialRoutes = require("./routes/credentialRoutes");
const scriptRoutes = require("./routes/scriptRoutes");
const queryRoutes = require("./routes/queryRoutes");
const commandRoutes = require("./routes/commandRoutes");
const configFileRoutes = require("./routes/configFileRoutes");
const noteRoutes = require("./routes/noteRoutes");
const FondRoutes = require("./routes/fondRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const moduleRoutes = require("./routes/moduleRoutes");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { verifyToken } = require("./utils/authMiddleware");
const { apiLimiter } = require("./utils/rateLimiters");

const app = express();
// Needed so rate limiting sees the real client IP behind a reverse proxy
// (by default: a proxy running on the same machine). Set TRUST_PROXY to a hop
// count (e.g. 1) or an IP/subnet if the proxy runs elsewhere.
const trustProxy = process.env.TRUST_PROXY || "loopback";
app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
app.disable("x-powered-by");
app.use(helmet());
app.use(cookieParser());
const connectDB = require("./config/database");

connectDB();

const corsOptions = {
  origin: ["https://konfigurime.arkiva.gov.al", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(apiLimiter);

app.get("/", (req, res) => {
  res.send("This is working");
});

app.use("/user", userRoutes);
// Everything below requires a logged-in user.
app.use("/credentials", verifyToken, credentialRoutes);
app.use("/scripts", verifyToken, scriptRoutes);
app.use("/queries", verifyToken, queryRoutes);
app.use("/commands", verifyToken, commandRoutes);
app.use("/config-files", verifyToken, configFileRoutes);
app.use("/notes", verifyToken, noteRoutes);
app.use("/fondet", verifyToken, FondRoutes);
app.use("/category", verifyToken, categoryRoutes);
app.use("/module", verifyToken, moduleRoutes);
const PORT = process.env.PORT || 3109;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
