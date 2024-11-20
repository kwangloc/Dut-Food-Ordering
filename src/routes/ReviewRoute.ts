import express from "express";
import { param } from "express-validator";
import { jwtCheck, jwtParse } from "../middleware/auth";
import ReviewController from "../controllers/ReviewController";

const router = express.Router();

router.get(
  "/:restaurantId",
  param("restaurantId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("RestaurantId paramenter must be a valid string"),
  ReviewController.getReviews
);

router.post(
  "/",
  jwtParse,
  ReviewController.createReview
);

router.delete(
  "/:reviewId",
  jwtParse,
  ReviewController.deleteReview
);

export default router;
