import mongoose, { Schema } from "mongoose";

const OfferSchema = new mongoose.Schema({
    variant:{
        type:Number
    },
    name:{
        type:String
    },
    credits:{
        type:Number
    },
    amount:{
        type:Number
    }
},
{ timestamps: false }
);

export const Offer = mongoose.model("Offer", OfferSchema);