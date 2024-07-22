import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middleware/app.middleware.js";
import {getAllUsers, toggleUserAccount, getUser, getWords, addWords, removeWords, changeRules, getRules, getTotalUsers} from "../controllers/admin.controller.js"

const router = Router()

router.route("/getAllUsers").get(getAllUsers)

router.route("/toggleUserAccount").get(toggleUserAccount)

router.route("/getspecificUser").get(getUser)

router.route('/words').get(getWords)

router.route('/words').post(addWords)

router.route('/words').delete(removeWords)

router.route('/rules').post(changeRules)

router.route('/getuserhistory')

router.route('/getuserpurchases')

router.route('/rules').get(getRules)

router.route('/getTotalUsers').get(getTotalUsers)

router.route('/getTotalIncome')

router.route('/creditPricing')

router.route('/creditPricing')

export default router