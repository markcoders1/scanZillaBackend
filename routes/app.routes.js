import { Router } from "express";
import { verifyText } from "../controllers/app.controller.js";
import { verifyJWT } from "../middleware/app.middleware.js";

const router = Router();

router.route("/verifyText").post(verifyJWT,verifyText)

// router.route("/gen").get(generateAssistant)

export default router;