const { Bot, InlineKeyboard } = require("grammy");
const sharp = require("sharp");
const express = require("express");
const dotenv = require("dotenv");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { Readable } = require("stream");
const cors = require("cors");

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const token = 7040232225:AAFfkh6OCwJIa3HxlSJ_b7bTUbEYotb-6Yg;
const channelId = process.env.CHANNEL_ID;
const key = process.env.PASSWORD;
if (!token || !channelId) {
  console.error("BOT_TOKEN and CHANNEL_ID are required in the .env file.");
  process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create a new instance of the Bot class
const bot = new Bot(token);

// Middleware to parse JSON requests
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// Utility function to upload an image to Cloudinary
const uploadToCloudinary = async (buffer) => {
  try {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "telegram-bot-images",
          allowed_formats: ["jpg", "jpeg", "png"],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      Readable.from(buffer).pipe(stream);
    });
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    throw new Error("Image upload failed.");
  }
};

// Sanitize HTML for Telegram messages
const sanitizeHTMLForTelegram = (html) => {
  return html.replace(/<p>/g, "").replace(/<\/p>/g, "\n").replace(/<br>/g, "");
};

// Bot /start command
bot.command("start", async (ctx) => {
  try {
    const imageUrl =
      "https://res.cloudinary.com/tusharkalra/image/upload/v1734177107/1080_x_1080_size_Algo_Trading_VIP_Group_iu3lcb.png";

    const imageText =
      "<b>Advance ALGO Trading start from Monday!👌 \n\n <i>Hurry Up Traders</i></b>";

    const enrollUrl = "https://dilsetrader.com/g/DqZnCfOZ35?code=ALGO60";
    const knowMore = "https://yt.openinapp.co/qdd7v";

    const inlineKeyboard = new InlineKeyboard()
      .row({ text: "Register Now 👍", url: enrollUrl })
      .row({ text: "Know More 📈", url: knowMore });

    await ctx.replyWithPhoto(imageUrl, {
      caption: imageText,
      parse_mode: "HTML",
      reply_markup: inlineKeyboard,
    });
  } catch (error) {
    console.error("Error in /start command:", error);
  }
});

// Endpoint to send messages
app.post("/send-message", upload.single("image"), async (req, res) => {
  try {
    const { caption, buttons, password } = req.body;
    const sanitizedCaption = caption ? sanitizeHTMLForTelegram(caption) : null;
    console.log(password);
    console.log(key);

    if (key !== password) {
      console.log("cannot send message");
      return res.status(403).json({ message: "unauthorized User" });
    }
    let parsedButtons = [];
    if (buttons) {
      try {
        parsedButtons = JSON.parse(buttons);
      } catch (error) {
        console.warn("Error parsing buttons JSON:", error);
      }
    }

    const inlineKeyboard = new InlineKeyboard();
    parsedButtons.forEach((button) => {
      if (button.text && button.url) {
        inlineKeyboard.row({ text: button.text, url: button.url });
      }
    });

    let imageUrl = null;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      imageUrl = uploadResult.secure_url;
    }

    if (!sanitizedCaption && !imageUrl) {
      return res
        .status(400)
        .json({ error: "At least a caption or image is required." });
    }

    if (imageUrl && sanitizedCaption) {
      await bot.api.sendPhoto(channelId, imageUrl, {
        caption: sanitizedCaption,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      });
    } else if (imageUrl) {
      await bot.api.sendPhoto(channelId, imageUrl, {
        reply_markup: inlineKeyboard,
      });
    } else {
      await bot.api.sendMessage(channelId, sanitizedCaption, {
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      });
    }

    res.status(200).json({ message: "Message sent successfully!" });
  } catch (error) {
    console.error("Error in /send-message endpoint:", error);
    res.status(500).json({ error: "Failed to send message to the channel." });
  }
});
// Start the bot
bot
  .start()
  .then(() => {
    console.log("Bot started successfully.");
  })
  .catch((error) => {
    console.error("Failed to start the bot:", error);
  });

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
