import { Request, Response } from "express";
import Promotion from "../models/promotion";
import Restaurant, { MenuItemType } from "../models/restaurant";
import User from "../models/user";

const getPromotions = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId;

    console.log("restaurantId", restaurantId);

    const promotions = await Promotion.find({ restaurant: restaurantId });
    if (!promotions) {
      return res.status(404).json({ message: "restaurant not found" });
    }

    res.json(promotions);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

const usePromotion = async (req: Request, res: Response) => {
};

export default {
  getPromotions,
  usePromotion
};
