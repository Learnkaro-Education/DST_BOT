import express from "express";
import Channel from "../models/Channel.js";

const router = express.Router();

// ADD channel
router.post("/add", async (req, res) => {
    try {
        const { code, channel_id } = req.body;

        if (!code || !channel_id) {
            return res.status(400).json({ success: false, message: "code & channel_id required" });
        }

        const channel = await Channel.create({ code, channel_id });

        res.json({ success: true, message: "Channel added successfully!", channel });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET all channels
router.get("/all", async (req, res) => {
    try {
        const channels = await Channel.findAll({ order: [["id", "ASC"]] });
        res.json({ success: true, channels });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE channel by code
router.delete("/delete/:code", async (req, res) => {
    try {
        const { code } = req.params;

        const channel = await Channel.findOne({ where: { code } });

        if (!channel) {
            return res.status(404).json({ success: false, message: "Channel not found" });
        }

        await channel.destroy();

        res.json({ success: true, message: "Channel deleted successfully", code });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
