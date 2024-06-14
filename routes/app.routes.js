import { Router } from "express";
import { verifyTex} from "../controllers/app.controller.js";
import { verifyJWT } from "../middleware/app.middleware.js";

const router = Router();

router.route("/verifyText").post(verifyJWT,verifyText)

// router.route("/gen").post(getMessages)

// router.route("/gen").post(generateThread)


export default router;