import { Router } from "express";
import multer from "multer"
import { verifyJWT, verifyAdmin } from "../middleware/app.middleware.js";
import {
    getUser, 
    getWords, 
    addWords,
    getIncome,
    makeAdmin,
    removeWords, 
    changeRules,  
    getAllUsers, 
    getTotalUsers, 
    analysisgraph, 
    getUserHistory, 
    giveUserCredits,
    getUserPurchases,
    toggleUserAccount, 
    changeOfferPricing,
    getAssInstructions,
    updateAssInstructions,
    uploadCsv,
    downloadCsv
} from "../controllers/admin.controller.js"

const upload = multer({ dest: './' });
const router = Router()

router.route("/getAllUsers").get(verifyJWT, verifyAdmin, getAllUsers)

router.route("/toggleUserAccount").get(verifyJWT, verifyAdmin, toggleUserAccount)

router.route("/getspecificUser").get(verifyJWT, verifyAdmin, getUser)

router.route('/words').get(getWords)

router.route('/words').post( addWords)

router.route('/words').delete(verifyJWT, verifyAdmin, removeWords)

router.route('/rules').post(verifyJWT, verifyAdmin, changeRules)

router.route('/gethistory').get(verifyJWT, verifyAdmin, getUserHistory)

router.route('/getuserpurchases').get(verifyJWT, verifyAdmin, getUserPurchases)

router.route('/getTotalUsers').get(verifyJWT, verifyAdmin, getTotalUsers)

router.route('/getIncome').get(verifyJWT, verifyAdmin, getIncome)

router.route('/offers').post(verifyJWT, verifyAdmin, changeOfferPricing)

router.route('/givecredits').post(verifyJWT, verifyAdmin, giveUserCredits)

router.route('/analysisgraph').get(verifyJWT, verifyAdmin, analysisgraph)

router.route('/assistant').get(verifyJWT, verifyAdmin, getAssInstructions)

router.route('/assistant').post(verifyJWT, verifyAdmin, updateAssInstructions)

router.route('/makeAdmin').get(verifyJWT,verifyAdmin,makeAdmin)

router.route('/csv').post(upload.single('file'),uploadCsv)

router.route('/csv').get(downloadCsv)


export default router