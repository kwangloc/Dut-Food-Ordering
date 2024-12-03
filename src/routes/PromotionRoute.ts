import express from "express";
import { param } from "express-validator";
import { jwtCheck, jwtParse } from "../middleware/auth";
import PromotionController from "../controllers/PromotionController";

const router = express.Router();

router.get(
  "/:restaurantId",
  param("restaurantId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("RestaurantId paramenter must be a valid string"),
    PromotionController.getPromotions
);

router.post(
  "/",
  jwtParse,
  PromotionController.usePromotion
);

// router.put(
//   "/",
//   jwtParse,
//   PromotionController.updatePromotion
// );

export default router;
