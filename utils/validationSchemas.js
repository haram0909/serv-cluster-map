const Joi = require('joi');



module.exports.joiProfileSchema = Joi.object({
    profile: Joi.object({
        introduction: Joi.string(),
        //images should be array of objects?
        //images: Joi.optional(),
        location: Joi.string().required(),
        geometry: Joi.object().optional(),
        skills: Joi.array().items(Joi.object({
            proglang: Joi.string(),
            experience: Joi.number().min(0).max(120)
            //valid if either have both proglang AND experience or have neither
        }).and('proglang', 'experience'), Joi.object().strip()),
        availability: Joi.boolean().required(),
        offerings: Joi.array().items(Joi.object({
            service: Joi.string(),
            price: Joi.number().min(0).max(10000)
            //valid if either have both service AND price or have neither
        }).and('service', 'price'), Joi.object().strip())
    }).required(),
    deleteImages: Joi.array()
});


module.exports.joiAccountUpdateSchema = Joi.object({
    account: Joi.object({
        firstname: Joi.string().required(),
        lastname: Joi.string().required(),
        email: Joi.string().email({ tlds: false }).required(),
        
    }).required()
});


module.exports.joiAccountRegisterSchema = Joi.object({
    account: Joi.object({
        firstname: Joi.string().required(),
        lastname: Joi.string().required(),
        email: Joi.string().email({ tlds: false }).required(),
        username: Joi.string().required(),
        password: Joi.string()./*.pattern(new RegExp('^[a-zA-Z0-9]{3,30}$'))*/required()
    }).required()/*.with('password','confirm_password')*/
});


module.exports.joiReviewSchema = Joi.object({
    review: Joi.object({
        body: Joi.string().required(),
        rating: Joi.number().min(0).max(5).required()
    }).required()
});