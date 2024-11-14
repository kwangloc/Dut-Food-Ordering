import Stripe from "stripe";
import { Request, Response } from "express";
import Restaurant, { MenuItemType } from "../models/restaurant";
import Order from "../models/order";

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

    const restaurant = await Restaurant.findById(
      checkoutSessionRequest.restaurantId
    );

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // New order to database
    const newOrder = new Order({
      restaurant: restaurant,
      user: req.userId,
      status: "placed",
      deliveryDetails: checkoutSessionRequest.deliveryDetails,
      cartItems: checkoutSessionRequest.cartItems,
      createdAt: new Date(),
    });

    const lineItems = createLineItems(
      checkoutSessionRequest,
      restaurant.menuItems
    );

    console.log("~~~~~~~~~~~~~~~~~~~~~~~createCheckoutSession");
    console.log(newOrder._id);
    const session = await createSession(
      lineItems,
      newOrder._id.toString(), // Mongoose has created id even though the newOrder hasn't been created yet
      restaurant.deliveryPrice,
      restaurant._id.toString()
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
        currency: "gbp",
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
  restaurantId: string
) => {
  console.log("~~~~~~~~~~~~~~~~~~~~~~~createSession");
  console.log(orderId);
  const sessionData = await STRIPE.checkout.sessions.create({
    line_items: lineItems,
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: "Delivery",
          type: "fixed_amount",
          fixed_amount: {
            amount: deliveryPrice,
            currency: "gbp",
          },
        },
      },
    ],
    mode: "payment",
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
  console.log("RECEIVED EVENT");
  console.log("==============");
  console.log("event: ", req.body);
  res.send();

  let event;

  // Make sure the webhook event comes from Stripe
  try {
    const sig = req.headers["stripe-signature"];
    event = STRIPE.webhooks.constructEvent(
      req.body,
      sig as string,
      STRIPE_ENDPOINT_SECRET
    );
    console.log("~~~~~~~~~~~~~~~~~~~~~~~passed verification");
  } catch (error: any) {
    console.log(error);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  // Only handle checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    // notice the metadata when we created checkout session
    console.log("~~~~~~~~~~~~~~~~~~~~~~~stripeWebhookHandler");
    console.log(event.data.object.metadata?.orderId);
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
