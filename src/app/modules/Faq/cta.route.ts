import express from "express";
import { CtaController } from "./cta.controller";

const router = express.Router();

// get all cta
router.get("/", CtaController.getAllCta);

// get single cta
router.get("/:id", CtaController.getSingleCta);

// update cta
router.patch("/:id", CtaController.updateCta);

// create cta
router.post("/", CtaController.creteCta);

export const ctaRoutes = router;
