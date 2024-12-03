import express from "express";
import multer from "multer";
import MyRestaurantController from "../controllers/MyRestaurantController";
import { jwtCheck, jwtParse } from "../middleware/auth";
import { validateMyRestaurantRequest } from "../middleware/validation";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, //5mb
  },
});


// RESTAURANT
router.get("/", 
  // jwtCheck, 
  jwtParse, 
  MyRestaurantController.getMyRestaurant
);

router.post(
  "/",
  upload.single("imageFile"),
  validateMyRestaurantRequest,
  // jwtCheck,
  jwtParse,
  MyRestaurantController.createMyRestaurant
);

router.put(
  "/",
  upload.single("imageFile"),
  validateMyRestaurantRequest,
  // jwtCheck,
  jwtParse,
  MyRestaurantController.updateMyRestaurant
);

// ORDER
router.get(
  "/order",
  // jwtCheck,
  jwtParse,
  MyRestaurantController.getMyRestaurantOrders
);

router.patch(
  "/order/:orderId/status",
  // jwtCheck,
  jwtParse,
  MyRestaurantController.updateOrderStatus
);

// REVIEW
router.get(
  "/review",
  // jwtCheck,
  jwtParse,
  MyRestaurantController.getMyRestaurantReviews
);

// REVENUE
router.get(
  "/revenue",
  // jwtCheck,
  jwtParse,
  MyRestaurantController.getMyRestaurantRevenue
);

// PROMOTION
router.get(
  "/promotion",
  // jwtCheck,
  jwtParse,
  MyRestaurantController.getMyRestaurantPromotion
);

router.post(
  "/promotion",
  // jwtCheck,
  jwtParse,
  MyRestaurantController.createMyRestaurantPromotion
);

router.put(
  "/promotion/:promotionId",
  // jwtCheck,
  jwtParse,
  MyRestaurantController.updateMyRestaurantPromotion
);


export default router;
