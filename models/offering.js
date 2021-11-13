const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const OfferingSchema = new Schema({
    service: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
        max: 150
    }
});

module.exports = mongoose.model('Offering', OfferingSchema);