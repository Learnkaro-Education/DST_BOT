const { Bot, InlineKeyboard } = require("grammy");
const express = require("express");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;

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

// Create a new instance of the Bot class
const bot = new Bot(token);

// Middleware to parse JSON requests
app.use(express.json());

// POST route to upload an image to Cloudinary and send a message
app.post("/send-message", async (req, res) => {
  try {
    const { image, caption, buttons } = req.body;

    if (!image || !caption || !buttons || !Array.isArray(buttons)) {
      return res.status(400).json({ error: "Invalid request payload." });
    }

    // Upload the image to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: "telegram_bot",
    });

    const imageUrl = uploadResponse.secure_url;

    // Build the inline keyboard dynamically
    const inlineKeyboard = new InlineKeyboard();
    buttons.forEach((button) => {
      if (button.text && button.url) {
        inlineKeyboard.row({ text: button.text, url: button.url });
      }
    });

    // Send the message to the channel
    await bot.api.sendPhoto(channelId, imageUrl, {
      caption,
      parse_mode: "HTML",
      reply_markup: inlineKeyboard,
    });

    res.status(200).json({ message: "Message sent successfully!" });
  } catch (error) {
    console.error("Failed to send message to channel:", error);
    res.status(500).json({ error: "Failed to send message to the channel." });
  }
});

// Example /start command for bot interaction
bot.command("start", async (ctx) => {
  await ctx.reply("Welcome! Use the API to send messages dynamically.");
});

// Start the bot
bot.start();
console.log("Bot started");

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
