if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

//packages
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const { joiProfileSchema, joiAccountUpdateSchema, joiAccountRegisterSchema, joiReviewSchema } = require('./utils/validationSchemas.js');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');

//dev dependencies
const morgan = require('morgan');

//models
const Profile = require('./models/profile.js');
const Account = require('./models/account.js');
const Review = require('./models/review.js');

//utils
const catchAsync = require('./utils/catchAsync.js');
const ExpressError = require('./utils/ExpressError.js');
const account = require('./models/account.js');




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
        // to prevent race conditions where client's multiple parallel requests without session 
    resave: false,
    //saveUninitialized false
        //to prevent creating session for crawler bot tapping results in creating sessions
        //also tracking recurring visitors isn't in scope for now
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        //to allow http, instead of forcing https
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 30,
        maxAge: 1000 * 60 * 60 * 24 * 30
    }
}

//session should be initialized before initialize passport
app.use(session(sessionConfig));
app.use(flash());


//passport configuration
//doc = http://www.passportjs.org/docs/configure/
app.use(passport.initialize());
//passport.session allows persistant login session
app.use(passport.session());
//Account model inherits methods, including .authenticate() 
    //from plugging in passport-local-mongoose to Account model
passport.use(new LocalStrategy(Account.authenticate()));

//enable storing an account in a session
passport.serializeUser(Account.serializeUser());
//enable pulling an account out of a session
passport.deserializeUser(Account.deserializeUser());


//middleware
//dev dependencies
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

//custom middlewares should return at next() to prevent any further code, even if there is, from executing after next()

// --> implement pagination later 
// npm i express-paginate
// https://www.npmjs.com/package/express-paginate

app.use((req, res, next) => {
    //if there is anything under req.flash.success,
    //set that under res.locals.sucessMsg & pass along to destination path
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currentAccount = req.user;
    next();
})

//middleware function
const validateProfile = (req, res, next) => {
    // requires allowUnknown: false option at validate, bc images of "" is type unknown...
    const validationResult = joiProfileSchema.validate(req.body, { abortEarly: false, allowUnknown: true });

    if (validationResult.error) {
        const errMsg = validationResult.error.details.map(item => item.message).join(',');
        //throw new ExpressError(400, errMsg);
        next(new ExpressError(400, errMsg));
    } else {
        res.locals.profile = validationResult.value.profile;
        next();
    }
}

const validateAccountUpdate = (req, res, next) => {
    // requires allowUnknown: false option at validate, bc images of "" is type unknown...
    const validationResult = joiAccountUpdateSchema.validate(req.body, { abortEarly: false, allowUnknown: true });

    if (validationResult.error) {
        const errMsg = validationResult.error.details.map(item => item.message).join(',');
        //throw new ExpressError(400, errMsg);
        next(new ExpressError(400, errMsg));
    } else {
        res.locals.account = validationResult.value.account;
        next();
    }
}

const validateAccountRegister = (req, res, next) => {
    // requires allowUnknown: false option at validate, bc images of "" is type unknown...
    const validationResult = joiAccountRegisterSchema.validate(req.body, { abortEarly: false, allowUnknown: true });

    if (validationResult.error) {
        const errMsg = validationResult.error.details.map(item => item.message).join(',');
        //throw new ExpressError(400, errMsg);
        next(new ExpressError(400, errMsg));
    } else {
        res.locals.account = validationResult.value.account;
        next();
    }
}

const validateReview = (req, res, next) => {
    // requires allowUnknown: false option at validate, bc images of "" is type unknown...
    const validationResult = joiReviewSchema.validate(req.body, { abortEarly: false, allowUnknown: true });

    if (validationResult.error) {
        const errMsg = validationResult.error.details.map(item => item.message).join(',');
        //throw new ExpressError(400, errMsg);
        next(new ExpressError(400, errMsg));
    } else {
        res.locals.review = validationResult.value.review;
        next();
    }
}

