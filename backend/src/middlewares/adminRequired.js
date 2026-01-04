export const adminRequired = (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ 
        message: "Access denied. Admin privileges required." 
      });
    }
    next();
  } catch (error) {
    console.log("Error in admin middleware", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
