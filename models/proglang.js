const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const ProgLangSchema = new Schema({
    proglang: {
        type: String,
        required: true,
    }
    
});

module.exports = mongoose.model('ProgLang', ProgLangSchema);

