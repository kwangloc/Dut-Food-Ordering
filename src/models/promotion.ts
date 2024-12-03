import mongoose, { InferSchemaType } from "mongoose";

const promotionSchema = new mongoose.Schema({
  restaurant: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Restaurant" 
  },
  name: { type: String, required: true },
  type: { type: String, enum: ["percentage", "fixed"], required: true },
  value: { type: Number, required: true },
  description: { type: String, required: true },
  // status: { 
  //   type: String, 
  //   required: true,
  //   enum: ["available", "out of stock", "expired"]
  // },
  dateStart: { type: Date, default: Date.now },
  dateEnd: { type: Date, required: true },
  numLimit: { type: Number, required: true },
  numUsed: { type: Number, required: true, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now}
});

// Middleware to automatically set `isActive` based on current date
promotionSchema.pre("save", function (next) {
  const now = new Date();
  this.isActive = this.dateStart <= now && now <= this.dateEnd;
  next();
});

const Promotion = mongoose.model("Promotion", promotionSchema);

export default Promotion;
