import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { bot } from "./bot/telegram.js";
import sendMessageRouter from "./routes/sendMessage.js";
import sendTemplateRouter from "./routes/sendTemplate.js";
import channelRoutes from "./routes/Channel.js";
import { startLocalScheduler, startCronJobs } from "./utils/scheduler.js";

const app = express();
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1000mb" }));
app.use(express.urlencoded({ limit: "1000mb", extended: true }));

// Routes
app.use(sendMessageRouter);
app.use(sendTemplateRouter);
app.use(channelRoutes);

/// Scheduler + CRON
startLocalScheduler(async (msg) => {
  const inlineKeyboard = { inline_keyboard: msg.inlineKeyboard };
  await bot.api.sendPhoto(msg.channelId, msg.imageUrl, {
    caption: msg.caption,
    parse_mode: "HTML",
    reply_markup: inlineKeyboard,
  });
});

startCronJobs();

bot.start().then(() => console.log("🤖 Telegram bot started"));
app.listen(env.PORT, () => console.log(`🚀 Server running on port ${env.PORT}`));