const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const AccountSchema = new Schema({
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
    profile: {
        type: Schema.Types.ObjectId,
        ref: 'Profile'
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ]
});

// passport-local-mongoose plugin will auto add username and password fields automatically
AccountSchema.plugin(passportLocalMongoose);

AccountSchema.virtual('fullname').get(function () {
    return `${this.firstname}, ${this.lastname.charAt(0)}`;
});

module.exports = mongoose.model("Account", AccountSchema);