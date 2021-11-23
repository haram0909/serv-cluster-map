if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

//packages
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');

//dev dependencies
const morgan = require('morgan');

//models
const Profile = require('./models/profile.js');
const Account = require('./models/account.js');
const Review = require('./models/review.js');




const mongoDbUrl = process.env.MONGO_DB_URL || 'mongodb://localhost:27017/serv-cluster-map'
//doc's recommandation = https://mongoosejs.com/docs/index.html
connectToMongoDB().catch(err => console.log(err));
//https://mongoosejs.com/docs/migrating_to_6.html#no-more-deprecation-warning-options
async function connectToMongoDB() {
    await mongoose.connect(mongoDbUrl);
    console.log('MongoDb connection SUCCESS');
}




const app = express();

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));


//middleware
//dev dependencies
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

//custom middlewares should return at next() to prevent any further code, even if there is, from executing after next()

// --> implement pagination later 
// npm i express-paginate
// https://www.npmjs.com/package/express-paginate




//routes
app.get('/', (req, res) => {
    res.render('home.ejs');
});

app.get('/profiles', async (req, res) => {
    const profiles = await Profile.find({}).populate('account');
    res.render('profiles/index.ejs', { profiles });
});



app.get('/profiles/:id', async (req, res) => {
    const profile = await Profile.findById(req.params.id).populate('account');
    res.render('profiles/show.ejs', { profile });
});

app.get('/profiles/:id/edit', async (req, res) => {
    const profile = await Profile.findById(req.params.id).populate('account');
    res.render('profiles/edit.ejs', { profile });
});


app.patch('/profiles/:id', async (req, res) => {
    // console.log(`skills = ${req.body.profile.skills.filter(obj => (obj.proglang !== "" && obj.experience !== "" && obj.experience >= 0))}`);
    // console.log(`offerings = ${req.body.profile.offerings.filter(obj => (obj.service !== "" && obj.price !== "" && obj.price >= 0))}`);
    //console.log(`req.body = ${JSON.stringify(req.body)}`);

    const { id } = req.params;
    const updateProfile = {
        introduction: req.body.profile.introduction,
        location: req.body.profile.location,
        //should be an array of objects
        //should flash messages for items that did not meet criteria or send back
        //instead of filtering out in the back without explanation
        skills: req.body.profile.skills.filter(obj => (obj.proglang !== "" && obj.experience !== "" && obj.experience >= 0)),

        //should be boolean
        availability: req.body.profile.availability,

        //should be an array of objects
        //should flash messages for items that did not meet criteria or send back
        //instead of filtering on behald in the back without explanation
        offerings: req.body.profile.offerings.filter(obj => (obj.service !== "" && obj.price !== "" && obj.price >= 0)),
    };

    console.log('type of availability of patch = ');
    console.log(typeof updateProfile.availability);
    const profile = await Profile.findByIdAndUpdate(id, { $set: updateProfile }, { upsert: true, new: true });
    console.log(`Updated profile = ${profile}`);
    //need current session's account 
    //curr account.profile = profile._id; ** just like seeding

    // const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    // campground.images.push(...imgs);
    // await campground.save();
    // if (req.body.deleteImages) {
    //     for (let filename of req.body.deleteImages) {
    //         await cloudinary.uploader.destroy(filename);
    //     }
    //     await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
    // }


    res.redirect(`/profiles/${profile._id}`);
});


app.delete('/profiles/:id', async (req, res) => {
    const { id } = req.params;
    const profileToDelete = await Profile.findById(id);
    await Review.deleteMany({ _id: { $in: profileToDelete.reviews } });
    // console.log(`Profile to be deleted = ${JSON.stringify(profileToDelete)}`);
    await Profile.findByIdAndDelete(id);
    // console.log(`Account id to delete this profile from = ${req.body.accountId}`);

    //set the profile linked account's profile property to null -> allow the account to create new profile
    await Account.findByIdAndUpdate(req.body.accountId, { profile: null });
    res.redirect('/profiles');
})





app.get('/account/login', async (req, res) => {
    res.render('accounts/login.ejs');
})

// will have to implement authtentication logic below
app.post('/account/login', async (req, res) => {
    console.log('successfully logged in!');
    res.redirect('/profiles');
})

app.get('/account/register', async (req, res) => {
    res.render('accounts/register.ejs');
})

app.post('/account/register', async (req, res) => {
    // console.log(req.body);
    // console.log(`new account = ${JSON.stringify(req.body.account)}`);
    const account = new Account(req.body.account);
    await account.save();
    res.redirect(`/account/${account._id}`);
});


