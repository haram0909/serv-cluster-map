const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//eventually split the image schema into separate schema
const ImageSchema = new Schema({
    url: String,
    filename: String
});

//using cloudinary api to transform images to thumbnail size and set that as 'thumbnail' virtual property
ImageSchema.virtual('thumbnail').get(function(){
    return this.url.replace('servclustermap/image/upload','servclustermap/image/upload/h_150,w_250');
})

//Mongoose option to pass virtual properties when converting doc to JSON
const opts = { toJSON: { virtuals: true }, timestamps: true };

const ProfileSchema = new Schema({
    account: {
        type: Schema.Types.ObjectId,
        ref: 'Account'
    },
    introduction: String,
    images: [ ImageSchema ],
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
            required: true
        },
        coordinates: {
            type: [Number],
            //comment out to be able to test profile creation
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
}, opts);

//virtual property 'properties' for popup markup of mapbox clustermap
ProfileSchema.virtual('properties.popUpMarkUp').get(function(){
    return `
    <a href="/profiles/${this._id}"> Profile Page</a>
    <p> ${this.availability ? '<strong>Available to Work</strong>' : 'Currently Unavailable to Work'}</p>`
})

//for cursor based pagination, will need unique incremental key index 
//add text index to accountSchema to enable searchability with pagination, with trade-off of added overhead
    //https://docs.mongodb.com/manual/core/index-text/
// ProfileSchema.index({location: 'text'}, {availability: 'text'}, {offerings: 'text'}, {skills: 'text'});

module.exports = mongoose.model('Profile', ProfileSchema);