import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middleware/app.middleware.js";
import {
    getUser, 
    getWords, 
    addWords,
    getRules,
    getIncome,
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
} from "../controllers/admin.controller.js"

const router = Router()

router.route("/getAllUsers").get(verifyJWT, verifyAdmin, getAllUsers)

router.route("/toggleUserAccount").get(verifyJWT, verifyAdmin, toggleUserAccount)

router.route("/getspecificUser").get(verifyJWT, verifyAdmin, getUser)

router.route('/words').get(verifyJWT, verifyAdmin, getWords)

router.route('/words').post(verifyJWT, verifyAdmin, addWords)

router.route('/words').delete(verifyJWT, verifyAdmin, removeWords)

router.route('/rules').post(verifyJWT, verifyAdmin, changeRules)

router.route('/gethistory').get(verifyJWT, verifyAdmin, getUserHistory)

router.route('/getuserpurchases').get(verifyJWT, verifyAdmin, getUserPurchases)

router.route('/rules').get(verifyJWT, verifyAdmin, getRules)

router.route('/getTotalUsers').get(verifyJWT, verifyAdmin, getTotalUsers)

router.route('/getIncome').get(getIncome)

router.route('/offers').post(changeOfferPricing)

router.route('/givecredits').post(giveUserCredits)

router.route('/analysisgraph').get(analysisgraph)

router.route('/assistant').get(getAssInstructions)

export default router