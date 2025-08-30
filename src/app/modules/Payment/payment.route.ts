import express from "express";

const router = express.Router();

// flutter-wave webhooks payment
router.post("/webhooks-flutterwave", (req, res) => {
    res.send("Flutterwave payment route");
});

export const paymentRoutes = router;