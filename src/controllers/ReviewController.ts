import { Request, Response } from "express";
import Review from "../models/review";
import Restaurant, { MenuItemType } from "../models/restaurant";
import User from "../models/user";

type NewReviewRequest = {
  restaurantId: string;
  rating: number,
  comment: string
};

const getReviews = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId;

    console.log("restaurantId", restaurantId);

    const reviews = await Review.find({ restaurant: restaurantId });
    if (!reviews) {
      return res.status(404).json({ message: "restaurant not found" });
    }

    res.json(reviews);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

const createReview = async (req: Request, res: Response) => {
  const newReviewRequest: NewReviewRequest = req.body;
  
  const user = await User.findById(req.userId);

  if (!user) {
    throw new Error("User not found");
  }

  const restaurant = await Restaurant.findById(
    newReviewRequest.restaurantId
  );

  if (!restaurant) {
    throw new Error("Restaurant not found");
  }
  try {
    const newReview = new Review({
      restaurant: restaurant,
      user: user,
      rating: newReviewRequest.rating,
      comment: newReviewRequest.comment
    })
    await newReview.save();
    res.status(201).send(newReview);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

const deleteReview = async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  
  const review = await Review.findById(reviewId);
  if (!review) {
    return res.status(404).json({ message: "review not found" });
  }

  if (review.user?.toString() !== req.userId) {
    return res.status(404).json({ message: "you don't have permission to delete review" });
  }
  
  try {
    let result = await Review.findByIdAndDelete(reviewId);
    res.status(200).json({ message: "review deleted successfully", result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};


export default {
  getReviews,
  createReview,
  deleteReview
};
