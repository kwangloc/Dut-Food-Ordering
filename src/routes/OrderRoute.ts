import express from "express";
import { jwtCheck, jwtParse } from "../middleware/auth";
import OrderController from "../controllers/OrderController";

const router = express.Router();

router.get("/", jwtCheck, jwtParse, OrderController.getMyOrders);

router.post(
  "/checkout/create-checkout-session",
  // jwtCheck,
  jwtParse,
  OrderController.createCheckoutSession
);

router.post("/checkout/webhook", OrderController.stripeWebhookHandler);

// Addtional routes
router.post(
  "/checkout/create-order",
  // jwtCheck,
  jwtParse,
  OrderController.createOrder
);

router.put(
  "/checkout/update-order-status/:orderId",
  // jwtCheck,
  jwtParse,
  OrderController.updateOrderStatus
);

export default router;
