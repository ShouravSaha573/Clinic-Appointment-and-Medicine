import Cart from "../models/cart.model.js";
import Medicine from "../models/medicine.model.js";

// Get user cart
export const getCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId, isActive: true })
      .populate({
        path: "items.medicine",
        select: "name brand price discountPrice stock image category prescriptionRequired",
      });

    if (!cart) {
      return res.status(200).json({
        items: [],
        totalItems: 0,
        totalAmount: 0,
      });
    }

    // Filter out inactive or out-of-stock medicines
    const validItems = cart.items.filter(item => 
      item.medicine && 
      item.medicine.stock > 0 && 
      item.quantity <= item.medicine.stock
    );

    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    res.status(200).json(cart);
  } catch (error) {
    console.log("Error in getCart controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { medicineId, quantity = 1 } = req.body;

    // Check if medicine exists and is available
    const medicine = await Medicine.findById(medicineId);
    if (!medicine || !medicine.isActive) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    if (medicine.stock < quantity) {
      return res.status(400).json({ 
        message: `Only ${medicine.stock} items available in stock` 
      });
    }

    if (medicine.expiryDate <= new Date()) {
      return res.status(400).json({ message: "Medicine has expired" });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: userId, isActive: true });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.medicine.toString() === medicineId
    );

    const effectivePrice = medicine.discountPrice && medicine.discountPrice < medicine.price 
      ? medicine.discountPrice 
      : medicine.price;

    if (existingItemIndex > -1) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      if (newQuantity > medicine.stock) {
        return res.status(400).json({ 
          message: `Cannot add more items. Only ${medicine.stock} available in stock` 
        });
      }

      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].price = effectivePrice;
    } else {
      // Add new item
      cart.items.push({
        medicine: medicineId,
        quantity,
        price: effectivePrice,
      });
    }

    await cart.save();

    // Populate the cart before sending response
    await cart.populate({
      path: "items.medicine",
      select: "name brand price discountPrice stock image category prescriptionRequired",
    });

    res.status(200).json({
      message: "Item added to cart successfully",
      cart,
    });
  } catch (error) {
    console.log("Error in addToCart controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { medicineId, quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    const cart = await Cart.findOne({ user: userId, isActive: true });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      item => item.medicine.toString() === medicineId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    // Check stock availability
    const medicine = await Medicine.findById(medicineId);
    if (!medicine || medicine.stock < quantity) {
      return res.status(400).json({ 
        message: `Only ${medicine?.stock || 0} items available in stock` 
      });
    }

    const effectivePrice = medicine.discountPrice && medicine.discountPrice < medicine.price 
      ? medicine.discountPrice 
      : medicine.price;

    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].price = effectivePrice;

    await cart.save();

    await cart.populate({
      path: "items.medicine",
      select: "name brand price discountPrice stock image category prescriptionRequired",
    });

    res.status(200).json({
      message: "Cart updated successfully",
      cart,
    });
  } catch (error) {
    console.log("Error in updateCartItem controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { medicineId } = req.params;

    const cart = await Cart.findOne({ user: userId, isActive: true });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      item => item.medicine.toString() !== medicineId
    );

    await cart.save();

    await cart.populate({
      path: "items.medicine",
      select: "name brand price discountPrice stock image category prescriptionRequired",
    });

    res.status(200).json({
      message: "Item removed from cart successfully",
      cart,
    });
  } catch (error) {
    console.log("Error in removeFromCart controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId, isActive: true });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({
      message: "Cart cleared successfully",
      cart,
    });
  } catch (error) {
    console.log("Error in clearCart controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get cart item count
export const getCartCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId, isActive: true });
    const count = cart ? cart.totalItems : 0;

    res.status(200).json({ count });
  } catch (error) {
    console.log("Error in getCartCount controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
