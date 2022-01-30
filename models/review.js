const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReviewSchema = new Schema({
    body: String,
    rating: Number,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'Account'
    },
    about: {
            type: Schema.Types.ObjectId,
            ref: 'Profile'
    }
},
{ timestamps: true });

module.exports = mongoose.model("Review", ReviewSchema);