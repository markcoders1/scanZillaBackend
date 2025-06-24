import { Router } from "express";
import multer from "multer";
import { verifyJWT, verifyAdmin,verifyMaintenance } from "../middleware/app.middleware.js";
import {
    getUser,
    getWords,
    addWords,
    uploadCsv,
    getThread,
    getIncome,
    makeAdmin,
    removeWords,
    changeRules,
    getAllUsers,
    downloadCsv,
    getAbbWords,
    addAbbWords,
    creditsUsed,
    uploadAbbCsv,
    getAssistants,
    getTotalUsers,
    analysisgraph,
    checkAssistant,
    downloadAbbCsv,
    removeAbbWords,
    getUserHistory,
    deleteAssistant,
    giveUserCredits,
    takeUserCredits,
    getUserPurchases,
    toggleUserAccount,
    getAssInstructions,
    changeOfferPricing,
    updateAssInstructions,
    updateAssInstructionsV2,
    updateAssistantValidator,
    getModels
} from "../controllers/admin.controller.js";

const upload = multer({ dest: "./" });
const router = Router();

router.route("/words").get(getWords);

router.route("/words").post(addWords);

router.route("/words").delete(verifyJWT, verifyMaintenance, verifyAdmin, removeWords);

router.route("/csv").post(upload.single("file"), uploadCsv);

router.route("/csv").get(downloadCsv);

router.route("/abbwords").get(getAbbWords);

router.route("/abbwords").post(addAbbWords);

router.route("/abbwords").delete(verifyJWT, verifyMaintenance, verifyAdmin, removeAbbWords);

router.route("/abbcsv").post(upload.single("file"), uploadAbbCsv);

router.route("/abbcsv").get(downloadAbbCsv);

router.route("/getAllUsers").get(verifyJWT, verifyMaintenance, verifyAdmin, getAllUsers);

router.route("/toggleUserAccount").get(verifyJWT, verifyMaintenance, verifyAdmin, toggleUserAccount);

router.route("/getspecificUser").get(verifyJWT, verifyMaintenance, verifyAdmin, getUser);

router.route("/rules").post(verifyJWT, verifyMaintenance, verifyAdmin, changeRules);

router.route("/gethistory").get(verifyJWT, verifyMaintenance, verifyAdmin, getUserHistory);

router.route("/getuserpurchases").get(verifyJWT, verifyMaintenance, verifyAdmin, getUserPurchases);

router.route("/getTotalUsers").get(verifyJWT, verifyMaintenance, verifyAdmin, getTotalUsers);

router.route("/getIncome").get(verifyJWT, verifyMaintenance, verifyAdmin, getIncome);

router.route("/offers").post(verifyJWT, verifyMaintenance, verifyAdmin, changeOfferPricing);

router.route("/givecredits").post(verifyJWT, verifyMaintenance, verifyAdmin, giveUserCredits);

router.route("/takecredits").post(verifyJWT, verifyMaintenance, verifyAdmin, takeUserCredits);

router.route("/analysisgraph").get(verifyJWT, verifyMaintenance, verifyAdmin, analysisgraph);

router.route("/assistant").get(verifyJWT, verifyMaintenance, verifyAdmin, getAssInstructions);

// router.route("/assistant").post(verifyJWT, verifyMaintenance, verifyAdmin, updateAssInstructions);

router.route("/assistant").post(verifyJWT, verifyMaintenance, verifyAdmin, updateAssInstructionsV2);

router.route("/makeAdmin").get(verifyJWT, verifyMaintenance, verifyAdmin, makeAdmin);

router.route("/getCredits").get(verifyJWT, verifyMaintenance, verifyAdmin, creditsUsed);

router.route("/assistant/validator").get(updateAssistantValidator)

router.route("/deleteAssistant").get(deleteAssistant);

router.route("/getAssistants").get(getAssistants);

router.route("/checkAssistant").get(checkAssistant);

router.route("/getThread").post(getThread);

router.route("/getModels").get(getModels);

export default router;
