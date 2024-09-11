import { Router } from "express";
import { verifyJWT } from "../middleware/app.middleware.js";
import { generateThread, verifyText, getUserHistory, getUser, buyCredits, BuyCreditWebhook, getPurchaseHistory, numberOfAnalysed, getCardInfo, toggleAutoCredit,getGraphData, getOffers, addPaymentMethod, getRules, paymentEmail, getMessage} from "../controllers/app.controller.js";
import { deleteAssistant, listAssistants,retreiveRun,getMessages } from "../ignore/ai.code.js";
// import { generateAssistant,getMessages, retreiveRun } from "../ai.code.js";

const router = Router();

router.route("/verifyText").post(verifyJWT, verifyText)

router.route("/getUserHistory").get(verifyJWT,getUserHistory),

router.route('/buycredits').post(verifyJWT,buyCredits)

router.route('/buycreditwebhook').post(BuyCreditWebhook)

router.route('/getpurchasehistory').get(verifyJWT,getPurchaseHistory)

router.route('/getAnalysedNum').get(verifyJWT,numberOfAnalysed)

router.route('/getcardinfo').get(verifyJWT,getCardInfo)

router.route('/toggleautocredit').get(verifyJWT,toggleAutoCredit)

router.route('/getHistoryGraph').get(verifyJWT)

router.route('/getUser').get(verifyJWT,getUser)

router.route('/getgraphdata').get(verifyJWT,getGraphData)

router.route('/offers').get(verifyJWT, getOffers)

router.route('/addPaymentMethod').get(verifyJWT, addPaymentMethod)

router.route('/rules').get(verifyJWT, getRules)

router.route('/PaymentEmail').post(paymentEmail)

router.route('/getlastmessage').get(getMessage)

router.route('/temp').get(listAssistants)

// router.route('/getHistory').get(getHistory)

// router.route("/gen").post(retreiveRun)

// router.route("/getUserInfo").get(verifyJWT,getUserInfo)

// router.route("/gen").post(generateThread)


export default router;