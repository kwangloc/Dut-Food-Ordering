import mongoose, { InferSchemaType } from "mongoose";

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
  rating: { 
    type: Number, 
    required: true,
    enum: [1, 2, 3, 4, 5],
  },
  comment: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now },
});

const Review = mongoose.model("Review", reviewSchema);

export default Review;
