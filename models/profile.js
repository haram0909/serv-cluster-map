const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//eventually split the image schema into separate schema
const ImageSchema = new Schema({
    url: String,
    filename: String
});


const ProfileSchema = new Schema({
    account: {
        type: Schema.Types.ObjectId,
        ref: 'Account'
    },
    introduction: String,
    images: [ImageSchema],
    location: /*String,*/
        //if can opt out of providing location, 
        //geometry should also be allowed to be null
            //else, both should be required 
                //and geometry should handle 
                // cases where fails to forward geocode
    {
        type: String,
        required: [true, 'location is required']
    },
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
            //comment out to be able to test profile creation
            // required: true
        },
        coordinates: {
            type: [Number],
            //comment out to be able to test profile creation
            // required: true
        }
    },
    skills: [
        {
            //changed to plain string 
            //to allow simple insert of new programming languages, etc
            //these arrays are not likely to be massive
            proglang: {
                type: String,
                required: true
            },
            experience: {
                type: Number,
                required: true,
                max: 120,
                min: 0
            }
        }
    ],
    availability: {
        type: Boolean,
        required: true
    },
    offerings: [
        {
            //changed to plain string 
            //to allow simple insert of new programming languages, etc
            //these arrays are not likely to be massive
            service: {
                type: String,
                required: true,
            },
            price: {
                type: Number,
                required: true,
                max: 10000,
                min: 0
            }
        }
    ],
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ]
});

module.exports = mongoose.model('Profile', ProfileSchema);