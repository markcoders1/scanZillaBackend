import { Router } from "express";
import { generateThread, verifyText, getUserHistory} from "../controllers/app.controller.js";
import { verifyJWT } from "../middleware/app.middleware.js";
// import { generateAssistant,getMessages, retreiveRun } from "../ai.code.js";

const router = Router();

router.route("/verifyText").post(verifyJWT,verifyText)

router.route("/getUserHistory").get(verifyJWT,getUserHistory)

// router.route("/gen").post(retreiveRun)

// router.route("/getUserInfo").get(verifyJWT,getUserInfo)

// router.route("/gen").post(generateThread)


export default router;