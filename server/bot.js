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
const token = process.env.BOT_TOKEN;
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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// Keep original size but auto-fix orientation
const processImage = async (buffer) => {
  return sharp(buffer).rotate().toBuffer();
};

// Upload image to Cloudinary
const uploadToCloudinary = async (buffer) => {
  try {
    console.log("Processing image...");
    const processedBuffer = await processImage(buffer);

    console.log("Uploading to Cloudinary...");
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "telegram-bot-images",
          allowed_formats: ["jpg", "jpeg", "png"],
          resource_type: "image",
          overwrite: true,
          use_filename: true,
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload failed:", error);
            reject(error);
          } else {
            console.log("Cloudinary upload success:", result.secure_url);
            resolve(result.secure_url);
          }
        }
      );
      Readable.from(processedBuffer).pipe(stream);
    });

  } catch (error) {
    console.error("Image processing failed:", error);
    throw new Error("Image upload failed.");
  }
};

// Sanitize HTML for Telegram messages
const sanitizeHTMLForTelegram = (html) => {
  if (!html) return "";

  return html
    .replace(/<(\/?)h[1-6]>/g, "") // Remove <h1> to <h6> tags
    .replace(/<p>/g, "") // Remove <p> tags
    .replace(/<\/p>/g, "\n") // Replace </p> with newline
    .replace(/<br\s*\/?>/g, "\n") // Convert <br> tags to newline
    .replace(/<strong[^>]*>/g, "<b>") // Replace <strong> (removes attributes)
    .replace(/<\/strong>/g, "</b>") // Ensure correct closing tag
    .replace(/<em>/g, "<i>") // Convert <em> to <i>
    .replace(/<\/em>/g, "</i>") // Convert </em> to </i>
    .replace(/<\/?span.*?>/g, "") // Remove <span> tags
    .replace(/<\/?div.*?>/g, "") // Remove <div> tags
    .replace(/<\/?u>/g, "") // Remove <u> tags (not supported)
    .replace(/\sstyle=["'][^"']*["']/g, ""); // Remove all inline styles
};



// Bot /start command
bot.command("start", async (ctx) => {
  try {
    const imageUrl = "https://res.cloudinary.com/tusharkalra/image/upload/v1734177107/1080_x_1080_size_Algo_Trading_VIP_Group_iu3lcb.png";
    const imageText = "<b>Advance ALGO Trading start from Monday!👌 \n\n <i>Hurry Up Traders</i></b>";
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
    const sanitizedCaption = sanitizeHTMLForTelegram(caption);
    console.log("Received password:", password);

    if (key !== password) {
      console.log("Unauthorized User");
      return res.status(403).json({ message: "Unauthorized User" });
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
      console.log("Image received:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      imageUrl = await uploadToCloudinary(req.file.buffer);
    }

    if (!sanitizedCaption && !imageUrl) {
      return res.status(400).json({ error: "At least a caption or image is required." });
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
