import { Router } from "express";
import { generateThread, verifyText, getUserHistory, buyCredits, BuyCreditWebhook, getUser, getPurchaseHistory, numberOfAnalysed, getCardInfo, toggleAutoCredit} from "../controllers/app.controller.js";
import { verifyJWT } from "../middleware/app.middleware.js";
// import { generateAssistant,getMessages, retreiveRun } from "../ai.code.js";

const router = Router();

router.route("/verifyText").post(verifyJWT,verifyText)

router.route("/getUserHistory").get(verifyJWT,getUserHistory)

router.route('/buycredits').post(verifyJWT,buyCredits)

router.route('/buycreditwebhook').post(BuyCreditWebhook)

router.route('/getuser').get(getUser)

router.route('/getpurchasehistory').get(verifyJWT,getPurchaseHistory)

router.route('/getAnalysedNum').get(verifyJWT,numberOfAnalysed)

router.route('/getcardinfo').get(verifyJWT,getCardInfo)

router.route('/toggleautocredit').get(verifyJWT,toggleAutoCredit)


// router.route('/getHistory').get(getHistory)

// router.route("/gen").post(retreiveRun)

// router.route("/getUserInfo").get(verifyJWT,getUserInfo)

// router.route("/gen").post(generateThread)


export default router;