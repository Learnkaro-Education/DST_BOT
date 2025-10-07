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

const bot = new Bot(token);

// ✅ Express Config
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Scheduled Message Store
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
  try {
    const processedBuffer = await processImage(buffer);

    return await Promise.race([
      new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "telegram-bot-images",
            allowed_formats: ["jpg", "jpeg", "png"],
            resource_type: "image",
            overwrite: true,
            use_filename: true,
          },
          (error, result) => {
            if (error) {
              console.error("❌ Cloudinary upload error:", error);
              return reject(error);
            }
            console.log("✅ Cloudinary upload success:", result.secure_url);
            resolve(result.secure_url);
          }
        );

        // ✅ Pipe + end
        const readStream = Readable.from(processedBuffer);
        readStream.pipe(uploadStream);
        readStream.on("error", reject);
      }),

      // ⏰ Timeout guard (10 seconds)
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Cloudinary upload timeout")), 10000)
      ),
    ]);
  } catch (err) {
    console.error("🚨 uploadToCloudinary failed:", err);
    throw err;
  }
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

// ✅ Smart Send Message
const sendTelegramMessage = async (chatId, caption, imageUrl, inlineKeyboard) => {
  if (!chatId) throw new Error("Invalid chatId");

  const hasImage = imageUrl && /\.(jpg|jpeg|png)$/i.test(imageUrl);

  if (hasImage) {
    await bot.api.sendPhoto(chatId, imageUrl, {
      caption: caption || "",
      parse_mode: "HTML",
      reply_markup: inlineKeyboard,
    });
  } else {
    await bot.api.sendMessage(chatId, caption || " ", {
      parse_mode: "HTML",
      reply_markup: inlineKeyboard,
    });
  }
};

// ✅ CRON Job: Send Scheduled Messages
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
// ✅ MAIN ROUTE: /send-message (Cloudinary)
//
//
// ✅ MAIN ROUTE: /send-message (Cloudinary with Size Check)
//
app.post("/send-message", upload.single("image"), async (req, res) => {
  try {
    const { caption, buttons, password, scheduleTime, channel } = req.body;

    // 🔐 Password check
    if (key !== password) {
      return res.status(403).json({ message: "Unauthorized User" });
    }

    // 🎯 Parse channels
    let selectedChannels = [];
    try {
      selectedChannels = JSON.parse(channel);
    } catch {
      selectedChannels = [channel];
    }

    const targetChannelIds = selectedChannels.map((ch) => channelMap[ch]).filter(Boolean);
    if (targetChannelIds.length === 0)
      return res.status(400).json({ message: "No valid channels selected." });

    // 🔘 Buttons
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

    // 🧼 Sanitize caption
    const sanitizedCaption = sanitizeHTMLForTelegram(caption);

    // 🖼 Handle image
    let imageUrl = null;
    if (req.file) {
      const sizeMB = req.file.size / (1024 * 1024);
      console.log(`📏 Uploaded image size: ${sizeMB.toFixed(2)} MB`);

      // 🚫 Reject >30 MB
      if (sizeMB > 30) {
        return res
          .status(400)
          .json({ message: "Image too large. Maximum allowed size is 30 MB." });
      }

      // 🔄 Optional compression for >10 MB
      if (sizeMB > 10) {
        console.log("🗜 Compressing large image before upload...");
        req.file.buffer = await sharp(req.file.buffer)
          .jpeg({ quality: 80 })
          .resize({ width: 1920, withoutEnlargement: true })
          .toBuffer();
      }

      console.log("🖼 Uploading to Cloudinary...");
      imageUrl = await uploadToCloudinary(req.file.buffer);
      console.log("✅ Uploaded:", imageUrl);
    }

    // 🧱 Validate content
    if (!sanitizedCaption && !imageUrl && parsedButtons.length === 0)
      return res.status(400).json({ message: "Please provide caption, image, or button." });

    // 🕓 Schedule or send now
    if (scheduleTime) {
      const sendAt = new Date(scheduleTime);
      targetChannelIds.forEach((chatId) =>
        scheduledMessages.push({
          id: Date.now() + Math.random(),
          caption: sanitizedCaption,
          imageUrl,
          inlineKeyboard: inlineKeyboard.inline_keyboard,
          sendAt: sendAt.toISOString(),
          channelId: chatId,
        })
      );
      saveScheduledMessages(scheduledMessages);
      return res.json({ message: "Message scheduled successfully!" });
    }

    // 🚀 Immediate send
    for (const chatId of targetChannelIds) {
      await sendTelegramMessage(chatId, sanitizedCaption, imageUrl, inlineKeyboard);
      console.log(`✅ Message sent to ${chatId}`);
    }

    res.json({ message: "Message sent successfully!" });
  } catch (err) {
    console.error("❌ /send-message error:", err);
    res.status(500).json({
      message:
        err.message || "Something went wrong while sending the message.",
    });
  }
});


