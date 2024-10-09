import { rateLimit } from 'express-rate-limit';


export const defaultLimiter = rateLimit({
	windowMs: 1 * 60 * 1000,
	limit: 50 ,
	standardHeaders: 'draft-7',
	legacyHeaders: false,

    message: ()=>{
        return {message: "You can only use 20 requests per Minute"}
	}
});