const { Bot, InlineKeyboard } = require("grammy");
const sharp = require("sharp");
const express = require("express");
const dotenv = require("dotenv");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { Readable } = require("stream");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

dotenv.config();

// ✅ Map channel keys to .env IDs
const channelMap = {
  main: process.env.CHANNEL_ID,
  PERMIUM_DIL_SE_TRADER: process.env.PERMIUM_DIL_SE_TRADER_SEBI_REGISTRATION,
  MCX_COMM_TRADING: process.env.MCX_COMM_TRADING,
  STOCK_OPTION_VIP: process.env.STOCK_OPTION_VIP_SEBI_REGISTRATION,
  ALGO_TRADING_VIP_PLAN: process.env.ALGO_TRADING_VIP_PLAN,
  VIP_OPTIONS_SELLING: process.env.VIP_OPTIONS_SELLING,
  BTST_VIP_PERMIUM_PLAN: process.env.BTST_VIP_PERMIUM_PLAN,
  INTRADAY_TRADING_PERMIUM_GROUP: process.env.INTRADAY_TRADING_PERMIUM_GROUP,
  ALGO_VIP_GROUP: process.env.ALGO_VIP_GROUP,
  EQUITY_STOCK_INTRADAY_SWING: process.env.EQUITY_STOCK_INTRADAY_SWING,
  DIL_SE_TRADER_CRYPTO: process.env.DIL_SE_TRADER_CRYPTO,
};

const app = express();
const port = process.env.PORT || 3000;
const token = process.env.BOT_TOKEN;
const key = process.env.PASSWORD;

if (!token || !channelMap.main) {
  console.error("❌ BOT_TOKEN and CHANNEL_ID are required in .env");
  process.exit(1);
}

// ✅ Cloudinary Setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Express Config
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage });
const bot = new Bot(token);

// ✅ Scheduled Message Helpers
const scheduledPath = path.join(__dirname, "scheduled_messages.json");

const loadScheduledMessages = () => {
  if (!fs.existsSync(scheduledPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(scheduledPath));
  } catch (e) {
    console.error("❌ Failed to load scheduled messages:", e);
    return [];
  }
};

const saveScheduledMessages = (messages) => {
  fs.writeFileSync(scheduledPath, JSON.stringify(messages, null, 2));
};

let scheduledMessages = loadScheduledMessages();

// ✅ Image Upload
const processImage = async (buffer) => sharp(buffer).rotate().toBuffer();

const uploadToCloudinary = async (buffer) => {
  const processedBuffer = await processImage(buffer);
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "telegram-bot-images",
        allowed_formats: ["jpg", "jpeg", "png"],
        resource_type: "image",
        overwrite: true,
        use_filename: true,
      },
      (error, result) => (error ? reject(error) : resolve(result.secure_url))
    );
    Readable.from(processedBuffer).pipe(stream);
  });
};

