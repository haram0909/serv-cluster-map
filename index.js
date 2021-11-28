if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

//packages
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const { joiProfileSchema, joiAccountSchema } = require('./utils/validationSchemas.js');
const session = require('express-session');
const methodOverride = require('method-override');

//dev dependencies
const morgan = require('morgan');

//models
const Profile = require('./models/profile.js');
const Account = require('./models/account.js');
const Review = require('./models/review.js');

//utils
const catchAsync = require('./utils/catchAsync.js');
const ExpressError = require('./utils/ExpressError.js');




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

//https://stackoverflow.com/questions/23259168/what-are-express-json-and-express-urlencoded
//https://newbedev.com/what-is-the-mean-of-bodyparser-urlencoded-extended-true-and-bodyparser-json-in-nodejs
//need to use both .json() and .urlencoded({extended: true}) to handle both form data and JSON API requests 
//express.json() = for requests where header has Content-Type: application/json
//              --> convert text-based JSON into javascript-accessible variables under req.body 
//express.urlencoded({extended: true}) = for  urlencoded requets
//              --> convert urlencoded requests into javascript-accessible variables under req.body
// {extended: true} option -> option to allow converted req.body object to have values of any types instead of just strings 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));



//session configuration 
const secret = process.env.SECRET || '!SomeDevEnvSecret!';

// const store = new MongoDBStore({
//     url: dbUrl,
//     secret,
//     touchAfter: 24 * 60 * 60
// });

// store.on("error", function (e) {
//     console.log("SESSION STORE ERROR", e)
// })

const sessionConfig = {
    //if undefined= memory store, which is barely acceptable for dev env
        //because the memory store disappears when server restart as it is local, not a real db
        // eventually will be replaced with mongodb store (other option = redis, etc)
    // store: store, 
    name: 'session',
    secret: secret,
    //resave false (as was on doc)
        //appears mongoDB session store implements 'touch' method
        // to prevent race conditions hwere client's multiple parallel requests without session 
    resave: false,
    //saveUninitialized false
        //to prevent creating session for crawler bot tapping results in creating sessions
            //also tracking recurring visitors isn't in scope for now
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 30,
        maxAge: 1000 * 60 * 60 * 24 * 30
    }
}

app.use(session(sessionConfig));





//middleware
//dev dependencies
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

//custom middlewares should return at next() to prevent any further code, even if there is, from executing after next()

// --> implement pagination later 
// npm i express-paginate
// https://www.npmjs.com/package/express-paginate



//middleware function
const validateProfile = (req, res, next) => {

    // requires allowUnknown: false option at validate, bc images of "" is type unknown...
    const validationResult = joiProfileSchema.validate(req.body, { abortEarly: false, allowUnknown: true });

    console.log('original req.body = ' + JSON.stringify(req.body));
    console.log('validation result = ' + JSON.stringify(validationResult))
    console.log('cleaned req.body = ' + JSON.stringify(validationResult.value));

    if (validationResult.error) {
        const errMsg = validationResult.error.details.map(item => item.message).join(',');
        //throw new ExpressError(400, errMsg);
        next(new ExpressError(400, errMsg));
    } else {
        res.locals.profile = validationResult.value.profile;
        next();
    }
}

const validateAccount = (req, res, next) => {

    // requires allowUnknown: false option at validate, bc images of "" is type unknown...
    const validationResult = joiAccountSchema.validate(req.body, { abortEarly: false, allowUnknown: true });

    console.log('original req.body = ' + JSON.stringify(req.body));
    console.log('validation result = ' + JSON.stringify(validationResult))
    console.log('cleaned req.body = ' + JSON.stringify(validationResult.value));

    if (validationResult.error) {
        const errMsg = validationResult.error.details.map(item => item.message).join(',');
        //throw new ExpressError(400, errMsg);
        next(new ExpressError(400, errMsg));
    } else {
        res.locals.account = validationResult.value.account;
        next();
    }
}



//routes
app.get('/', (req, res) => {
    res.render('home.ejs');
});

//might want pagination here, instead of full load all....
app.get('/profiles', catchAsync(async (req, res) => {
    const profiles = await Profile.find({}).populate('account');
    res.render('profiles/index.ejs', { profiles });
}));

app.get('/profiles/:id', catchAsync(async (req, res) => {
    const profile = await Profile.findById(req.params.id).populate('account');
    res.render('profiles/show.ejs', { profile });
}));

