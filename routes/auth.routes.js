import { Router } from "express";
import { test,createUser,loginUser,refreshAccessToken,logoutUser } from "../controllers/auth.controller.js";
import { testMiddleware,verifyJWT } from "../middleware/app.middleware.js";

const router = Router();

router.route("/").get(testMiddleware,test)

router.route("/createUser").post(createUser)

router.route("/login").post(loginUser)

router.route("/token").post(refreshAccessToken);

router.route("/logout").post(verifyJWT,logoutUser)

// router.route("/auth-status").get(verifyJWT,)



export default router;