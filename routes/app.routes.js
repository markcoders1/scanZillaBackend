import { Router } from "express";
import { generateThread, verifyText, getUserHistory, buyCredits, BuyCreditWebhook} from "../controllers/app.controller.js";
import { verifyJWT } from "../middleware/app.middleware.js";
// import { generateAssistant,getMessages, retreiveRun } from "../ai.code.js";

const router = Router();

router.route("/verifyText").post(verifyJWT,verifyText)

router.route("/getUserHistory").get(verifyJWT,getUserHistory)

router.route('/buycredits').post(verifyJWT,buyCredits)

router.route('/buycreditwebhook').post(BuyCreditWebhook)

// router.route('/getHistory').get(getHistory)

// router.route("/gen").post(retreiveRun)

// router.route("/getUserInfo").get(verifyJWT,getUserInfo)

// router.route("/gen").post(generateThread)


export default router;