app.get('/profiles/:id/edit', catchAsync(async (req, res) => {
    const profile = await Profile.findById(req.params.id).populate('account');
    res.render('profiles/edit.ejs', { profile });
}));

//$$$$$$!!!!!!! All profile routes need authorization check before any edit ability

//POST '/profiles' route = ONLY ACCESSIBLE THROUGH GET '/account/:id/profile/new' route  
    //!!!! will have to establish 2way referencing of profile object id and account object id
    //!!!! will break for now, because cannot meet model schema's requirement for now
    //need to have geometry.type path, etc
app.post('/profiles', validateProfile, catchAsync(async (req, res) => {

    //res.locals.accountId = undefined, because res.locals been dropped as soon as they have arrived to this route and the req has been resolved
    // console.log(`current account Id (res.locals.accountId) = ${res.locals.accountId}`);
    console.log(`cleaned new profile = ${JSON.stringify(res.locals.profile)}`);

    // const account = await Account.findById(req.params.id);
    const account = await Account.findById(req.body.accountId);

    //confirm that the account does NOT have a valid linked profile
        const haveProfile = account.profile !== null;
        //  const haveProfile = account.profile ? true : await Profile.findById(account.profile);
        //  const haveProfile = await Profile.findById(account.profile);
        console.log(`Have a profile = ${haveProfile}`);
    if (haveProfile) {
        throw new Error("This Account already has a valid My Profile. An account is not allowed to have more than 1 valid profile.");
    }

    // const profile = new Profile(req.body.profile);
    const profile = new Profile(res.locals.profile);
    //need current session's account 
    //!!!!!!!curr account.profile = profile._id; ** just like seeding

    profile.account = account;
    await profile.save();
    await console.log('saved profile');

    const updatedProfile = await Account.findByIdAndUpdate(req.body.accountId, { profile: profile }, { upsert: true });
    // console.log(`updated profile = ${JSON.stringify(updatedProfile)}`);

    //https://stackoverflow.com/questions/38011068/how-to-remove-object-taking-into-account-references-in-mongoose-node-js
    res.redirect(`/profiles/${profile._id}`);
}));


app.patch('/profiles/:id', validateProfile, catchAsync(async (req, res) => {
    // console.log(`skills = ${req.body.profile.skills.filter(obj => (obj.proglang !== "" && obj.experience !== "" && obj.experience >= 0))}`);
    // console.log(`offerings = ${req.body.profile.offerings.filter(obj => (obj.service !== "" && obj.price !== "" && obj.price >= 0))}`);
    //console.log(`req.body = ${JSON.stringify(req.body)}`);

    const { id } = req.params;
    console.log('req.body = ');
    console.log(req.body);
    console.log('res.locals.profile = ')
    console.log(JSON.stringify(res.locals.profile));

    const profile = await Profile.findByIdAndUpdate(id, { $set: res.locals.profile }, { upsert: true, new: true });
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
}));


app.delete('/profiles/:id', catchAsync(async (req, res) => {
    const { id } = req.params;
    const profileToDelete = await Profile.findById(id);

    console.log(`Profile to be deleted = ${JSON.stringify(profileToDelete)}`);
    if (profileToDelete === null) {
        throw new ExpressError(400, 'This is NOT a valid profile');   
    }

    if (profileToDelete.reviews.length > 0) {
        console.log('Deleting linked reviews');
        await Review.deleteMany({ _id: { $in: profileToDelete.reviews } });
    }
    console.log('There is no reviews linked to this profile');
    
    console.log('Deleting target profile');
    await Profile.findByIdAndDelete(id);
    // console.log(`Account id to delete this profile from = ${req.body.accountId}`);

    //set the profile linked account's profile property to null -> allow the account to create new profile
    await Account.findByIdAndUpdate(req.body.accountId, { profile: null });
    res.redirect('/profiles');
}));





app.get('/account/login', async (req, res) => {
    res.render('accounts/login.ejs');
});

// will have to implement authtentication logic below
app.post('/account/login', async (req, res) => {
    console.log('successfully logged in!');
    res.redirect('/profiles');
});

app.get('/account/register', async (req, res) => {
    res.render('accounts/register.ejs');
});