const isLoggedIn = (req, res, next) => {
    //updated to use .isAuthenticated() method from passport
        //instead of checking for res.locals.currentAccount exists
    if (!req.isAuthenticated()) {

         //save the original url that was requested
        req.session.returnTo = req.originalUrl

        const errMsg = 'Needs to be logged in first!'
        // next(new ExpressError(400, errMsg));
        req.flash('error', errMsg);
        return res.redirect('/account/login')
    } else {
        console.log('Logged in account exists');
        next();
    }
}


const isAccountOwner = (req, res, next) => {

    if (!res.locals.currentAccount._id.equals(req.params.id)) {
        req.flash('error', 'Cannot interact with accounts that is not yours!');
        return res.redirect(`/profiles`);
    } else{
        console.log('isAccountOwner = TRUE');
        next();
    }
}

const isProfileOwner = (req, res, next) => {

    //check whether the currentAccount has a profile AND ALSO is the owner of this profile
    if (res.locals.currentAccount.profile && req.params.id === res.locals.currentAccount.profile.toString()) {
        console.log('IS the profile owner');
        console.log();
        next();
    }else{
        console.log('NOT the profile owner');
        req.flash('error', 'Only the owner of the profile can do that!');
        return res.redirect(`/profiles`);
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
    if (!profile) {
        req.flash('error', 'Cannot find that profile!');
        return res.redirect('/profiles');
    }
    //check whether the currentAccount is the owner of this profile to pass ownership flag or not
    const isProfileOwner = (res.locals.currentAccount && res.locals.currentAccount._id.equals(profile.account._id));  
   
    const reviewsForProfile = await Review.find({ 'about': req.params.id }).populate({ path: 'author', select: 'firstname lastname _id' });
    res.render('profiles/show.ejs', { profile, reviewsForProfile, isProfileOwner });
}));


app.get('/profiles/:id/edit', isLoggedIn, isProfileOwner, catchAsync(async (req, res) => {
    const profile = await Profile.findById(req.params.id).populate('account');
    if (!profile) {
        req.flash('error', 'Cannot find that profile!');
        return res.redirect('/profiles');
    }
    res.render('profiles/edit.ejs', { profile });
}));


//POST '/profiles' route = ONLY ACCESSIBLE THROUGH GET '/account/:id/profile/new' route  
//!!!! will break for now, because cannot meet model schema's requirement for now
//need to have geometry.type path, etc
app.post('/profiles', isLoggedIn, validateProfile, catchAsync(async (req, res) => {
    const account = await Account.findById(req.body.accountId);

    //authorization : check whether the currentAccount is the owner of the account to create the profile
        if (!res.locals.currentAccount._id.equals(account._id)) {
            req.flash('error', 'Cannot create profile of other accounts!');
            return res.redirect(`/profiles`)
        }

    //confirm that the account does NOT have a valid linked profile
    const haveProfile = (account.profile !== null) && (account.profile !== undefined);
    if (haveProfile) {
        // throw new Error("This Account already has a valid My Profile. An account is not allowed to have more than 1 valid profile.");
        req.flash('error', 'This Account already has a valid profile. An account is not allowed to have more than 1 valid profile.');
        return res.redirect(`/account/${account._id}`);
    }

    //link the currentAccount with the newly created profile
    const profile = new Profile(res.locals.profile);
    profile.account = account;
    await profile.save();
   
    //link the newly created profile to the currentAccount
    await Account.findByIdAndUpdate(req.body.accountId, { profile: profile }, { upsert: true });

    req.flash('success', 'Successfully created my profile!');
    //https://stackoverflow.com/questions/38011068/how-to-remove-object-taking-into-account-references-in-mongoose-node-js
    res.redirect(`/profiles/${profile._id}`);
}));


