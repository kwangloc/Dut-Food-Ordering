import Stripe from "stripe";
import { Request, Response } from "express";
// models
import Restaurant, { MenuItemType } from "../models/restaurant";
import Order from "../models/order";
import Promotion from "../models/promotion";

const STRIPE = new Stripe(process.env.STRIPE_API_KEY as string);
const FRONTEND_URL = process.env.FRONTEND_URL as string;
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;

// Type definition
type CheckoutSessionRequest = {
  cartItems: {
    menuItemId: string;
    name: string;
    quantity: string;
  }[];
  deliveryDetails: {
    email: string;
    name: string;
    addressLine1: string;
    city: string;
  };
  restaurantId: string;
  promotionId: string;
};

// Functions
const getMyOrders = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .populate("restaurant")
      .populate("user");

    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const checkoutSessionRequest: CheckoutSessionRequest = req.body;
    // find restaurant
    const restaurant = await Restaurant.findById(
      checkoutSessionRequest.restaurantId
    );
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // find promotion
    if (!checkoutSessionRequest.promotionId) {
      throw new Error("promotionId not provided");
    }


    const promotion = await Promotion.findById(checkoutSessionRequest.promotionId);
    console.log("@@@@@@promotion", promotion);
    if (!promotion || !promotion.isActive) {
      throw new Error("Invalid or inactive promotion");
    }

    // New order to database
    const newOrder = new Order({
      restaurant: restaurant,
      user: req.userId,
      status: "placed",
      deliveryDetails: checkoutSessionRequest.deliveryDetails,
      cartItems: checkoutSessionRequest.cartItems,
      createdAt: new Date(),
      promotion: checkoutSessionRequest.promotionId
    });

    // Create line items for Stripe
    const lineItems = createLineItems(
      checkoutSessionRequest,
      restaurant.menuItems
    );


    // Calculate discount amount based on promotion type
    let discountAmount = 0;
    if (promotion.discountType === "percentage") {
      // discountAmount = Math.floor((totalAmount * promotion.discountAmount) / 100);
      discountAmount = promotion.discountAmount;
    } else if (promotion.discountType === "flat") {
      discountAmount = promotion.discountAmount;
    }

    const discounts = discountAmount > 0 
      ? [{ coupon: await createStripeCoupon(discountAmount, promotion.name, promotion.discountType) }] 
      : [];

    console.log("~~~~~~~~~~~~~~~~~~~~~~~createCheckoutSession");
    console.log(newOrder._id);

    const session = await createSession(
      lineItems,
      newOrder._id.toString(), // Mongoose has created id even though the newOrder hasn't been saved yet
      restaurant.deliveryPrice,
      restaurant._id.toString(),
      discounts
    );

    if (!session.url) {
      return res.status(500).json({ message: "Error creating stripe session" });
    }

    await newOrder.save();
    res.json({ url: session.url });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.raw.message });
  }
};


const createStripeCoupon = async (discountAmount: number, promotionName: string, discountType: string) => {
  const couponData: Stripe.CouponCreateParams = {
    name: promotionName,
    duration: "once",
  };

  if (discountType === "percentage") {
    console.log("@@@discountAmount:", discountAmount);
    couponData.percent_off = discountAmount;
    // console.log("@@@discountAmount:", discountAmount);
  } else if (discountType === "flat") {
    couponData.amount_off = discountAmount*100; // dollar to cent
    couponData.currency = "usd"; // Set currency for flat discounts
  }
  const coupon = await STRIPE.coupons.create(couponData);
  console.log("@@@@ Created coupon:", coupon);
  return coupon.id;
};


// menuItems for the price
const createLineItems = (
  checkoutSessionRequest: CheckoutSessionRequest,
  menuItems: MenuItemType[]
) => {
  // 1. foreach cartItem in request, get the menuItem object from menuItems array
  // which comes from restaurant
  // to get price
  // 2. foreach cartItem, convert it to a stripe line item
  // 3. return line item array 
  const lineItems = checkoutSessionRequest.cartItems.map((cartItem) => {
    // Find menuItem
    const menuItem = menuItems.find(
      (item) => item._id.toString() === cartItem.menuItemId.toString()
    );

    if (!menuItem) {
      throw new Error(`Menu item not found: ${cartItem.menuItemId}`);
    }

    // Initialize LineItem (convention in Stripe)
    const line_item: Stripe.Checkout.SessionCreateParams.LineItem = {
      price_data: {
        currency: "usd",
        unit_amount: menuItem.price,
        product_data: {
          name: menuItem.name,
        },
      },
      quantity: parseInt(cartItem.quantity),
    };

    return line_item;
  });

  return lineItems;
};

const createSession = async (
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
  orderId: string,
  deliveryPrice: number,
  restaurantId: string,
  discounts: Stripe.Checkout.SessionCreateParams.Discount[] = []
) => {
  console.log("~~~~~~~~~~~~~~~~~~~~~~~createSession");
  console.log(orderId);
  console.log("@@@@discounts:", discounts);
  const sessionData = await STRIPE.checkout.sessions.create({
    line_items: lineItems,
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: "Delivery",
          type: "fixed_amount",
          fixed_amount: {
            amount: deliveryPrice,
            currency: "usd",
          },
        },
      },
    ],
    mode: "payment",
    discounts,
    metadata: {
      orderId,
      restaurantId,
    },
    // success_url: `${FRONTEND_URL}/order-status?success=true`,
    success_url: `${FRONTEND_URL}/health`,
    cancel_url: `${FRONTEND_URL}/detail/${restaurantId}?cancelled=true`,
  });

  return sessionData;
};

const stripeWebhookHandler = async (req: Request, res: Response) => {
  // FOR TESTING
  // console.log("RECEIVED EVENT");
  // console.log("==============");
  // console.log("event: ", req.body);

  // Make sure the webhook event comes from Stripe
  let event;
  try {
    const sig = req.headers["stripe-signature"];
    event = STRIPE.webhooks.constructEvent(
      req.body,
      sig as string,
      STRIPE_ENDPOINT_SECRET
    );
    console.log(`~~~~~~~~~~~~~~~~ ${event.type} passed verification`);
  } catch (error: any) {
    console.log(error);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  // Only handle checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    // notice the metadata when we created checkout session
    console.log("~~~~~~~~~~~~~~~~~~~~~~~stripeWebhookHandler");
    console.log("oderID: ", event.data.object.metadata?.orderId);
    const order = await Order.findById(event.data.object.metadata?.orderId); 

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.totalAmount = event.data.object.amount_total;
    order.status = "paid";

    await order.save();
  }

  // By sending 200, we let Stripe know that we handled the webhook event
  res.status(200).send();
};

const createOrder = async (req: Request, res: Response) => {
  try {
    const newOrder = new Order(
      req.body
    )

    await newOrder.save()
    res.json(newOrder);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "createOrder went wrong" });
  }
};

const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    console.log(req.params.orderId);
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status: req.body.status },
      { new: true }
    );
    res.status(200).send(order);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "createOrder went wrong" });
  }
};

export default {
  getMyOrders,
  createCheckoutSession,
  stripeWebhookHandler,
  // addtional
  createOrder, 
  updateOrderStatus
};
