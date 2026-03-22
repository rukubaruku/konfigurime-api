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

const app = express();
app.use(helmet());
const connectDB = require("./config/database");

connectDB();

const corsOptions = {
  origin: ["https://konfigurime.arkiva.gov.al", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("This is working");
});

app.use("/user", userRoutes);
app.use("/credentials", credentialRoutes);
app.use("/scripts", scriptRoutes);
app.use("/queries", queryRoutes);
app.use("/commands", commandRoutes);
app.use("/config-files", configFileRoutes);
app.use("/notes", noteRoutes);
app.use("/fondet", FondRoutes);
app.use("/category", categoryRoutes);
app.use("/module", moduleRoutes);
const PORT = process.env.PORT || 3109;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
