import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount,
} from "../controllers/cart.controller.js";
import { protectRoute } from "../middlewares/protectRoute.js";

const router = express.Router();

// All cart routes require authentication
router.use(protectRoute);

router.get("/", getCart);
router.get("/count", getCartCount);
router.post("/add", addToCart);
router.put("/update", updateCartItem);
router.delete("/remove/:medicineId", removeFromCart);
router.delete("/clear", clearCart);

export default router;
