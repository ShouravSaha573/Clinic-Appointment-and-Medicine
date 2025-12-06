import {validateUserSchema} from "../lib/validateUserSchema.js";

export const validate =(req,res,next)=>{
    const parseResult = validateUserSchema.safeParse(req.body);
    if(!parseResult.success){
        return res.status(400).json({
            errors:parseResult.error.format()
        });
    }
    req.userData = parseResult.data;
    next();

}
