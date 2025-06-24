import { Router } from "express";
import { verifyJWT, verifyMaintenance } from "../middleware/app.middleware.js";
import { History } from "../models/history.model.js";
import {
    verifyText,
    getUserHistory,
    getUser,
    buyCredits,
    BuyCreditWebhook,
    getPurchaseHistory,
    numberOfAnalysed,
    getCardInfo,
    toggleAutoCredit,
    getGraphData,
    getOffers,
    addPaymentMethod,
    getRules,
    paymentEmail,
    supportEmail,
    changeName,
    asin,
} from "../controllers/app.controller.js";
import { generateAssistant, updateAssistant } from "../services/ai.code.js";
import { wordReplacer } from "../services/AIService.js";
// import { deleteAssistant, listAssistants,retreiveRun,getMessages } from "../ignore/ai.code.js";
// import { generateAssistant,getMessages, retreiveRun } from "../ai.code.js";

const router = Router();

router.route("/verifyText").post(verifyJWT,verifyMaintenance, verifyText);

router.route("/getUserHistory").get(verifyJWT,verifyMaintenance,  getUserHistory);

router.route("/buycredits").post(verifyJWT,verifyMaintenance, buyCredits);

router.route("/buycreditwebhook").post(BuyCreditWebhook);

router.route("/getpurchasehistory").get(verifyJWT,verifyMaintenance, getPurchaseHistory);

router.route("/getAnalysedNum").get(verifyJWT,verifyMaintenance, numberOfAnalysed);

router.route("/getcardinfo").get(verifyJWT,verifyMaintenance, getCardInfo);

router.route("/toggleautocredit").get(verifyJWT,verifyMaintenance, toggleAutoCredit);

router.route("/getHistoryGraph").get(verifyJWT,verifyMaintenance);

router.route("/getUser").get(verifyJWT,verifyMaintenance, getUser);

router.route("/getgraphdata").get(verifyJWT,verifyMaintenance, getGraphData);

router.route("/offers").get(verifyJWT,verifyMaintenance, getOffers);

router.route("/addPaymentMethod").get(verifyJWT,verifyMaintenance, addPaymentMethod);

router.route("/rules").get(verifyJWT,verifyMaintenance, getRules);

// router.route("/PaymentEmail").post(verifyJWT, paymentEmail);

router.route("/supportEmail").post(verifyJWT,verifyMaintenance, supportEmail);

router.route("/changeName").post(verifyJWT,verifyMaintenance, changeName);

router.route("/prefill/:asin").get(asin);

router.route("/temp").get(wordReplacer)

// router.route("/temp").get(updateAssistant)

// router.route("/temp").get(generateAssistant);

// router.route('/getHistory').get(getHistory)

// router.route("/gen").post(retreiveRun)

// router.route("/getUserInfo").get(verifyJWT,getUserInfo)

// router.route("/gen").post(generateThread)

export default router;