//my account info - first name, last name, email account
// will eventually have to update navbar to enable this
app.get('/account/:id', async (req, res) => {
    const account = await Account.findById(req.params.id).populate('profile');

    //an account may only have 1 profile = this will check whether the account has a valid profile
    //if not, the account will be able to create a new profile
    //if does, the account will be able to navigate to the profile & edit 
    const haveProfile = account.profile ? true : await Profile.findById(account.profile);
    // console.log(`Have a profile = ${haveProfile}`);

    res.render('accounts/show.ejs', { account, haveProfile });
})

//edit account - first name, last name, email account
app.get('/account/:id/edit', async (req, res) => {
    const account = await Account.findById(req.params.id);
    const haveProfile = account.profile ? true : await Profile.findById(account.profile);
    // console.log(`Have a profile = ${haveProfile}`);

    res.render('accounts/edit.ejs', { account, haveProfile });
})

//updates account info
app.patch('/account/:id', async (req, res) => {
    // console.log(`req.body = ${JSON.stringify(req.body)}`);
    const { id } = req.params;
    const updateProfile = {
        firstname: req.body.account.firstname,
        lastname: req.body.account.lastname,
        email: req.body.account.email
    };
    const account = await Account.findByIdAndUpdate(id, { $set: updateProfile }, { new: true });
    // console.log(`Updated account = ${account}`);
    res.redirect(`/account/${account._id}`);
})


//$$$$$$!!!!!!! All profile routes need authorization check before any edit ability


//should only be allowed when current account does NOT have profile
app.get('/account/:id/profile/new', async (req, res) => {
    const accountId = req.params.id;
    console.log(JSON.stringify(res.body));

    //have the logic check the current account does NOT have a valid profile
    res.render('profiles/new.ejs', { accountId });
});

//!!!! will have to establish 2way referencing of profile object id and account object id
//!!!! will break for now, because cannot meet model schema's requirement for now
//    &&&& there is no 2way referencing established before redirection
//need to have availability path
//need to have geometry.type path, etc
app.post('/profiles', async (req, res) => {
    //the created profile will have to be added to the account
    // const profile = await Profile.findById(req.params.id).populate('account');
    // console.log(req.body);

    //set separated availability path and add to profile
    //req.body.profile.availability = req.body.availability;
    // console.log(`new profile = ${JSON.stringify(req.body.profile)}`);



    req.body.profile.skills = req.body.profile.skills.filter(obj => (obj.proglang !== "" && obj.experience !== "" && obj.experience >= 0));
    req.body.profile.offerings = req.body.profile.offerings.filter(obj => (obj.service !== "" && obj.price !== "" && obj.price >= 0));
    console.log(`cleaned new profile = ${JSON.stringify(req.body.profile)}`);

    const account = await Account.findById(req.body.accountId);

    //confirm that the account does NOT have a valid linked profile
    const haveProfile = account.profile ? true : await Profile.findById(account.profile);
    if (haveProfile) {
        throw new Error("This Account already has a valid My Profile. An account is not allowed to have more than 1 valid profile.");
    }


    const profile = new Profile(req.body.profile);
    //need current session's account 
    //!!!!!!!curr account.profile = profile._id; ** just like seeding

    profile.account = account;
    await profile.save();
    await console.log('saved profile');

    const updatedProfile = await Account.findByIdAndUpdate(req.body.accountId, { profile: profile }, { upsert: true });
    // console.log(`updated profile = ${JSON.stringify(updatedProfile)}`);

    //https://stackoverflow.com/questions/38011068/how-to-remove-object-taking-into-account-references-in-mongoose-node-js
    res.redirect(`/profiles/${profile._id}`);
});

app.delete('/account/:id', async (req, res) => {

    const profileToDelete = await Profile.findById(req.body.profileId);
    await Review.deleteMany({ _id: { $in: profileToDelete.reviews } });
    await Profile.findByIdAndDelete(req.body.profileId);
    await Account.findByIdAndDelete(req.params.id);

    res.redirect(`/profiles`);

});







//artificial error
app.get('/error', (req, res) => {
    throw new Error("Artifially created error on path /error");

})

//404 route
app.use((req, res) => {
    res.status(404).send('There seems to be nothing here! 404 NOT FOUND');
})

//500s route error handling middleware
app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = "Oh no! Something went wrong! A Server-side Error occured!"
    // res.status(statusCode).render('error', { err });
    res.status(statusCode).send(err.message);
    //all errors have name in express ex) err.name
    //possible to rely on default express error handler by simply passing next(err);

    //without next(), when error gets handled by this middleware, nothing afterwill happen.
    //it will just stop here & next chains of middlewares or route handlers will not run
    //if pass anything to next(), it will be regarded as error

    //next(err) or next() with any parameter will trigger error handling middleware
    //thus, it is possible to chain multiple error handlers

    //return next() or return next(err) to stop the execution of the rest of the code

    //having res.send will send response to the request, thus that req's cycle will come to an end. 
})


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});