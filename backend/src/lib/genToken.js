import jwt from "jsonwebtoken";

export const genToken = (userId, res, options = {}) => {
    const cookieName = options.cookieName || "jwt";
    const jwtSecret = process.env.SECRET || process.env.secret;

    if (!jwtSecret) {
        throw new Error("JWT secret is not configured. Set SECRET (or secret) in .env");
    }

    const token = jwt.sign({ userId }, jwtSecret, {
        expiresIn: "7d",
    });

    res.cookie(cookieName, token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    });

    return token;
};