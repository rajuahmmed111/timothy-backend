import express from "express";
import { FaqController } from "./faq.controller";

const router = express.Router();

// create faq
router.post("/", FaqController.createFaq);

// get all faq
router.get("/", FaqController.getAllFaq);

// get single faq
router.get("/:id", FaqController.getSingleFaq);

// update faq
router.patch("/:id", FaqController.updateFaq);

// delete faq
router.delete("/:id", FaqController.deleteFaq);

export const faqRoutes = router;
