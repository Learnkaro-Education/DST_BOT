    import express from "express";
    import LinkButtons from "../models/linkbuttons.js";

    const router = express.Router();

    router.post("/add", async (req, res) => {
    try {
        const { text, url } = req.body;

        if (!text || !url) {
        return res.status(400).json({
            success: false,
            message: "text & url required",
        });
        }

        const newBtn = await LinkButtons.create({
        text,
        url,
        });

        return res.json({
        success: true,
        message: "Button added successfully",
        button: newBtn,
        });
    } catch (err) {
        console.error("Error adding button:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
    });

    router.get("/all", async (req, res) => {
    try {
        const buttons = await LinkButtons.findAll({
        order: [["id", "DESC"]],
        });

        return res.json({
        success: true,
        buttons,
        });
    } catch (err) {
        console.error("Error fetching buttons:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
    });

    router.delete("/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const button = await LinkButtons.findByPk(id);

        if (!button) {
        return res.status(404).json({
            success: false,
            message: "Button not found",
        });
        }

        await button.destroy();

        return res.json({
        success: true,
        message: "Button deleted successfully",
        id,
        });
    } catch (err) {
        console.error("Error deleting button:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
    });

    export default router;