app.patch('/profiles/:id', isLoggedIn, isProfileOwner, validateProfile, catchAsync(async (req, res) => {
    const updatedProfile = await Profile.findByIdAndUpdate(req.params.id, { $set: res.locals.profile }, { upsert: true, new: true });

    //!!!! implement image upload here

    // const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    // campground.images.push(...imgs);
    // await campground.save();
    // if (req.body.deleteImages) {
    //     for (let filename of req.body.deleteImages) {
    //         await cloudinary.uploader.destroy(filename);
    //     }
    //     await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
    // }

    if (!updatedProfile) {
        req.flash('error', 'Failed to update! Cannot find that profile!');
        return res.redirect('/profiles');
    }

    req.flash('success', 'Successfully updated my profile!')
    res.redirect(`/profiles/${updatedProfile._id}`);
}));


app.delete('/profiles/:id', isLoggedIn, isProfileOwner, catchAsync(async (req, res) => {
    
    const profileToDelete = await Profile.findById(req.params.id);

    if (!profileToDelete) {
        req.flash('error', 'Failed to delete! Cannot find that profile!');
        return res.redirect('/profiles');
    }

    //delete reviews written on the profile to delete, if any
    if (profileToDelete.reviews.length > 0) {
        await Review.deleteMany({ _id: { $in: profileToDelete.reviews } });
        req.flash('success', 'Successfully deleted reviews on the profile.');
    } else {
        req.flash('success', 'There was no reviews on the profile.');
    }

    await Profile.findByIdAndDelete(req.params.id);
  
    //set the profile linked account's profile property to null -> allow the account to create new profile
    await Account.findByIdAndUpdate(req.body.accountId, { profile: null });
    req.flash('success', 'Successfully deleted the profile!');
    res.redirect('/profiles');
}));




//routes for reviews
app.post('/profiles/:id/review', isLoggedIn, validateReview, catchAsync(async (req, res) => {
    const profile = await Profile.findById(req.params.id).populate('reviews');
    if (!profile) {
        req.flash('error', 'Cannot find the profile to add this review!');
        return res.redirect('/profiles');
    }

    const account = await Account.findById(res.locals.currentAccount._id);
    if (!account) {
        req.flash('error', 'Cannot find the account that is attempting to leave a review!');
        return res.redirect('/profiles');
    }

    //this now validates whether the current account exists as an author of any of the reviews for this profile...
    let wroteReview = false;
    for (let review of profile.reviews) {
        if (review.author._id.equals(res.locals.currentAccount._id)) {
            wroteReview = true;
            break;
        }
    }
    // An account is only allowed to leave 1 review for a profile
    if (wroteReview) {
        req.flash('error', 'Cannot leave more than 1 review for a profile!');
        return res.redirect(`/profiles/${req.params.id}`)
    }

   //create new review 
    const review = new Review(res.locals.review);
    review.about = req.params.id;
    review.author = res.locals.currentAccount._id;
    await review.save();

    //add new review to reviews array of profile
    profile.reviews.push(review);
    await profile.save();

    //add new review to reviews array of account
    account.reviews.push(review);
    await account.save()

    req.flash('success', 'Successfully added a new review to this profile!');
    res.redirect(`/profiles/${profile._id}`);
}));


app.delete('/profiles/:id/review', isLoggedIn, catchAsync(async (req, res) => {
    const reviewToDelete = await Review.findById(req.body.reviewId).populate({ path: 'author', select: '_id' }).populate({ path: 'about', select: '_id' });

    //check whether the author(owner) of the review is currentAccount
    if (!res.locals.currentAccount._id.equals(reviewToDelete.author._id)) {
        req.flash('error', 'Cannot delete reviews written by others!');
        return res.redirect(`/profiles/${req.params.id}`)
    }
    
    if (!reviewToDelete) {
        req.flash('error', 'Failed to delete! Cannot find that review!');
        return res.redirect(`/profiles/${req.params.id}`);
    }

    //delete the review from the account that wrote the review
    const authorAccount = await Account.findByIdAndUpdate(reviewToDelete.author._id, { $pull: { reviews: req.body.reviewId } });
    
    //delete the review from the profile the review was written for
    const reviewedProfile = await Profile.findByIdAndUpdate(reviewToDelete.about._id, { $pull: { reviews: req.body.reviewId } });
 
    //delete the review
    await Review.findByIdAndDelete(req.body.reviewId);

    req.flash('success', 'Successfully deleted reviews on the profile.');
    res.redirect(`/profiles/${req.params.id}`);
}));

