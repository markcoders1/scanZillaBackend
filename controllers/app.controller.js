import Joi from "joi"

const verifyTextJoi = Joi.object({
    title: Joi.string().regex(/^[a-zA-Z0-9,.: ]*$/).messages({
        "string.pattern.base":"must be standard ASCII characters only"
    }),
  
    description: Joi.string().regex(/^[ -~]*$/).messages({

    }),

    bulletpoints: Joi.string().messages({

    })
});

const verifyText =(req,res)=>{
    const {title,description,bulletpoints}=req.body
    console.log(title)
    console.log(description)
    console.log(bulletpoints)
    const {error} = verifyTextJoi.validate(req.body);
    if (error) {
      console.log(error);
      return res.status(400).json({ message: error.details });
    } else {

      return res.status(200).json({message: "User registered Successfully"});
    }

}

export default verifyText
