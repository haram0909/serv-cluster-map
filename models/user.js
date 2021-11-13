const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//eventually split the image schema into separate schema
const ImageSchema = new Schema({
    url: String,
    filename: String
});


const UserSchema = new Schema({
    firstname: {
        type: String,
        required: true,
        maxLength: 80
    },
    lastname: {
        type: String,
        required: true,
        maxLength: 80
    },
    email: {
        type: String,
        required: true,
        unique: true
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
            proglang:{
            type: Schema.Types.ObjectId,
            ref: 'ProgLang'
            },
            experience: {
                type: Number,
                required: true,
                max: 100
            }
        }
    ],
    availability: {
        type: Boolean,
        required: true
    },
    offerings: [
        {
        
                type: Schema.Types.ObjectId,
                ref: 'Offering'

        }
    ],
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ]
});

module.exports = mongoose.model('User', UserSchema);