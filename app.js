import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRouter from "./routes/auth.routes.js"
import appRouter from "./routes/app.routes.js"
import adminRouter from "./routes/admin.routes.js"
import { BuyCreditWebhook } from "./controllers/app.controller.js";
import bodyParser from 'body-parser'
import { defaultLimiter } from "./middleware/limit.middleware.js";

const app = express();

app.use(
  cors({
    origin:["*","http://localhost:5173","https://scanzilla.netlify.app","https://gxsvhh4z-5173.euw.devtunnels.ms/"],
    credentials:true
  })
);


app.use(morgan("dev"))

app.use(
  express.json({
    limit: "16kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "16kb",
  })
);
app.use(express.static("public"));


//rate limits

app.use('/',defaultLimiter)

// routes declaration

app.use("/", authRouter);
app.use("/", appRouter)
app.use("/", adminRouter)
app.use("*",(req,res)=>res.status(404).json({error:"route not found",code:404}))



export { app };
