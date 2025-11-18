import dotenv from "dotenv";
dotenv.config();

export const env ={
    BOT_TOKEN: process.env.BOT_TOKEN,
    PASSWORD:process.env.PASSWORD,
    PORT:process.env.PORT || 3000,
    CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
    CLOUDINARY:{
         CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        API_KEY: process.env.CLOUDINARY_API_KEY,
        API_SECRET: process.env.CLOUDINARY_API_SECRET,
    },
    CHANNELS:{
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
    DAILY_BTST: process.env.DAILY_BTST,
    PROD_MCX: process.env.PROD_MCX,
    CRYPTO_VIP: process.env.CRYPTO_VIP,
    MCX_BY_GOKUL_CHHABRA: process.env.MCX_BY_GOKUL_CHHABRA,
    MONTHLY_EXPIRY: process.env.MONTHLY_EXPIRY,
    }
};

if (!env.BOT_TOKEN || !env.CHANNELS.main) {
  console.error("❌ Missing BOT_TOKEN or main CHANNEL_ID in .env");
  process.exit(1);
}