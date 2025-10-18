import { Bot, InlineKeyboard } from "grammy";
import { env } from "../config/env.js";

export const bot = new Bot(env.BOT_TOKEN);
export const Inline = InlineKeyboard;