//need edit review route - patch? 
//--> needs form and view for review edit... will skip Edit for now... 
//need to check if logged in 
//need to check if have authority to edit
//find the review from reviews array and update
//flash msg & redirect 
// app.patch('/profiles/:id/review', isLoggedIn, validateReview, catchAsync(async (req, res)=> {
//         // console.log(`skills = ${req.body.profile.skills.filter(obj => (obj.proglang !== "" && obj.experience !== "" && obj.experience >= 0))}`);
//         // console.log(`offerings = ${req.body.profile.offerings.filter(obj => (obj.service !== "" && obj.price !== "" && obj.price >= 0))}`);
//         //console.log(`req.body = ${JSON.stringify(req.body)}`);

//         const { id } = req.params;
//         console.log('req.body = ');
//         console.log(req.body);
//         console.log('res.locals.profile = ');
//         console.log(JSON.stringify(res.locals.profile));

//         const profile = await Profile.findByIdAndUpdate(id, { $set: res.locals.profile }, { upsert: true, new: true });
//         console.log(`Updated profile = ${profile}`);
//         //need current session's account 
//         //curr account.profile = profile._id; ** just like seeding

//         // const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
//         // campground.images.push(...imgs);
//         // await campground.save();
//         // if (req.body.deleteImages) {
//         //     for (let filename of req.body.deleteImages) {
//         //         await cloudinary.uploader.destroy(filename);
//         //     }
//         //     await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
//         // }
//         if (!profile) {
//             req.flash('error', 'Failed to update! Cannot find that profile!');
//             return res.redirect('/profiles');
//         }

//         req.flash('success', 'Successfully updated my profile!')
//         res.redirect(`/profiles/${profile._id}`);
//     }));




//routes for account
app.get('/account/login', async (req, res) => {

    //check if the user is already logged in
    if (req.user) {
        req.flash('error', 'You are already logged in as this account.')
        return res.redirect(`/account/${req.user._id}`);
    }

    res.render('accounts/login.ejs');
});


//user will be redirected back to where they were initially asked to login, if they got redirected to login 
app.post('/account/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/account/login' }), async (req, res) => {
    req.flash('success', 'Successfully logged in!');

    //clean out /review portion to redirect back to /profile/:id, if the req was POST to /profile/:id/review
    if(req.session.returnTo){
        req.session.returnTo = req.session.returnTo.replace('/review','');
    }

    //if req.session.returnTo is falsy, redirect to /profiles path
    const redirectUrl = req.session.returnTo || '/profiles';
  
    //clean the req.session.returnTo data by setting it back to undefined
    req.session.returnTo = undefined;

    res.redirect(redirectUrl);
});


app.get('/account/logout', (req, res) => {
    //check if there even is any currentAccount logged in
    if (!req.user) {
        req.flash('error', 'No account is currently logged in.');
        return res.redirect('/account/login')
    }

    req.logout();
    req.flash('success', 'Successfully logged out');
    res.redirect('/profiles');
})


app.get('/account/register', async (req, res) => {
    res.render('accounts/register.ejs');
});


app.post('/account/register', validateAccountRegister, catchAsync(async (req, res) => {

    try {
        const password = res.locals.account.password;
        const account = new Account(res.locals.account);
        const registeredAccount = await Account.register(account, password);
        
        //immediately enter logged in session for the newly registered account
        req.login(registeredAccount, function(err) {
            if (err) {
              console.log(err);
              req.flash('error', 'Failed to login for registered account. Please try logging in through Login page from navigation bar.');
            }
          });

        // await account.save(); -> because .register method would have already saved
        req.flash('success', 'Successfully created a new account!');
        return res.redirect(`/account/${registeredAccount._id}`);
    } catch (err) {
        req.flash('error', err.message);
        return res.redirect('/account/register');
    }
}));