app.post('/account/register', validateAccount, catchAsync(async (req, res) => {
    // console.log(req.body);
    // console.log(`new account = ${JSON.stringify(req.body.account)}`);
    console.log('req.body = ');
    console.log(req.body);
    console.log('res.locals.account = ')
    console.log(JSON.stringify(res.locals.account));

    const account = new Account(res.locals.account);
    await account.save();
    res.redirect(`/account/${account._id}`);
}));


//my account info - first name, last name, email account
// will eventually have to update navbar to enable this
app.get('/account/:id', catchAsync(async (req, res) => {

    // console.log('Inside of account/:id - setting res.locals.accountId = ')
    // res.locals.accountId = req.params.id;
    // console.log(res.locals.accountId);

    const account = await Account.findById(req.params.id).populate('profile');

    //an account may only have 1 profile = this will check whether the account has a valid profile
    //if not, the account will be able to create a new profile
    //if does, the account will be able to navigate to the profile & edit 
         const haveProfile = account.profile !== null;
        //  const haveProfile = account.profile ? true : await Profile.findById(account.profile);
        //  const haveProfile = await Profile.findById(account.profile);
    //const haveProfile = await Profile.findById(account.profile);
     console.log(`Have a profile = ${haveProfile}`);

    res.render('accounts/show.ejs', { account, haveProfile });
}));

//edit account - first name, last name, email account + can DELETE my profile
app.get('/account/:id/edit', catchAsync(async (req, res) => {
    // console.log('Inside of account/:id/edit - accessing res.locals.accountId set from account/:id GET = ');
    // console.log(res.locals.accountId);

    const account = await Account.findById(req.params.id);
    //will NOT send entire profile object to save data & bc not needed to
        const haveProfile = account.profile !== null;
        //  const haveProfile = account.profile ? true : await Profile.findById(account.profile);
        //  const haveProfile = await Profile.findById(account.profile);
    //const haveProfile = await Profile.findById(account.profile);
     console.log(`Have a profile = ${haveProfile}`);

    res.render('accounts/edit.ejs', { account, haveProfile });
}));

//updates account info
app.patch('/account/:id', validateAccount, catchAsync(async (req, res) => {
    // console.log(`req.body = ${JSON.stringify(req.body)}`);
    const { id } = req.params;
    // const account = await Account.findByIdAndUpdate(id, { $set: updateProfile }, { new: true });
    const account = await Account.findByIdAndUpdate(id, { $set: res.locals.account }, { new: true });
    console.log(`Updated account = ${account}`);
    res.redirect(`/account/${account._id}`);
}));

app.delete('/account/:id', catchAsync(async (req, res) => {

    const profileToDelete = await Profile.findById(req.body.profileId);
    if (profileToDelete === null) {
        console.log('There was no valid profile connected to this account');
    }else{
        console.log("Deleting the account's profile and reviews on the profile");
        await Review.deleteMany({ _id: { $in: profileToDelete.reviews } });
        await Profile.findByIdAndDelete(req.body.profileId);
    }
    
    
    await Account.findByIdAndDelete(req.params.id);
    res.redirect(`/profiles`);

}));

//$$$$$$!!!!!!! All profile routes need authorization check before any edit ability
//should only be allowed when current account does NOT have profile
app.get('/account/:id/profile/new', async (req, res) => {
    const accountId = req.params.id;
    

    //have the logic check the current account does NOT have a valid profile
    res.render('profiles/new.ejs', { accountId });
});



//routes for reviews











//artificial error
app.get('/error', (req, res) => {
    throw new Error("Artifially created error on path /error");

});

//404 route
app.all('*', (req, res, next) => {
    //throw new ExpressError(404, 'Oh no, 404! There seems to be nothing here');
    next(new ExpressError(404, 'Oh no, 404! There seems to be nothing here'));
});

//500s route 
//error handling middleware
app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = "Oh no! Something went wrong!"
    res.status(statusCode).render('error.ejs', { err });
    // res.status(statusCode).send(err.message);
    //all errors have name in express ex) err.name
    //possible to rely on default express error handler by simply passing next(err);

    //without next(), when error gets handled by this middleware, nothing afterwill happen.
    //it will just stop here & next chains of middlewares or route handlers will not run
    //if pass anything to next(), it will be regarded as error

    //next(err) or next() with any parameter will trigger error handling middleware
    //thus, it is possible to chain multiple error handlers

    //return next() or return next(err) to stop the execution of the rest of the code

    //having res.send will send response to the request, thus that req's cycle will come to an end. 
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});