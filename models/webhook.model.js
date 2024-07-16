import mongoose, { Schema } from "mongoose";

const processedEventSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    }
},
{ timestamps: true }
);

export const ProcessedEvent = mongoose.model("processedEvent", processedEventSchema);
