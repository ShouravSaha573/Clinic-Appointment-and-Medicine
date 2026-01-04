import {z} from "zod";

export const validateUserSchema = z.object({
    fullName: z.string().min(1,"Name required"),
    email:z.string().email("Invalid email"),
    password:z.string().min(4,"Password must be 4-8 characters").max(8,"Password must be 4-8 characters"),
    profilePic:z.string().optional(),
});

