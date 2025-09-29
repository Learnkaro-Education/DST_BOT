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

// Map channel names to environment values
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
  console.error("BOT_TOKEN and CHANNEL_ID_MAIN are required in the .env file.");
  process.exit(1);
}

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });
const bot = new Bot(token);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

// Scheduled messages load/save

const scheduledPath=path.join(__dirname,'scheduled_messages.json');
const loadScheduledMessages = () => {
  if (!fs.existsSync(scheduledPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(scheduledPath));
  } catch (e) {
    console.error("Failed to load scheduled messages:", e);
    return [];
  }
};

const saveScheduledMessages = (messages) => {
  fs.writeFileSync(scheduledPath, JSON.stringify(messages, null, 2));
};

let scheduledMessages = loadScheduledMessages();

// Image upload to Cloudinary
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

// Telegram-safe HTML
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
    .replace(/<\/?u>/g, "")
    .replace(/\sstyle=["'][^"']*["']/g, "");
};

console.log("Selected Channels:", selectedChannels);
console.log("Target Channel IDs:", targetChannelIds);

// Send to Telegram
const sendTelegramMessage = async (chatId, caption, imageUrl, inlineKeyboard) => {
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

// Scheduled job every 10 seconds
setInterval(async () => {
  const now = new Date();

  for (let i = scheduledMessages.length - 1; i >= 0; i--) {
    const msg = scheduledMessages[i];
    if (new Date(msg.sendAt) <= now) {
      try {
        console.log("⏰ Sending scheduled message to:", msg.channelId);
        const keyboard = InlineKeyboard.from(msg.inlineKeyboard || []);
        await sendTelegramMessage(msg.channelId || channelMap["main"], msg.caption, msg.imageUrl, keyboard);
        scheduledMessages.splice(i, 1);
        saveScheduledMessages(scheduledMessages);
      } catch (err) {
        console.error("❌ Scheduled send failed:", err);
      }
    }
  }
}, 10000);

// Main send endpoint
app.post("/send-message", upload.single("image"), async (req, res) => {
  try {
    const { caption, buttons, password, scheduleTime, channel } = req.body;
    const sanitizedCaption = sanitizeHTMLForTelegram(caption);

    if (key !== password) return res.status(403).json({ message: "Unauthorized User" });

    const isAllChannels = channel === "ALL";
    const targetChannelIds = isAllChannels ? Object.values(channelMap) : [channelMap[channel]];

    let parsedButtons = [];
    try {
      parsedButtons = JSON.parse(buttons || "[]");
    } catch (err) {
      console.warn("Button parse error:", err);
    }

    const inlineKeyboard = new InlineKeyboard();
    parsedButtons.forEach((btn) => {
      if (btn.text && btn.url) inlineKeyboard.row({ text: btn.text, url: btn.url });
    });

    let imageUrl = null;
    if (req.file) imageUrl = await uploadToCloudinary(req.file.buffer);

    if (!sanitizedCaption && !imageUrl) {
      return res.status(400).json({ error: "At least a caption or image is required." });
    }

    // If scheduling
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

      console.log("⏰ Scheduled for channels:", scheduledArray.map(s => s.channelId));
      return res.status(200).json({ message: "Message scheduled successfully!" });
    }

    // Send immediately
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
    console.error("/send-message error:", err);
    return res.status(500).json({ error: "Failed to send message." });
  }
});

// View scheduled messages
app.get("/scheduled-messages", (req, res) => {
  const filtered = scheduledMessages.map(({ id, caption, sendAt }) => ({
    id,
    caption,
    sendAt,
  }));
  res.json(filtered);
});

// Delete scheduled message
app.delete("/scheduled-messages/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = scheduledMessages.findIndex((msg) => msg.id === id);
  if (index === -1) return res.status(404).json({ message: "Message not found" });

  scheduledMessages.splice(index, 1);
  saveScheduledMessages(scheduledMessages);
  res.status(200).json({ message: "Message deleted" });
});

// Start
bot.start().then(() => console.log("🤖 Bot started successfully."));
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
