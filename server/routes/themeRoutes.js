import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import { getMyTheme, saveMyTheme } from "../controllers/themeController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/me", getMyTheme);
router.put("/me", saveMyTheme);

export default router;
