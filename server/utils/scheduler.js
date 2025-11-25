import fs from "fs";
import path from "path";
import cron from "node-cron";
import { sendTemplateDirect } from "../services/channelService.js";

// ✅ Path for saving scheduled messages
const scheduledPath = path.join(process.cwd(), "scheduled_messages.json");

// ✅ Always read fresh from disk
export const loadScheduledMessages = () => {
  if (!fs.existsSync(scheduledPath)) return [];
  try {
    const data = fs.readFileSync(scheduledPath, "utf8").trim();
    if (!data) return [];
    return JSON.parse(data);
  } catch (err) {
    console.error("❌ Failed to load scheduled messages:", err);
    return [];
  }
};

// ✅ Always overwrite file (not append)
export const saveScheduledMessages = (messages) => {
  try {
    // 🧹 Step 1: remove duplicate IDs (by keeping the first occurrence)
    messages = messages.filter(
      (msg, index, self) =>
        index === self.findIndex((m) => m.id === msg.id)
    );

    // 💾 Step 2: write the cleaned array back to the file
    fs.writeFileSync(
      scheduledPath,
      JSON.stringify(messages, null, 2),
      "utf8"
    );
    console.log(`💾 Saved ${messages.length} scheduled messages.`);
  } catch (err) {
    console.error("❌ Failed to save scheduled messages:", err);
  }
};

// ✅ Local scheduler (runs every 10s just like your setInterval in bot.js)
export const startLocalScheduler = (sendMessageFn) => {
  let scheduledMessages = loadScheduledMessages();

  console.log("🕒 Scheduler started. Monitoring for due messages every 10s...");

  setInterval(async () => {

    // Always reload fresh from file to prevent stale state
  let scheduledMessages = loadScheduledMessages();

    const now = new Date();
    // const nowIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000); // add 5h30m offset

    for (let i = scheduledMessages.length - 1; i >= 0; i--) {
      const msg = scheduledMessages[i];
      // 🚧 Skip invalid entries safely
    if (!msg || !msg.sendAt || !msg.channelId) {
      console.warn("⚠️ Skipping invalid scheduled entry:", msg);
      scheduledMessages.splice(i, 1);
      continue;
    }

      const sendAt = new Date(msg.sendAt);

      if (isNaN(sendAt)) {
      console.warn("⚠️ Skipping bad date for:", msg.id);
      scheduledMessages.splice(i, 1);
      continue;
    }

     // ✅ Compare UTC-to-UTC (no manual +5.5h offset)
     if (now >= sendAt) {
      try {
        console.log(
          `🚀 Sending scheduled message to: ${msg.channelId} | sendAt=${sendAt.toISOString()} | now=${now.toISOString()}`
        );
        await sendMessageFn(msg);
        console.log(`✅ Message sent to ${msg.channelId}`);
        scheduledMessages.splice(i, 1);
        saveScheduledMessages(scheduledMessages);
      } catch (err) {
        console.error("❌ Scheduled send failed:", err.description || err.message);
      }
    }


      // const sendAtIST = new Date(sendAt.getTime()); // interpret sendAt as IST

      // console.log(
      //   `Checking: sendAt(IST)=${sendAtIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} | now(IST)=${nowIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`
      // );

      // // 🔹 Trigger when IST time has passed
      // if (nowIST >= sendAtIST) {
      //   try {
      //     console.log(`🚀 Sending scheduled message to: ${msg.channelId}`);
      //     await sendMessageFn(msg);
      //     console.log(`✅ Message sent to ${msg.channelId}`);
      //     scheduledMessages.splice(i, 1);
      //     saveScheduledMessages(scheduledMessages);
      //   } catch (err) {
      //     console.error("❌ Scheduled send failed:", err.description || err.message);
      //   }
      // }
    }
  }, 10000);
};

// ✅ CRON JOBS (copied exactly from your bot.js)
export const startCronJobs = () => {
  // Template 2 (6:00 PM IST, Sunday–Thursday)
  cron.schedule(
    "0 18 * * 0-4",
    async () => {
      console.log("⏰ [Scheduler Triggered] Sending Template 2 (18:00 IST)");
      try {
        await sendTemplateDirect("template2", [
          "STOCK_OPTION_VIP",
          "PERMIUM_DIL_SE_TRADER",
          "MCX_COMM_TRADING",
          "ALGO_TRADING_VIP_PLAN",
          "BTST_VIP_PERMIUM_PLAN",
          "INTRADAY_TRADING_PERMIUM_GROUP",
          "ALGO_VIP_GROUP",
          "EQUITY_STOCK_INTRADAY_SWING",
          "PROD_MCX",
        ]);
        console.log("✅ [Scheduler] Template 2 sent successfully!");
      } catch (err) {
        console.error(
          "❌ [Scheduler] Failed to send Template 2:",
          err.response?.description || err.message
        );
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  // Template 1 
  cron.schedule(
    "0 18 * * *", // → 6pm AM daily
    async () => {
      console.log("⏰ [Scheduler Triggered] Sending Template 1 (10:30 AM IST)");
      try {
        await sendTemplateDirect("template1", ["main", "PROD_MCX"]);
        console.log("✅ [Scheduler] Template 1 sent successfully!");
      } catch (err) {
        console.error(
          "❌ [Scheduler] Failed to send Template 1:",
          err.response?.description || err.message
        );
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  // Template 4 (10:30 AM IST, Sunday–Friday)
  // cron.schedule(
  //   "0 20 * * 0-5", // 8pM daily
  //   async () => {
  //     console.log("⏰ [Scheduler Triggered] Sending Template 4 (10:30 AM IST)");
  //     try {
  //       await sendTemplateDirect("template4", [
  //         "main",
  //         "DIL_SE_TRADER_CRYPTO",
  //         "PROD_MCX",
  //       ]);
  //       console.log("✅ [Scheduler] Template 4 sent successfully!");
  //     } catch (err) {
  //       console.error(
  //         "❌ [Scheduler] Failed to send Template 4:",
  //         err.response?.description || err.message
  //       );
  //     }
  //   },
  //   { timezone: "Asia/Kolkata" }
  // );
};