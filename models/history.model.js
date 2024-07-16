import mongoose, { Schema } from "mongoose";

const HistorySchema = new mongoose.Schema({
    userID:{
        type:String,
        required:true
    },
    title:{
        type:String,
        required:false
    },
    description:{
        type:String,
        required:false
    },
    bullets:{
        type:[String],
        required:false
    },
    category:{
        type: String,
        required:false
    },
    keywords:{
        type: String,
        required:false
    }
},
{ timestamps: true }
);

export const History = mongoose.model("History", HistorySchema);