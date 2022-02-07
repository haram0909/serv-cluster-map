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
},
{ timestamps: true });

// passport-local-mongoose plugin will auto add username and password fields automatically
    //also gives methods such as .register, etc 
AccountSchema.plugin(passportLocalMongoose);

AccountSchema.virtual('fullname').get(function () {
    return `${this.firstname}, ${this.lastname.charAt(0)}`;
});

//for cursor based pagination, will need unique incremental key index 
//add text index to accountSchema to enable searchability with pagination, with trade-off of added overhead
    //https://docs.mongodb.com/manual/core/index-text/
    // AccountSchema.index({firstname: 'text'}, {lastname: 'text'});

module.exports = mongoose.model("Account", AccountSchema);