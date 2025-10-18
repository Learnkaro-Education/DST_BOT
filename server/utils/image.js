// utils/Image.js 
import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";
import sharp from "sharp";

export const uploadToCloudinary = async (buffer) => {
  try {
    // 🧮 Step 1: log and check original size
    let sizeMB = buffer.length / (1024 * 1024);
    console.log(`📏 Original image size: ${sizeMB.toFixed(2)} MB`);

    // 🚫 Step 2: Hard-limit 50 MB (safety net)
    if (sizeMB > 50) {
      throw new Error("Image too large to upload (> 50 MB).");
    }

    // 🗜 Step 3: compress automatically if > 9 MB (Cloudinary limit ~10 MB)
    if (sizeMB > 9) {
      console.log("🗜 Compressing image before Cloudinary upload...");
      buffer = await sharp(buffer)
        .jpeg({ quality: 80 })
        .resize({ width: 1920, withoutEnlargement: true })
        .toBuffer();
      sizeMB = buffer.length / (1024 * 1024);
      console.log(`✅ Compressed size: ${sizeMB.toFixed(2)} MB`);
    }

    // 🌀 Step 4: optional rotation / orientation fix
    const processedBuffer = await sharp(buffer).rotate().toBuffer();

    // ☁️ Step 5: upload stream with 30 s timeout guard
    return await Promise.race([
      new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "telegram-bot-images",
            allowed_formats: ["jpg", "jpeg", "png"],
            resource_type: "image",
            overwrite: true,
            use_filename: true,
          },
          (error, result) => {
            if (error) {
              console.error("❌ Cloudinary upload error:", error);
              return reject(error);
            }
            console.log("✅ Cloudinary upload success:", result.secure_url);
            resolve(result.secure_url);
          }
        );
        const readStream = Readable.from(processedBuffer);
        readStream.pipe(uploadStream);
        readStream.on("error", reject);
      }),

      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Cloudinary upload timeout")), 30000)
      ),
    ]);
  } catch (err) {
    console.error("🚨 uploadToCloudinary failed:", err);
    throw err;
  }
};