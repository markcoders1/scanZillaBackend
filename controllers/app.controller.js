import Joi from "joi"


const verifyTextJoi = Joi.object({
    title: Joi.string().regex(/^[a-zA-Z0-9,– .:\-\\/&]*$/).min(0).max(200).messages({
        "string.pattern.base":"must be standard ASCII characters only T"
    }),
  
    description: Joi.string().regex(/^[ -~]*$/).min(0).max(1000).messages({
        "string.pattern.base":"must be standard ASCII characters only D"
    }),

    bulletpoints: Joi.string().regex(/^[^A-Za-z0-9 ]*$/).min(0).messages({
        "string.pattern.base":"must be standard ASCII characters only B"
    })
});

export const verifyText =async (req,res)=>{
    try {
        const {title,description,bulletpoints}=req.body
        console.log(req.body)
        const {error} = verifyTextJoi.validate(req.body,{abortEarly:false});
        
        if (error) {
          console.log(error);
          return res.status(200).json({ message: error.details });
        }
        
        return res.status(200).json({message: "text verified"});

    } catch (error) {
        console.log(error)
    }
}


