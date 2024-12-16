const { Bot, InlineKeyboard } = require("grammy");
const axios = require("axios");
const express = require("express");
const dotenv = require("dotenv");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { Readable } = require("stream");
const cors = require("cors");

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

// Create a new instance of the Bot class with a custom axios configuration
const bot = new Bot(token, {
  client: new axios.Axios({
    timeout: 10000, // Set timeout to 10 seconds
  }),
});

// Middleware to parse JSON requests
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

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

const sanitizeHTMLForTelegram = (html) => {
  return html
    .replace(/<p>/g, "") // Remove opening <p> tags
    .replace(/<\/p>/g, "\n")// Replace closing </p> tags with newlines
  .replace(/<br>/g, "\n"); // Replace <br> tags with newlines
};

app.post("/send-message", upload.single("image"), async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    console.log("Uploaded File:", req.file);

    const { caption, buttons } = req.body;

    // Sanitize caption to remove unsupported HTML tags
    const sanitizedCaption = sanitizeHTMLForTelegram(caption);
    console.log("Sanitized Caption:", sanitizedCaption);

    if (!req.file) {
      return res.status(400).json({ error: "Image file is required." });
    }

    if (!sanitizedCaption) {
      return res.status(400).json({ error: "Caption is required." });
    }

    let parsedButtons;
    try {
      parsedButtons = JSON.parse(buttons); // Parse buttons from JSON string
    } catch (err) {
      return res
        .status(400)
        .json({ error: "Buttons must be a valid JSON array." });
    }

    if (!Array.isArray(parsedButtons)) {
      return res.status(400).json({ error: "Buttons must be an array." });
    }

    console.log("Parsed Buttons:", parsedButtons);

    // Upload image to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer);
    const imageUrl = uploadResult.secure_url;
    console.log("Uploaded Image URL:", imageUrl);

    // Build the inline keyboard dynamically
    const inlineKeyboard = new InlineKeyboard();
    parsedButtons.forEach((button) => {
      if (button.text && button.url) {
        inlineKeyboard.row({ text: button.text, url: button.url });
      }
    });
    console.log("Inline Keyboard:", inlineKeyboard);

    // Send the message to the channel
    await sendMessageWithRetry(imageUrl, sanitizedCaption, inlineKeyboard);

    // Delete the image from Cloudinary
    await cloudinary.uploader.destroy(uploadResult.public_id);

    res.status(200).json({ message: "Message sent successfully!" });
  } catch (error) {
    console.error("Failed to send message to channel:", error);
    res.status(500).json({ error: "Failed to send message to the channel." });
  }
});

// Retry logic for sending message
const sendMessageWithRetry = async (imageUrl, caption, inlineKeyboard) => {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      await bot.api.sendPhoto(channelId, imageUrl, {
        caption: caption,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      });
      console.log("Message sent successfully!");
      break; // Exit loop if successful
    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt >= maxRetries) {
        console.error("Max retries reached. Failed to send message.");
        throw error; // Rethrow error if max retries are reached
      }
      // Optionally add a delay before retrying
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
};

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
