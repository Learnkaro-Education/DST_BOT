import express from "express";
import { sendTemplateDirect } from "../services/channelService.js";
import { env } from "../config/env.js";

const router = express.Router();

router.post("/send-template", async (req, res) => {
  try {
    const { template, channels, password } = req.body;
    if (password !== env.PASSWORD)
      return res.status(403).json({ message: "Unauthorized User" });

     // Parse Channels
    let selectedChannels = [];
    try {
      selectedChannels = Array.isArray(channels) ? channels : JSON.parse(channels);
    } catch {
      selectedChannels = [channels];
    }
    await sendTemplateDirect(template, selectedChannels);
    res.json({ message: `${template} sent successfully!` });
  } catch (err) {
    console.error("❌ /send-template error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
