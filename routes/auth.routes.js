import { Router } from "express";
import { test,createUser, loginUser, refreshAccessToken, logoutUser, genOTP, forgetpassword, Oauth, changePassword } from "../controllers/auth.controller.js";
import { testMiddleware,verifyJWT } from "../middleware/app.middleware.js";

const router = Router();

router.route("/").get(testMiddleware,test)

router.route("/createUser").post(createUser)

router.route("/login").post(loginUser)

router.route("/token").post(refreshAccessToken);

router.route("/logout").post(verifyJWT,logoutUser);

router.route('/genOTP').post(genOTP)

router.route('/forgetpassword').post(forgetpassword)

router.route('/oauth').post(Oauth)

router.route('/changepassword').post(verifyJWT,changePassword)

// router.route("/auth-status").get(verifyJWT,)



export default router;