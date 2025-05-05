import mongoose from "mongoose";

const WordSchema = new mongoose.Schema({
    word:{
        type:String,
        required:true
    },
    replacement:{
        type:[String],
        required:true
    },
    isBrand:{
        type:Boolean,
        default:false
    }
});

export const Word = mongoose.model("Word", WordSchema);