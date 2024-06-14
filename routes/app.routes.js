import { Router } from "express";
import { generateThread, verifyText} from "../controllers/app.controller.js";
import { verifyJWT } from "../middleware/app.middleware.js";

const router = Router();

router.route("/verifyText").post(verifyText)

router.route("/gen").post(generateThread)

// router.route("/gen").post(generateThread)


export default router;