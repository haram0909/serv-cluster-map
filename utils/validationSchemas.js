const BaseJoi = require('joi');
//basic security 
const sanitizeHtml = require('sanitize-html');

//attaching method to joi to clean strings that gets validated by joi to be sanitized by sanitize-html
const extension = (joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.escapeHTML': '{{#label}} is NOT allowed to include HTML!'
    },
    rules: {
        escapeHTML: {
            validate(value, helpers) {
                const clean = sanitizeHtml(value, {
                    allowedTags: [],
                    allowedAttributes: {},
                });
                if (clean !== value) return helpers.error('string.escapeHTML', { value })
                return clean;
            }
        }
    }
});

const Joi = BaseJoi.extend(extension);


module.exports.joiProfileSchema = Joi.object({
    profile: Joi.object({
        introduction: Joi.string().escapeHTML(),
        //images should be array of objects?
        //images: Joi.optional(),
        location: Joi.string().required().escapeHTML(),
        geometry: Joi.object().optional(),
        skills: Joi.array().items(Joi.object({
            proglang: Joi.string().escapeHTML(),
            experience: Joi.number().min(0).max(120)
            //valid if either have both proglang AND experience or have neither
        }).and('proglang', 'experience'), Joi.object().strip()),
        availability: Joi.boolean().required(),
        offerings: Joi.array().items(Joi.object({
            service: Joi.string().escapeHTML(),
            price: Joi.number().min(0).max(10000)
            //valid if either have both service AND price or have neither
        }).and('service', 'price'), Joi.object().strip())
    }).required(),
    deleteImages: Joi.array()
});


module.exports.joiAccountUpdateSchema = Joi.object({
    account: Joi.object({
        firstname: Joi.string().required().escapeHTML(),
        lastname: Joi.string().required().escapeHTML(),
        email: Joi.string().email({ tlds: false }).required().escapeHTML(),
        
    }).required()
});


module.exports.joiAccountRegisterSchema = Joi.object({
    account: Joi.object({
        firstname: Joi.string().required().escapeHTML(),
        lastname: Joi.string().required().escapeHTML(),
        email: Joi.string().email({ tlds: false }).required().escapeHTML(),
        username: Joi.string().required().escapeHTML(),
        password: Joi.string()./*.pattern(new RegExp('^[a-zA-Z0-9]{3,30}$'))*/required().escapeHTML()
    }).required()/*.with('password','confirm_password')*/
});


module.exports.joiReviewSchema = Joi.object({
    review: Joi.object({
        body: Joi.string().required().escapeHTML(),
        rating: Joi.number().min(0).max(5).required()
    }).required()
});


module.exports.joiSearchProfileSchema = Joi.object({
    'search-type': Joi.string().valid('all', 'location', 'skills', 'offerings', 'introduction').required().escapeHTML(),
    availability: Joi.string().valid('any', 'available', 'unavailable').required().escapeHTML(),
    keyword: Joi.string().required().escapeHTML()
})