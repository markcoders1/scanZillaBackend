import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRouter from "./routes/auth.routes.js"
import appRouter from "./routes/app.routes.js"
import { defaultLimiter } from "./middleware/limit.middleware.js";

const app = express();

app.use(
  cors({
    origin:'https://scan-zilla-frontend.vercel.app/',
    credentials:true
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

//rate limits

// app.use('/',defaultLimiter)

// routes declaration

app.use("/", authRouter);
app.use("/", appRouter)
app.use("*",(req,res)=>res.status(404).json({error:"route not found",code:404}))



export { app };
