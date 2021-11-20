if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

//packages
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');

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


//should only be allowed when current account does NOT have profile
app.get('/profiles/new', async (req, res) => {
    res.render('profiles/new.ejs');
});

//!!!! will break for now, because cannot meet model schema's requirement for now
//need to have availability path
//need to have geometry.type path, etc
app.post('/profiles', async (req, res) => {
    //the created profile will have to be added to the account
    // const profile = await Profile.findById(req.params.id).populate('account');
    console.log(req.body);
    //set separated availability path and add to profile
    req.body.profile.availability = req.body.availability;
    console.log(`new profile = ${JSON.stringify(req.body.profile)}`);

    //build up profile obj just like edit route, and also have filterings
    const profile = new Profile(req.body.profile);
    //need current session's account 
    //!!!!!!!curr account.profile = profile._id; ** just like seeding
    await profile.save();
    res.redirect(`/profiles/${profile._id}`);
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
    // console.log(`req.body = ${JSON.stringify(req.body)}`);

    const { id } = req.params;
    //build up an obj with properties to update, based on form data
    //will have to handle other referencing properties...
    const updateProfile = {
        introduction: req.body.profile.introduction,
        location: req.body.profile.location,

        //should be an array of objects
        //should flash messages for items that did not meet criteria or send back
        //instead of filtering on behald in the back without explanation
        skills: req.body.profile.skills.filter(obj => (obj.proglang !== "" && obj.experience !== "" && obj.experience >= 0)),

        //should be boolean
        availability: req.body.availability,

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
    const doc = await Profile.findById(id);
    await Review.deleteMany({ _id: { $in: doc.reviews } });

    //no need to delete objectid from Account, as it is only 1 field
    //& the logic to allow for profile creation could be 
    // checking whether the objectid stored(if exists on the account.profile) exists from the profiles collection
    //if it does NOT, then can create an object, at the time, the account's profile's objectid will be updated

    //Account will NOT be auto deleted, when profile gets deleted.
    //await Review.deleteMany({_id: {$in: doc.reviews} })
    await Profile.findByIdAndDelete(id);
    res.redirect('/profiles')
})











const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});