app.get('/account/:id', isLoggedIn, isAccountOwner, catchAsync(async (req, res) => {
    const account = await Account.findById(req.params.id).populate('profile');
    if (!account) {
        req.flash('error', 'Cannot find that account!');
        return res.redirect('/profiles');
    }

    //check whether the account has a valid profile or not
        //if not, the account will be able to create a new profile
        //if does, the account will be able to navigate to the profile & edit
    //need to account where account.profile does not exists = undefined, which is different from null 
    //account.profile should be NEITHER null nor undefined
    const haveProfile = (account.profile !== null) && (account.profile !== undefined);

    res.render('accounts/show.ejs', { account, haveProfile });
}));


app.get('/account/:id/edit', isLoggedIn, isAccountOwner, catchAsync(async (req, res) => {
    const account = await Account.findById(req.params.id);
    if (!account) {
        req.flash('error', 'Cannot find that account!');
        return res.redirect('/profiles');
    }

    //will NOT send entire profile object to save data & bc not needed to
    const haveProfile = (account.profile !== null) && (account.profile !== undefined);

    res.render('accounts/edit.ejs', { account, haveProfile });
}));


app.patch('/account/:id', isLoggedIn, isAccountOwner, validateAccountUpdate, catchAsync(async (req, res) => {
    const account = await Account.findByIdAndUpdate(req.params.id, { $set: res.locals.account }, { new: true });
    if (!account) {
        req.flash('error', 'Failed to update! Cannot find that account!');
        return res.redirect('/profiles');
    }

    req.flash('success', 'Successfully updated my account!');
    res.redirect(`/account/${account._id}`);
}));

app.delete('/account/:id', isLoggedIn, isAccountOwner, catchAsync(async (req, res) => {
    const accountToDelete = await Account.findById(req.params.id);
 
    //find and delete all reviews left by this account 
    for (let reviewId of accountToDelete.reviews) {

        const reviewToDelete = await Review.findById(reviewId);
        if (!reviewToDelete) {
            req.flash('error', 'Failed to delete 1 or more reviews written by this account! Cannot find the review(s)!');
        }

        //delete each found review's link with profiles
        await Profile.findByIdAndUpdate(reviewToDelete.about._id, { $pull: { reviews: reviewId } });
        //delete the review        
        await Review.findByIdAndDelete(reviewId);
    }
    req.flash('success', 'Successfully deleted reviews written by this account.');

    //delete the profile of this account, if exists
    const profileToDelete = await Profile.findById(req.body.profileId);
    if (profileToDelete === null) {
        req.flash('success', 'There was no profile connected to this account.');
    } else {
        //find all reviews left on the profile of this account, if any
        await Review.deleteMany({ _id: { $in: profileToDelete.reviews } });
        await Profile.findByIdAndDelete(req.body.profileId);
        req.flash('success', 'Successfully deleted the profile of the account');
        req.flash('success', 'Successfully deleted reviews on the profile, if any existed');
    }

    //delete the account
    await Account.findByIdAndDelete(req.params.id);
    req.flash('success', 'Successfully deleted the account!');
    res.redirect(`/profiles`);
}));

//$$$$$$!!!!!!! All profile routes need authorization check before any edit ability
//should only be allowed when current account does NOT have profile
app.get('/account/:id/profile/new', isLoggedIn, isAccountOwner, async (req, res) => {
    const accountId = req.params.id;


    //have the logic check the current account does NOT have a valid profile
    res.render('profiles/new.ejs', { accountId });
});










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
    console.log('ERR = ');
    console.log(typeof err);
    console.log(err);
    let { statusCode = 500 } = err;
    if (!err.message) err.message = "Oh no! Something went wrong!"

    if (err.message.includes('E11000') && err.message.includes('dup key: { email:')) {
        // statusCode = 400;
        // err.message = "This email address is not available. Please use different email address to register."

        req.flash('error', 'This email address is not available. Please use different email address to register.');
        return res.redirect('/account/register');
    }

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