const { Bot, InlineKeyboard } = require("grammy");
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

// Function to upload image to Cloudinary
const uploadToCloudinary = (buffer) => {
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
};

// Example /start command for bot interaction
const imageUrl =
  "https://res.cloudinary.com/tusharkalra/image/upload/v1734177107/1080_x_1080_size_Algo_Trading_VIP_Group_iu3lcb.png";

const imageText =
  "<b>Advance ALGO Trading start from Monday!👌 \n\n <i>Hurry Up Traders</i></b>";

const enrollUrl = "https://dilsetrader.com/g/DqZnCfOZ35?code=ALGO60";
const knowMore = "https://yt.openinapp.co/qdd7v";

const inlineKeyboard = new InlineKeyboard()
  .row({ text: "Register Now 👍", url: enrollUrl })
  .row({ text: "Know More 📈", url: knowMore });

bot.command("start", async (ctx) => {
  console.log("Start");
  await ctx.replyWithPhoto(imageUrl, {
    caption: imageText,
    parse_mode: "HTML",
    reply_markup: inlineKeyboard,
  });
});

const sanitizeHTMLForTelegram = (html) => {
  return html
    .replace(/<p>/g, "") // Remove opening <p> tags
    .replace(/<\/p>/g, "\n") // Replace closing </p> tags with newlines
    .replace(/<br>/g, "\n"); // Replace <br> tags with newlines
};

app.post("/send-message", upload.single("image"), async (req, res) => {
  try {
    console.log("Request Body:", req.body); // Log the entire body
    console.log("Uploaded File:", req.file); // Log the uploaded file

    const { caption, buttons } = req.body;

    // Sanitize caption to remove unsupported HTML tags
    const sanitizedCaption = caption ? sanitizeHTMLForTelegram(caption) : null;
    console.log("Sanitized Caption:", sanitizedCaption);

    // Check if image is provided, if not, set isImage to false
    const isImage = req.file ? true : false;

    // Check if buttons are provided, if not, set buttons to empty array
    let parsedButtons = [];
    if (buttons) {
      try {
        parsedButtons = JSON.parse(buttons); // Parse buttons from JSON string
      } catch (err) {
        console.log("Error parsing buttons:", err);
      }
    }

    console.log("Parsed Buttons:", parsedButtons);

    // Build the inline keyboard dynamically if buttons are present
    const inlineKeyboard = new InlineKeyboard();
    parsedButtons.forEach((button) => {
      if (button.text && button.url) {
        inlineKeyboard.row({ text: button.text, url: button.url });
      }
    });

    // If no image and no caption, return error
    if (!sanitizedCaption && !isImage) {
      return res
        .status(400)
        .json({ error: "At least a caption or image is required." });
    }

    let imageUrl = null;
    if (isImage) {
      // Upload image to Cloudinary if image is provided
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      imageUrl = uploadResult.secure_url;
      console.log("Uploaded Image URL:", imageUrl);
    }

    // Send the message to the channel based on the content provided
    if (isImage && sanitizedCaption) {
      // Send message with both image and caption
      await bot.api.sendPhoto(channelId, imageUrl, {
        caption: sanitizedCaption,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      });
    } else if (isImage) {
      // Send message with image only (no caption)
      await bot.api.sendPhoto(channelId, imageUrl, {
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      });
    } else if (sanitizedCaption) {
      // Send message with text only (no image)
      await bot.api.sendMessage(channelId, sanitizedCaption, {
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      });
    }

    console.log("Message sent successfully!");

    // If image was uploaded, delete it from Cloudinary
    if (isImage) {
      await cloudinary.uploader.destroy(uploadResult.public_id);
    }

    res.status(200).json({ message: "Message sent successfully!" });
  } catch (error) {
    console.error("Failed to send message to channel:", error);
    res.status(500).json({ error: "Failed to send message to the channel." });
  }
});

// Start the bot
bot.start();
console.log("Bot started");

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