// ✅ Clean HTML for Telegram
const sanitizeHTMLForTelegram = (html) => {
  if (!html) return "";
  return html
    .replace(/<(\/?)h[1-6]>/g, "")
    .replace(/<p>/g, "")
    .replace(/<\/p>/g, "\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<strong[^>]*>/g, "<b>")
    .replace(/<\/strong>/g, "</b>")
    .replace(/<em>/g, "<i>")
    .replace(/<\/em>/g, "</i>")
    .replace(/<\/?span.*?>/g, "")
    .replace(/<\/?div.*?>/g, "")
    .replace(/\sstyle=["'][^"']*["']/g, "");
};

// ✅ Send Telegram Message
const sendTelegramMessage = async (chatId, caption, imageUrl, inlineKeyboard) => {
  if (!chatId) throw new Error("chat_id is empty or invalid");

  if (imageUrl && caption) {
    await bot.api.sendPhoto(chatId, imageUrl, {
      caption,
      parse_mode: "HTML",
      reply_markup: inlineKeyboard,
    });
  } else if (imageUrl) {
    await bot.api.sendPhoto(chatId, imageUrl, { reply_markup: inlineKeyboard });
  } else {
    await bot.api.sendMessage(chatId, caption, {
      parse_mode: "HTML",
      reply_markup: inlineKeyboard,
    });
  }
};

// ✅ Cron Job: send scheduled messages every 10s
setInterval(async () => {
  const now = new Date();
  for (let i = scheduledMessages.length - 1; i >= 0; i--) {
    const msg = scheduledMessages[i];
    if (new Date(msg.sendAt) <= now) {
      try {
        console.log("⏰ Sending scheduled message to:", msg.channelId);
        const keyboard = InlineKeyboard.from(msg.inlineKeyboard || []);
        await sendTelegramMessage(msg.channelId, msg.caption, msg.imageUrl, keyboard);
        scheduledMessages.splice(i, 1);
        saveScheduledMessages(scheduledMessages);
      } catch (err) {
        console.error("❌ Scheduled send failed:", err);
      }
    }
  }
}, 10000);

//
// ✅ MAIN ROUTE: /send-message
//
app.post("/send-message", upload.single("image"), async (req, res) => {
  try {
    const { caption, buttons, password, scheduleTime, channel } = req.body;

    if (key !== password) {
      return res.status(403).json({ message: "Unauthorized User" });
    }

    // 🧭 Parse channels (frontend sends JSON array)
    let selectedChannels = [];
    try {
      selectedChannels = JSON.parse(channel);
    } catch {
      selectedChannels = [channel];
    }

    // ✅ Map channel names to IDs
    const targetChannelIds = selectedChannels
      .map((ch) => channelMap[ch])
      .filter(Boolean);

    console.log("✅ Selected Channels:", selectedChannels);
    console.log("🎯 Target Channel IDs:", targetChannelIds);

    if (targetChannelIds.length === 0) {
      return res.status(400).json({ message: "No valid channels selected." });
    }

    // 🧱 Buttons
    let parsedButtons = [];
    try {
      parsedButtons = JSON.parse(buttons || "[]");
    } catch (err) {
      console.warn("⚠️ Button parse error:", err);
    }

    const inlineKeyboard = new InlineKeyboard();
    parsedButtons.forEach((btn) => {
      if (btn.text && btn.url) inlineKeyboard.row({ text: btn.text, url: btn.url });
    });

    const sanitizedCaption = sanitizeHTMLForTelegram(caption);
    let imageUrl = null;
    if (req.file) imageUrl = await uploadToCloudinary(req.file.buffer);

    if (!sanitizedCaption && !imageUrl) {
      return res.status(400).json({ message: "Please provide a caption or image." });
    }

    // 🕓 Schedule Message
    if (scheduleTime) {
      const sendAt = new Date(scheduleTime);
      const scheduledArray = targetChannelIds.map((chatId) => ({
        id: Date.now() + Math.floor(Math.random() * 1000000),
        caption: sanitizedCaption,
        imageUrl,
        inlineKeyboard: inlineKeyboard.inline_keyboard,
        sendAt: sendAt.toISOString(),
        channelId: chatId,
      }));

      scheduledMessages.push(...scheduledArray);
      saveScheduledMessages(scheduledMessages);

      console.log("📅 Scheduled for:", scheduledArray.map((s) => s.channelId));
      return res.status(200).json({ message: "Message scheduled successfully!" });
    }

    // 🚀 Send Immediately
    for (const chatId of targetChannelIds) {
      try {
        await sendTelegramMessage(chatId, sanitizedCaption, imageUrl, inlineKeyboard);
        console.log(`✅ Message sent to [${chatId}]`);
      } catch (err) {
        console.error(`❌ Failed to send message to [${chatId}]`, err);
      }
    }

    return res.status(200).json({ message: "Message sent successfully!" });
  } catch (err) {
  console.error("❌ /send-message error:", err);

  // 🧠 Detect Timeout (Grammy 499)
  if (err.http_code === 499 || err.name === "TimeoutError" || err.message?.includes("Timeout")) {
    return res.status(504).json({ message: "Request Timeout. Please try again." });
  }

  // 🧠 Fallback
  return res.status(500).json({ message: "Something went wrong. Please try again." });
}

});

//
// 🗓 View Scheduled Messages
//
app.get("/scheduled-messages", (req, res) => {
  const filtered = scheduledMessages.map(({ id, caption, sendAt }) => ({
    id,
    caption,
    sendAt,
  }));
  res.json(filtered);
});

//
// ❌ Delete Scheduled Message
//
app.delete("/scheduled-messages/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = scheduledMessages.findIndex((msg) => msg.id === id);
  if (index === -1) return res.status(404).json({ message: "Message not found" });

  scheduledMessages.splice(index, 1);
  saveScheduledMessages(scheduledMessages);
  res.status(200).json({ message: "Message deleted" });
});

// ✅ Start Bot + Server
bot.start().then(() => console.log("🤖 Bot started successfully"));
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
