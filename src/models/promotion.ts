import mongoose, { InferSchemaType } from "mongoose";

const promotionSchema = new mongoose.Schema({
  restaurant: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Restaurant" 
  },
  name: { type: String, required: true },
  description: { type: String, required: true },
  status: { 
    type: String, 
    required: true,
    enum: ["available", "out of stock", "expired"]
  },
  num_limit: { type: Number, required: true },
  num_used: { type: Number, required: true, default: 0 },
  dateStart: { type: Date, default: Date.now },
  dateEnd: { type: Date, default: Date.now },
});

const Promotion = mongoose.model("Promotion", promotionSchema);

export default Promotion;
