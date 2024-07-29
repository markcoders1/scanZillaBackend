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
    },
    buttonText:{
        type:String
    }
},
{ timestamps: false }
);

export const Offer = mongoose.model("Offer", OfferSchema);