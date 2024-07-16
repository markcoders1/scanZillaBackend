import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRouter from "./routes/auth.routes.js"
import appRouter from "./routes/app.routes.js"
import { BuyCreditWebhook } from "./controllers/app.controller.js";
import bodyParser from 'body-parser'
import { defaultLimiter } from "./middleware/limit.middleware.js";

const app = express();

app.use(
  cors({
    origin:["*","http://localhost:5173","https://scan-zilla-frontend.vercel.app"],
  })
);


app.use(morgan("tiny"))

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

const rawBodyMiddleware = (req, res, next) => {
  if (req.headers['stripe-signature']) {
    req.rawBody = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      req.rawBody += chunk;
    });
    req.on('end', () => {
      next();
    });
  } else {
    next();
  }
};

//rate limits

// app.use('/',defaultLimiter)

// routes declaration

app.use("/", authRouter);
app.use("/", appRouter)
// app.post('/buycreditwebhook',rawBodyMiddleware,BuyCreditWebhook)
app.use("*",(req,res)=>res.status(404).json({error:"route not found",code:404}))



export { app };
