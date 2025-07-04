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

const app = express();
const port = process.env.PORT || 3000;
const token = process.env.BOT_TOKEN;
const channelId = process.env.CHANNEL_ID;
const key = process.env.PASSWORD;

if (!token || !channelId) {
  console.error("BOT_TOKEN and CHANNEL_ID are required in the .env file.");
  process.exit(1);
}

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

const scheduledPath = path.join(__dirname, "scheduled.json");

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

const sanitizeHTMLForTelegram = (html) => {
  if (!html) return "";
  return html
    .replace(/<(\/?)h[1-6]>/g, "")
    .replace(/<p>/g, "")
    .replace(/<\/p>/g, "\n")
    .replace(/<br\s*\/?>(?!<)/g, "\n")
    .replace(/<strong[^>]*>/g, "<b>")
    .replace(/<\/strong>/g, "</b>")
    .replace(/<em>/g, "<i>")
    .replace(/<\/em>/g, "</i>")
    .replace(/<\/?span.*?>/g, "")
    .replace(/<\/?div.*?>/g, "")
    .replace(/<\/?u>/g, "")
    .replace(/\sstyle=["'][^"']*["']/g, "");
};

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

setInterval(async () => {
  const now = new Date();

  for (let i = scheduledMessages.length - 1; i >= 0; i--) {
    const msg = scheduledMessages[i];
    if (new Date(msg.sendAt) <= now) {
      try {
        console.log("Sending scheduled message:", msg);
        const keyboard = InlineKeyboard.from(msg.inlineKeyboard || []);
        await sendTelegramMessage(channelId, msg.caption, msg.imageUrl, keyboard);
        scheduledMessages.splice(i, 1);
        saveScheduledMessages(scheduledMessages);
      } catch (err) {
        console.error("Scheduled send failed:", err);
      }
    }
  }
}, 10000);

app.post("/send-message", upload.single("image"), async (req, res) => {
  try {
    const { caption, buttons, password, scheduleTime } = req.body;
    const sanitizedCaption = sanitizeHTMLForTelegram(caption);

    if (key !== password) return res.status(403).json({ message: "Unauthorized User" });

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

    if (scheduleTime) {
      const sendAt = new Date(scheduleTime);
      const scheduled = {
        id: Date.now(),
        caption: sanitizedCaption,
        imageUrl,
        inlineKeyboard: inlineKeyboard.inline_keyboard,
        sendAt: sendAt.toISOString(),
      };
      scheduledMessages.push(scheduled);
      saveScheduledMessages(scheduledMessages);
      return res.status(200).json({ message: "Message scheduled successfully!" });
    }

    await sendTelegramMessage(channelId, sanitizedCaption, imageUrl, inlineKeyboard);
    res.status(200).json({ message: "Message sent successfully!" });
  } catch (err) {
    console.error("/send-message error:", err);
    res.status(500).json({ error: "Failed to send message." });
  }
});

app.get("/scheduled-messages", (req, res) => {
  const filtered = scheduledMessages.map(({ id, caption, sendAt }) => ({
    id,
    caption,
    sendAt,
  }));
  res.json(filtered);
});

app.delete("/scheduled-messages/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = scheduledMessages.findIndex((msg) => msg.id === id);
  if (index === -1) return res.status(404).json({ message: "Message not found" });

  scheduledMessages.splice(index, 1);
  saveScheduledMessages(scheduledMessages);
  res.status(200).json({ message: "Message deleted" });
});

bot.start().then(() => console.log("Bot started successfully."));
app.listen(port, () => console.log(`Server running on port ${port}`));
