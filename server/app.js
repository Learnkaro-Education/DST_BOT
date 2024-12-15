const express = require("express");
const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

const PORT = process.env.PORT || 3000;

module.exports = { app };
