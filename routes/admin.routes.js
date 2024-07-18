import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middleware/app.middleware.js";
import {getAllUsers, toggleUserAccount, getUser, getWords, addWords, removeWords, changeRules} from "../controllers/admin.controller.js"

const router = Router()

router.route("/getAllUsers").get(verifyJWT,verifyAdmin, getAllUsers)

router.route("/toggleUserAccount").get(verifyJWT,verifyAdmin,toggleUserAccount)

router.route("/getUser").get(verifyJWT,verifyAdmin, getUser)

router.route('/words').get(getWords)

router.route('/words').post(addWords)

router.route('/words').delete(removeWords)

router.route('/rules').post(verifyJWT,verifyAdmin,changeRules)

export default router