import { Request, Response } from "express";
import Restaurant from "../models/restaurant";
import cloudinary from "cloudinary";
import mongoose from "mongoose";
import Order from "../models/order";
import Review from "../models/review";

// RESTAURANT
const getMyRestaurant = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findOne({ user: req.userId });
    if (!restaurant) {
      return res.status(404).json({ message: "restaurant not found" });
    }
    res.json(restaurant);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error fetching restaurant" });
  }
};

const createMyRestaurant = async (req: Request, res: Response) => {
  try {

    // 1. check existing restaurant (by checking userId)
    
    const existingRestaurant = await Restaurant.findOne({ user: req.userId });

    if (existingRestaurant) {
      return res
        .status(409)
        .json({ message: "User restaurant already exists" });
    }
    // 2. handle restaurant's image
    const imageUrl = await uploadImage(req.file as Express.Multer.File);

    // 3. create new restaurant in db
    const restaurant = new Restaurant(req.body);
    restaurant.imageUrl = imageUrl;
    restaurant.user = new mongoose.Types.ObjectId(req.userId);
    restaurant.lastUpdated = new Date();
    await restaurant.save();

    res.status(201).send(restaurant);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const updateMyRestaurant = async (req: Request, res: Response) => {
  try {
    // 1. check valid restaurant
    const restaurant = await Restaurant.findOne({
      user: req.userId,
    });

    if (!restaurant) {
      return res.status(404).json({ message: "restaurant not found" });
    }

    // 2. update
    restaurant.restaurantName = req.body.restaurantName;
    restaurant.city = req.body.city;
    restaurant.country = req.body.country;
    restaurant.deliveryPrice = req.body.deliveryPrice;
    restaurant.estimatedDeliveryTime = req.body.estimatedDeliveryTime;
    restaurant.cuisines = req.body.cuisines;
    restaurant.menuItems = req.body.menuItems;
    restaurant.lastUpdated = new Date();

    if (req.file) {
      const imageUrl = await uploadImage(req.file as Express.Multer.File);
      restaurant.imageUrl = imageUrl;
    }

    await restaurant.save();
    res.status(200).send(restaurant);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// ORDER
const getMyRestaurantOrders = async (req: Request, res: Response) => {
  console.log("@@@@@@@req.userId", req.userId);

  try {
    const restaurant = await Restaurant.findOne({ user: req.userId });
    if (!restaurant) {
      return res.status(404).json({ message: "restaurant not found" });
    }

    // console.log()

    const orders = await Order.find({ restaurant: restaurant._id })
      .populate("restaurant")
      .populate("user");

    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "order not found" });
    }

    const restaurant = await Restaurant.findById(order.restaurant);

    if (restaurant?.user?._id.toString() !== req.userId) {
      return res.status(401).send();
    }

    order.status = status;
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "unable to update order status" });
  }
};

const uploadImage = async (file: Express.Multer.File) => {
  const image = file;
  const base64Image = Buffer.from(image.buffer).toString("base64");
  const dataURI = `data:${image.mimetype};base64,${base64Image}`;

  const uploadResponse = await cloudinary.v2.uploader.upload(dataURI); // get the API return
  return uploadResponse.url;
};

// REVIEW
const getMyRestaurantReviews = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findOne({ user: req.userId });
    if (!restaurant) {
      return res.status(404).json({ message: "restaurant not found" });
    }

    const reviews = await Review.find({ restaurant: restaurant._id })
      .populate("restaurant")
      .populate("user");

    res.json(reviews);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
}

// REVENUE
// const getMyRestaurantRevenue = async (req: Request, res: Response) => {
//   try {
//     const restaurant = await Restaurant.findOne({ user: req.userId });
//     if (!restaurant) {
//       return res.status(404).json({ message: "restaurant not found" });
//     }

//     // const revenue = await Order.find({ restaurant: restaurant._id })
//     // res.json(revenue);

//     //
//     const tmpRevenueByDate: { [key: string]: any[] } = {};
    
//     const revenueByDate: { [key: string]: any[] } = {};
//     const orders = await Order.find({ restaurant: restaurant._id });
//     orders.forEach(order => {
//       const date = order.createdAt.toISOString().split('T')[0];
//       if (!tmpRevenueByDate[date]) {
//       tmpRevenueByDate[date] = [];
//       revenueByDate[date] = [];
//       }
//       tmpRevenueByDate[date].push(order);
//     });

//     for (const date in tmpRevenueByDate) {
//       const revenue: { 
//         totalAmount: number,
//         menuItems: any[] 
//       } = { 
//         totalAmount: 0,
//         menuItems: [] 
//       };
//       for (const order of tmpRevenueByDate[date]) {
//         revenue.totalAmount += parseFloat(order.totalAmount);
//         for (const item of order.cartItems) {
//           revenue.menuItems.push(item);
//         }
//       }
//       revenueByDate[date].push(revenue);
//     }
//     console.log("revenueByDate:", revenueByDate);

//     // tmpRevenueByDate.forEach(day => {
//     //   day.forEach(order => {

//     //   })
//     // }) 


//     res.json(tmpRevenueByDate);
//     //
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ message: "something went wrong" });
//   }
// }

const getMyRestaurantRevenue = async (req: Request, res: Response) => {
  try {
    // Find the restaurant associated with the logged-in user
    const restaurant = await Restaurant.findOne({ user: req.userId });
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Fetch all orders for the restaurant
    const orders = await Order.find({ restaurant: restaurant._id });

    // Object to store revenue and item quantities by date
    const revenueByDate: {
      [key: string]: {
        totalAmount: number;
        items: { menuItemId: string; name: string; quantity: number }[];
      };
    } = {};

    // Group orders by date and aggregate data
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!revenueByDate[date]) {
        revenueByDate[date] = { totalAmount: 0, items: [] };
      }

      // Add to the total amount for the day
      revenueByDate[date].totalAmount += parseFloat(order.totalAmount?.toString() || "0");

      // Aggregate item data
      order.cartItems.forEach((item: any) => {
        const existingItem = revenueByDate[date].items.find(
          menuItem => menuItem.menuItemId === item.menuItemId
        );
        if (existingItem) {
          existingItem.quantity += item.quantity;
        } else {
          revenueByDate[date].items.push({
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity
          });
        }
      });
    });

    // Send the aggregated revenue data as a response
    res.json(revenueByDate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export default {
  updateOrderStatus,
  getMyRestaurantOrders,
  getMyRestaurant,
  createMyRestaurant,
  updateMyRestaurant,
  getMyRestaurantReviews,
  getMyRestaurantRevenue
};
