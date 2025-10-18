// routes/sendMessage.js 
import express from "express";
import multer from "multer";
import sharp from "sharp";
import { env } from "../config/env.js";
import { uploadToCloudinary } from "../utils/image.js";
import { sanitizeHTMLForTelegram } from "../utils/sanitize.js";
import { Inline, bot } from "../bot/telegram.js";
import { loadScheduledMessages, saveScheduledMessages } from "../utils/scheduler.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
let scheduledMessages = loadScheduledMessages();

router.post("/send-message", upload.single("image"), async (req, res) => {
  try {
    const { caption, buttons, password, scheduleTime, channel } = req.body;
    if (password !== env.PASSWORD) return res.status(403).json({ message: "Unauthorized User" });

    let selectedChannels = [];
    try {
      selectedChannels = JSON.parse(channel);
    } catch {
      selectedChannels = [channel];
    }

    const chatIds = selectedChannels.map((c) => env.CHANNELS[c]).filter(Boolean);
    if (!chatIds.length) return res.status(400).json({ message: "No valid channels selected" });

    let parsedButtons = [];
    try {
      parsedButtons = JSON.parse(buttons || "[]");
    } catch (err) {
      console.warn("⚠️ Button parse error:", err);
    }

    const inlineKeyboard = new Inline();
    parsedButtons.forEach((b) => b.text && b.url && inlineKeyboard.row(b));

        //  Sanitize caption
    const sanitizedCaption = sanitizeHTMLForTelegram(caption);
    let imageUrl = null;

    if (req.file) {
      const sizeMB = req.file.size / (1024 * 1024);
      console.log(`📏 Uploaded image size: ${sizeMB.toFixed(2)} MB`);
    //   Reject >30 MB
      if (sizeMB > 1000)
        return res.status(400).json({ message: "Image too large (max 1000MB)" });

    //   Optional compression for > 10 MB 
      if (sizeMB > 10)
      {
              console.log("🗜 Compressing image before upload...");
        req.file.buffer = await sharp(req.file.buffer)
          .jpeg({ quality: 80 })
          .resize({ width: 1920, withoutEnlargement: true })
          .toBuffer();
      }
        
      console.log("🖼 Uploading to Cloudinary...");
      imageUrl = await uploadToCloudinary(req.file.buffer);
      console.log("✅ Uploaded:", imageUrl);
    }

    //  Validate content
    if (!sanitizedCaption && !imageUrl && parsedButtons.length === 0)
      return res.status(400).json({ message: "Please provide caption, image, or button." });

    // Schedule or send now
    if (scheduleTime) {
  const sendAt = new Date(scheduleTime);

  // 🧠 Always reload from disk before writing
  const currentMessages = loadScheduledMessages();

  chatIds.forEach((chatId) =>
    currentMessages.push({
      id: Date.now() + Math.random(),
      caption: sanitizedCaption,
      imageUrl,
      inlineKeyboard: inlineKeyboard.inline_keyboard,
      sendAt: sendAt.toISOString(),
      channelId: chatId,
    })
  );

  saveScheduledMessages(currentMessages);
  return res.json({ message: "Message scheduled successfully!" });
}

 //  Immediate send
    for (const chatId of chatIds) {
      await bot.api.sendPhoto(chatId, imageUrl, {
        caption: sanitizedCaption,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      });
    }

    res.json({ message: "Message sent successfully!" });
  } catch (err) {
    console.error("❌ /send-message error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;