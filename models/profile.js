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
    location: String,
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
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
                max: 100,
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
                max: 1000,
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