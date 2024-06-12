import express from "express";
import cors from "cors";
import morgan from "morgan";
import appRoutes from "./routes/app.routes.js"
import { defaultLimiter } from "./middleware/limit.middleware.js";

const app = express();

app.use(
  cors({
    origin:'http://localhost:5173',
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

app.use('/',defaultLimiter)

// routes declaration

app.use("/", appRoutes);
app.use("*",(req,res)=>res.status(404).json({error:"route not found",code:404}))



export { app };