//
// 🧩 Template Route (Keep As Is)
//
app.post("/send-template", async (req, res) => {
  try {
    const { template, channels, password } = req.body;
    if (key !== password)
      return res.status(403).json({ message: "Unauthorized User" });

    // 🧭 Parse Channels
    let selectedChannels = [];
    try {
      selectedChannels = Array.isArray(channels)
        ? channels
        : JSON.parse(channels);
    } catch {
      selectedChannels = [channels];
    }

    const targetChannelIds = selectedChannels
      .map((ch) => channelMap[ch])
      .filter(Boolean);

    if (!targetChannelIds.length)
      return res
        .status(400)
        .json({ message: "No valid channels selected." });

    // ⚙️ Define templates here
    let caption = "";
    let imageUrl = "";
    let inlineKeyboard = new InlineKeyboard();

    // 🧩 Switch by template name
    switch (template) {
      case "template1":
        caption = `<b>Next HERO ZERO Trading Plan is ready!</b>\nI am NOW adding new Traders in AI Scalping BOT! 👇👇`;
        imageUrl =
          "https://algotradingbucketassest.s3.ap-south-1.amazonaws.com/DSTBOT-Folder/photo_2025-10-01_12-32-34.jpg";
        inlineKeyboard
          .row({
            text: "❤️ Step 1) Join VIP Group",
            url: "https://www.dilsetrader.in/subscriptions/telegram-bot?code=INTRADAY",
          })
          .row({
            text: "✅ Step 2) Open Dhan A/c",
            url: "https://invite.dhan.co/?join=GOKULJI",
          })
          .row({
            text: "📌 Step 3) Connect Algo",
            url: "https://t.me/Auto_Trade_VIP_Bot?start=join",
          });
        break;
      case "template2":
        caption = `<b>AI Scalper Bot is ACTIVE NOW!! Make Sure you are logged in for Smooth Trading Experience!</b>\n\nNext TRADING PLAN is ready 🔥 🔥 Be ready for AUTO-Trading!\nJust follow 2 steps! 👇`;
        imageUrl =
          "https://algotradingbucketassest.s3.ap-south-1.amazonaws.com/DSTBOT-Folder/CONNECT+YOUR+BROKER.png";
        inlineKeyboard
          .row({
            text: "📌 Step 1) Open Dhan A/c",
            url: "https://invite.dhan.co/?join=GOKULJI",
          })
          .row({
            text: "✅ Step 2) Connect Your Broker",
            url: "https://t.me/Auto_Trade_VIP_Bot?start=join",
          })
        break;

      case "template3":
        caption = `<b>AI SCALPER OFFER ACTIVATED!</b>\n\n 🚀 LIMITED Seats only: https://www.dilsetrader.in/subscriptions/telegram-bot?code=INTRADAY`;
        imageUrl =
          "https://algotradingbucketassest.s3.ap-south-1.amazonaws.com/DSTBOT-Folder/photo_2025-10-06_12-43-18.jpg";
        inlineKeyboard
          .row({
            text: "✅ 75% Discount Link ",
            url: "https://www.dilsetrader.in/subscriptions/telegram-bot?code=INTRADAY",
          })
          .row({
            text: "📌 Complete VIP Package",
            url: "https://www.dilsetrader.in/subscriptions/vip?code=VIP90",
          });
        break;

      default:
        return res
          .status(400)
          .json({ message: "Invalid template selected." });
    }

    // 🚀 Send to all selected channels
    for (const chatId of targetChannelIds) {
      try {
        await bot.api.sendPhoto(chatId, imageUrl, {
          caption,
          parse_mode: "HTML",
          reply_markup: inlineKeyboard,
        });
        console.log(` Sent ${template} to ${chatId}`);
      } catch (err) {
        console.error(
          `❌ Failed to send ${template} to ${chatId}:`,
          err.response?.description || err.message
        );
      }
    }

    res.json({ message: `${template} sent successfully!` });
  } catch (err) {
    console.error("❌ /send-template error:", err);

    if (err?.message?.includes("File size too large")) {
      return res.status(400).json({
        message: "🖼️ Image too large! Please upload an image under 10 MB.",
      });
    }

    return res.status(500).json({
      message: err.message || "Something went wrong while sending template.",
    });
  }
});

//
// 🚀 Start Bot + Server
//
bot.start().then(() => console.log("🤖 Bot started successfully"));
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
