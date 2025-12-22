    import express from "express";
    import { loadScheduledMessages, saveScheduledMessages } from "../utils/scheduler.js";

    const router = express.Router();

    // 🔹 GET all scheduled messages
    router.get("/scheduled-messages", (req, res) => {
    const messages = loadScheduledMessages();
    res.json({ success: true, messages });
    });

    // 🔹 DELETE one scheduled message
    router.delete("/scheduled-messages/:id", (req, res) => {
    const id = req.params.id;

    let messages = loadScheduledMessages();
    messages = messages.filter(msg => msg.id !== id);

    saveScheduledMessages(messages);

    res.json({ success: true, message: "Deleted" });
    });

    export default router;
