    // services/channelService.js
    import { Inline, bot } from "../bot/telegram.js";
    import Channel from "../models/Channel.js";

    const TEMPLATES = {
    template1: {
        caption: `<b>Get Ready Traders! Next HERO ZERO Trading Plan is ready!</b>\nI am NOW adding new Traders in AI Scalping BOT! 👇👇`,
        image:
        "https://algotradingbucketassest.s3.ap-south-1.amazonaws.com/DSTBOT-Folder/photo_2025-10-01_12-32-34.jpg",
        buttons: [
        { text: "❤️ Step 1) Join VIP Group", url: "https://www.dilsetrader.in/subscriptions/telegram-bot?code=INTRADAY" },
        { text: "✅ Step 2) Open Dhan A/c", url: "https://invite.dhan.co/?join=GOKULJI" },
        { text: "📌 Step 3) Connect Algo", url: "https://t.me/Auto_Trade_VIP_Bot?start=join" },
        ],
    },

    template2: {
        caption: `<b>AI Scalper Bot is ACTIVE NOW!! Make Sure you are logged in for Smooth Trading Experience!</b>\n\nNext TRADING PLAN is ready 🔥 🔥 Be ready for AUTO-Trading!\nJust follow 2 steps! 👇`,
        image:
        "https://algotradingbucketassest.s3.ap-south-1.amazonaws.com/DSTBOT-Folder/CONNECT+YOUR+BROKER-+premium.png",
        buttons: [
        { text: "📌 Step 1) Open Dhan A/c", url: "https://invite.dhan.co/?join=GOKULJI" },
        { text: "✅ Step 2) Connect Your Broker", url: "https://t.me/Auto_Trade_VIP_Bot?start=join" },
        ],
    },

    template3: {
        caption: `<b>AI SCALPER OFFER ACTIVATED!</b>\n\n🚀 LIMITED Seats only: https://www.dilsetrader.in/subscriptions/telegram-bot?code=INTRADAY`,
        image:
        "https://algotradingbucketassest.s3.ap-south-1.amazonaws.com/DSTBOT-Folder/photo_2025-10-06_12-43-18.jpg",
        buttons: [
        {
            text: "✅ 75% Discount Link",
            url: "https://www.dilsetrader.in/subscriptions/telegram-bot?code=INTRADAY",
        },
        {
            text: "📌 Complete VIP Package",
            url: "https://www.dilsetrader.in/subscriptions/vip?code=VIP90",
        },
        ],
    },

    template4: {
        caption: `<b>CRYPTO LIVE Trade is ACTIVATED!</b>📌 \n\n Follow these 2 Steps! 👇`,
        image:
        "https://algotradingbucketassest.s3.ap-south-1.amazonaws.com/DSTBOT-Folder/(1920+x+1080)+CRYPTO+VIP+Start+Today+Girl.png",
        buttons: [
        { text: "📌 Step 1) Open DELTA A/c", url: "https://www.delta.exchange/?code=GOKULJI" },
        { text: "✅ Step 2) Join CRYPTO VIP", url: "https://t.me/dilsecrypto7" },
        ],
    },
    };

    // -------------------------------------
    // MAIN FUNCTION (NO templates folder needed)
    // -------------------------------------
    export async function sendTemplateDirect(templateName, channelKeys) {
    console.log("Sending Template:", templateName);
    console.log("Requested Channels:", channelKeys);

    const tpl = TEMPLATES[templateName];
    if (!tpl) throw new Error("Unknown template: " + templateName);

    // Fetch chat_ids from DB
    const channels = await Channel.findAll({
        where: { code: channelKeys }
    });

    const chatIds = channels.map(c => c.channel_id);
    console.log("Resolved chatIds:", chatIds);

    // Prepare Inline Keyboard
    const keyboard = new Inline();
    tpl.buttons.forEach(b => keyboard.row(b));

    // Send to all channels
    for (const chatId of chatIds) {
        await bot.api.sendPhoto(chatId, tpl.image, {
        caption: tpl.caption,
        parse_mode: "HTML",
        reply_markup: keyboard
        });

        console.log(`✔ Sent ${templateName} to ${chatId}`);
    }

    return true;
    }