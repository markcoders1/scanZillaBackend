import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middleware/app.middleware.js";
import {getAllUsers, toggleUserAccount, getUser, getWords, addWords, removeWords, changeRules, getRules, getTotalUsers, getUserHistory, getUserPurchases, getTotalIncome,changeOfferPricing,getMostRecentHistory, getOffers} from "../controllers/admin.controller.js"

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

router.route('/getTotalIncome').get(verifyJWT, verifyAdmin, getTotalIncome)

router.route('/offers').post(verifyJWT, verifyAdmin, changeOfferPricing)

router.route('/offers').get(verifyJWT, verifyAdmin, getOffers)

router.route('/getRecentHistory').get(verifyJWT, verifyAdmin, getMostRecentHistory)

export default router