import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({
    path: "./.env",
});


// Run server

connectDB()
    .then(() => {
        app.on("Error", (error) => {
            console.log("ERROR: ", error);
            throw error;
        });
        app.listen(process.env.PORT || 3000, () => {
            console.log(`Server is running at port: http//:localhost:${process.env.PORT}/`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection failed !!", err);
    });