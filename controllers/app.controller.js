import Joi from "joi"

const verifyTextJoi = Joi.object({
    title: Joi.string().regex(/^[a-zA-Z0-9,.: ]*$/).min(0).max(200).messages({
        "string.pattern.base":"must be standard ASCII characters only"
    }),
  
    description: Joi.string().regex(/^[ -~]*$/).min(0).max(1000).messages({

    }),

    bulletpoints: Joi.string().min(0).messages({

    })
});

export const verifyText =async (req,res)=>{
    try {
        const {title,description,bulletpoints}=req.body
        const {error} = verifyTextJoi.validate(req.body,{abortEarly:true});
        
        if (error) {
          console.log(error);
          return res.status(400).json({ message: error.details.message });
        }
        
        return res.status(200).json({message: "text verified"});

    } catch (error) {
        console.log(error)
    }
}
