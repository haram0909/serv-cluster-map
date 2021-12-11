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

const validateAccountUpdate = (req, res, next) => {

    // requires allowUnknown: false option at validate, bc images of "" is type unknown...
    const validationResult = joiAccountUpdateSchema.validate(req.body, { abortEarly: false, allowUnknown: true });

    // console.log('original req.body = ' + JSON.stringify(req.body));
    // console.log('validation result = ' + JSON.stringify(validationResult))
    // console.log('cleaned req.body = ' + JSON.stringify(validationResult.value));

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

    // console.log('original req.body = ' + JSON.stringify(req.body));
    // console.log('validation result = ' + JSON.stringify(validationResult))
    // console.log('cleaned req.body = ' + JSON.stringify(validationResult.value));

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

    console.log('original req.body = ' + JSON.stringify(req.body));
    console.log('validation result = ' + JSON.stringify(validationResult))
    console.log('cleaned req.body = ' + JSON.stringify(validationResult.value));

    if (validationResult.error) {
        const errMsg = validationResult.error.details.map(item => item.message).join(',');
        //throw new ExpressError(400, errMsg);
        next(new ExpressError(400, errMsg));

    } else {
        res.locals.review = validationResult.value.review;
        next();
    }
}

//checks for whether there is an logged in account in the session
    //updated to use .isAuthenticated() method from passport
const isLoggedIn = (req, res, next) => {

    // if (!res.locals.currentAccount) {
    //     const errMsg = 'No logged in account in this session!'
    //     console.log(errMsg);
    //     // next(new ExpressError(400, errMsg));
    //     req.flash('error', errMsg);
    //     return res.redirect('/account/login')

    if (!req.isAuthenticated()) {

         //save the original url that was requested
        console.log(req.originalUrl);
        req.session.returnTo = req.originalUrl

        const errMsg = 'Needs to be logged in first!'
        console.log(errMsg);
        // next(new ExpressError(400, errMsg));
        req.flash('error', errMsg);
        return res.redirect('/account/login')
    } else {
        console.log('Logged in account exists');
        next();
    }

}

// checks for authorization for accounts
//checks whether the currentAccount is the owner of the account
const isAccountOwner = (req, res, next) => {
    console.log();
    console.log('Checking whether currentAccount is the owner of the Account');
    console.log('res.locals.currentAccount = ');
    console.log(res.locals.currentAccount);
    console.log('req.params.id = ');
    console.log(req.params.id);
    console.log(res.locals.currentAccount._id.equals(req.params.id));
    console.log();

    if (!res.locals.currentAccount._id.equals(req.params.id)) {
    // if (!res.locals.currentAccount._id.equals(accountToDelete._id)) {
        console.log('CURRENT ACCOUNT _ID !== REQ.BODY.REVIEW ID');
        req.flash('error', 'Cannot interact with accounts that is not yours!');
        // return res.redirect(`/account/${res.locals.currentAccount._id}`);
        return res.redirect(`/profiles`);
    } else{
        console.log('isAccountOwner = TRUE');
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
    //!!! populating nested (might need redesigning of the doc for better performance)
    //!!! check whether the model definition option is requried to be passed in
    // const profile = await Profile.findById(req.params.id).populate('account').populate({path: 'reviews', populate: {path: 'author', select: 'firstname'/*, model: 'Account'*/} });
    // const profile = await Profile.findById(req.params.id).populate('account').populate({path: 'reviews', populate: {path: 'author', select: 'firstname'/*, model: 'Account'*/} });
    const profile = await Profile.findById(req.params.id).populate('account');

    console.log('LOOKING UP PROFILE = ');
    console.log(JSON.stringify(profile));

    if (!profile) {
        req.flash('error', 'Cannot find that profile!');
        return res.redirect('/profiles');
    }


    //authorization : check whether the currentAccount is the owner of this profile
    console.log()
    console.log((res.locals.currentAccount? true : false) )
    console.log(res.locals.currentAccount)
    // console.log(res.locals.currentAccount._id)
    // console.dir(res.locals.currentAccount._id.toHexString())
    // console.log(res.locals.currentAccount._id.equals(profile.account._id))
    console.log()
    // const isProfileOwner = (res.locals.currentAccount && res.locals.currentAccount.profile.equals(req.params.id));  
    const isProfileOwner = (res.locals.currentAccount && res.locals.currentAccount._id.equals(profile.account._id));  
    // if (!res.locals.currentAccount._id.equals(profileToDelete.account._id))

    const reviewsForProfile = await Review.find({ 'about': req.params.id }).populate({ path: 'author', select: 'firstname lastname _id' });
    console.log('REVIEWS WRITTEN FOR THIS PROFILE = ');
    console.log(JSON.stringify(reviewsForProfile));

    console.log('res.locals =====')
    console.log(res.locals.currentAccount)

    // if(res.locals.currentAccount){
    // const currentAccount = res.locals.currentAccount._id;
    // }
    // console.log('NO CURRENT ACCOUNT');

    res.render('profiles/show.ejs', { profile, reviewsForProfile, isProfileOwner });
}));


    const profile = await Profile.findById(req.params.id).populate('account');
    if (!profile) {
        req.flash('error', 'Cannot find that profile!');
        return res.redirect('/profiles');
    }
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
    // const haveProfile =  await Profile.findById(account.profile);
    const haveProfile =  account.profile !== (null && undefined);
    //  const haveProfile = account.profile ? true : await Profile.findById(account.profile);
    //  const haveProfile = await Profile.findById(account.profile);
    console.log(`Have a profile = ${haveProfile}`);
    if (haveProfile) {
        // throw new Error("This Account already has a valid My Profile. An account is not allowed to have more than 1 valid profile.");
        req.flash('error', 'This Account already has a valid My Profile. An account is not allowed to have more than 1 valid profile.');
        return res.redirect(`/account/${account._id}`);
    }

    // const profile = new Profile(req.body.profile);
    const profile = new Profile(res.locals.profile);
    //need current session's account 
    //!!!!!!!curr account.profile = profile._id; ** just like seeding

    profile.account = account;
    await profile.save();
    await console.log('saved profile');

    const updatedAccount = await Account.findByIdAndUpdate(req.body.accountId, { profile: profile }, { upsert: true });
    // console.log(`updated profile = ${JSON.stringify(updatedAccount)}`);

    req.flash('success', 'Successfully created my profile!');
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
    if (!updatedProfile) {
        req.flash('error', 'Failed to update! Cannot find that profile!');
        return res.redirect('/profiles');
    }

    req.flash('success', 'Successfully updated my profile!')
    res.redirect(`/profiles/${updatedProfile._id}`);
}));


app.delete('/profiles/:id', catchAsync(async (req, res) => {
    const { id } = req.params;
    const profileToDelete = await Profile.findById(id);

    console.log(`Profile to be deleted = ${JSON.stringify(profileToDelete)}`);
    // if (profileToDelete === null) {
    //     throw new ExpressError(400, 'This is NOT a valid profile');   
    // }

    if (!profileToDelete) {
        req.flash('error', 'Failed to delete! Cannot find that profile!');
        return res.redirect('/profiles');
    }

    if (profileToDelete.reviews.length > 0) {
        console.log('Deleting linked reviews');
        await Review.deleteMany({ _id: { $in: profileToDelete.reviews } });
        req.flash('success', 'Successfully deleted reviews on the profile.');
    } else {
        console.log('There is no reviews linked to this profile');
        req.flash('success', 'There was no reviews on the profile.');
    }

    console.log('Deleting target profile');
    await Profile.findByIdAndDelete(id);
    // console.log(`Account id to delete this profile from = ${req.body.accountId}`);

    //set the profile linked account's profile property to null -> allow the account to create new profile
    await Account.findByIdAndUpdate(req.body.accountId, { profile: null });
    req.flash('success', 'Successfully deleted the profile!');
    res.redirect('/profiles');
}));





//routes for reviews
//NEED VALIDATE-REVIEW MIDDLEWARE DEFINED & USED HERE!!!! = DONE
//NEED TO VALIDATE THAT LOGGED IN FIRST! = DONE
//NEED TO VALIDATE THAT THE ACCOUNT HAS NOT ALREADY LEFT A REVIEW = DONE
app.post('/profiles/:id/review', isLoggedIn, validateReview, catchAsync(async (req, res) => {

    console.log('PASSED isLoggedIn CHECK = there is logged in account in the session');
    console.log('currentAccount = req.user = ')
    console.log(JSON.stringify(req.user));

    console.log(' ');
    console.log('ENTERED POST PROFILE/ID/REVIEW ROUTE!!');

    console.log(`$ res.locals = ${JSON.stringify(res.locals)}`);

    // //HAVE TO CONFIGURE LOGIN SESSION BEFORE CHECKING FOR AUTHENTICATION
    // console.log(`current user authenticated = ${req.isAuthenticated()}`);

    // //authentication check  --> req.user._id?
    // if(!req.isAuthenticated()){
    //     req.flash('error', 'You need to be logged in.');
    //     return res.redirect('/account/login');
    // }
    console.log(' ');
    console.log(`CREATING NEW review for profile ${req.params.id}`);
    console.log(JSON.stringify(req.body));

    const profile = await Profile.findById(req.params.id).populate('reviews')/*.populate('account')*//*.populate('reviews')*/;
    if (!profile) {
        req.flash('error', 'Cannot find the profile to add this review!');
        return res.redirect('/profiles');
    }
    console.log('LEAVING REVIEW TO PROFILE = ');
    console.log(JSON.stringify(profile));

    //this now validates whether the current account exists as an author of any of the reviews for this profile...
    console.log('CHECKING IF CURRENT ACCOUNT HAS LEFT A REVIEW HERE = ');

    let wroteReview = false;
    for (let review of profile.reviews) {
        if (review.author._id.equals(res.locals.currentAccount._id)) {
            wroteReview = true;
            break;
        }
    }
    console.log('currentAccount wrote a review here = ', wroteReview);

    // An account is only allowed to leave 1 review for a profile
    if (wroteReview) {
        req.flash('error', 'Cannot leave more than 1 review for a profile!');
        return res.redirect(`/profiles/${req.params.id}`)
    }

    // let authorsOfReviews = [];
    // for(let review of profile.reviews){
    //     authorsOfReviews.push(review.author);
    // }
    // console.log('Authors of reviews on this profile = ');
    // console.log(authorsOfReviews);
    // console.log(authorsOfReviews.includes(res.locals.currentAccount._id));

    // console.log(profile.reviews.author.includes(res.locals.currentAccount._id).toString());
    console.log('current account id = ');
    console.log(res.locals.currentAccount._id.toString());

    //add to reviews array
    const account = await Account.findById(res.locals.currentAccount._id);
    // const account = await Account.findById(req.body.accountId);
    if (!account) {
        req.flash('error', 'Cannot find the account that is attempting to leave a review!');
        return res.redirect('/profiles');
    }



    //add to reviews array
    // const profile = new Profile(req.body.profile);
    const review = new Review(res.locals.review);
    review.about = req.params.id;
    review.author = res.locals.currentAccount._id;
    console.log('THE NEW REVIEW = ');
    console.log(JSON.stringify(review));
    await review.save();

    profile.reviews.push(review);
    await profile.save();
    console.log('saved profile');

    account.reviews.push(review);
    await account.save()
    console.log('saved account');


    req.flash('success', 'Successfully added a new review to this profile!');
    res.redirect(`/profiles/${profile._id}`);

}));


app.delete('/profiles/:id/review', isLoggedIn, catchAsync(async (req, res) => {

    console.log('INSIDE OF DELETE REVIEW ROUTE!');

    console.log('Review to delete = reviewId = ');
    console.log(`${req.body.reviewId}`);
    console.log('currentAccount._id = ');
    console.log(`${res.locals.currentAccount._id}`);


    const reviewToDelete = await Review.findById(req.body.reviewId).populate({ path: 'author', select: '_id' }).populate({ path: 'about', select: '_id' });
    console.log(`Review to be deleted = ${JSON.stringify(reviewToDelete)}`);

    console.log('Author id of Review to delete =  ');
    console.log(`${reviewToDelete.author}`);

    //check whether the author of the review is currentAccount
    if (!res.locals.currentAccount._id.equals(reviewToDelete.author._id)) {
        console.log('CURRENT ACCOUNT _ID !== REQ.BODY.REVIEW ID');
        req.flash('error', 'Cannot delete reviews written by others!');
        return res.redirect(`/profiles/${req.params.id}`)
    }
    console.log('CAN delete this review');

    if (!reviewToDelete) {
        req.flash('error', 'Failed to delete! Cannot find that review!');
        return res.redirect(`/profiles/${req.params.id}`);
    }

    console.log('$Author of the review = account Id = ');
    console.log(reviewToDelete.author._id);
    console.log('Deleting the record of the review from account');
    const authorAccount = await Account.findByIdAndUpdate(reviewToDelete.author._id, { $pull: { reviews: req.body.reviewId } });
    console.log(JSON.stringify(authorAccount));

    console.log('$Profile to delete the review from = profile Id = ');
    console.log(reviewToDelete.about._id);
    console.log('Deleting the review from profiles');
    const reviewedProfile = await Profile.findByIdAndUpdate(reviewToDelete.about._id, { $pull: { reviews: req.body.reviewId } });
    console.log(JSON.stringify(reviewedProfile));

    console.log('Deleting the review from reviews collection');
    await Review.findByIdAndDelete(req.body.reviewId);

    req.flash('success', 'Successfully deleted reviews on the profile.');
    res.redirect(`/profiles/${req.params.id}`);
}));
app.get('/account/login', async (req, res) => {
    res.render('accounts/login.ejs');
});

// flash will use 'success' or 'error' key, because passport package uses these keys
    //user will be redirected back to where they were initially asked to login, if they got redirected to login 
app.post('/account/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/account/login' }), async (req, res) => {
    console.log('successfully logged in!');
    req.flash('success', 'Successfully logged in!');
    console.log();
    console.log('current req.session.returnTo = ');
    console.log(req.session.returnTo);
    console.log();

    if(req.session.returnTo/*.includes('/review')*/){
        console.log('req.session.returnTo = truthy');
        req.session.returnTo = req.session.returnTo.replace('/review','');
        console.log('After replacing /review with empty string = ');
        console.log(req.session.returnTo);
    }
    console.log('after checking for req.sesion.returnTo as truthy or falsy = ');
    console.log(req.session.returnTo);
    const redirectUrl = req.session.returnTo || '/profiles';
    // //set req.session.returnTo back to undefined by setting req.originalUrl to undefined
    // req.originalUrl = undefined;
    // console.log('set req.originalUrl = undefined ==> ');
    console.log('current req.originalUrl = ')
    console.log(req.originalUrl);

    //clean the record of returnTo data from session
        //set req.session.returnTo back to undefined
    req.session.returnTo = undefined;
    console.log(' returnTo after setting back to undefined = ');
    console.log(req.session.returnTo);

    res.redirect(redirectUrl);
});


app.get('/account/logout', (req, res) => {
    console.log('LOGGED OUT OF CURRENT USER ', req.user);
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

    console.log('req.body = ');
    console.log(req.body);
    console.log('res.locals.account = ')
    console.log(JSON.stringify(res.locals.account));

    const account = new Account(res.locals.account);
    await account.save();
    res.redirect(`/account/${account._id}`);
}));
        req.flash('success', 'Successfully created a new account!');


//my account info - first name, last name, email account
// will eventually have to update navbar to enable this
app.get('/account/:id', catchAsync(async (req, res) => {

    // console.log('Inside of account/:id - setting res.locals.accountId = ')
    // res.locals.accountId = req.params.id;
    // console.log(res.locals.accountId);

    const account = await Account.findById(req.params.id).populate('profile');

    console.log('found account = ');
    console.log(account);
    console.log('found account dir = ');
    console.dir(account);

    if (!account) {
        req.flash('error', 'Cannot find that account!');
        return res.redirect('/profiles');
    }
    //an account may only have 1 profile = this will check whether the account has a valid profile
    //if not, the account will be able to create a new profile
    //if does, the account will be able to navigate to the profile & edit
        //need to account where account.profile does not exists = undefined, which is different from null 
    //account.profile should be NEITHER null nor undefined
    const haveProfile =  account.profile !== (null && undefined);
    console.log(account.profile !== (null && undefined));
    // const haveProfile =  await Profile.findById(account.profile);
    // const haveProfile = account.profile ? true:false;
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

    if (!account) {
        req.flash('error', 'Cannot find that account!');
        return res.redirect('/profiles');
    }
    //will NOT send entire profile object to save data & bc not needed to
    const haveProfile =  account.profile !== (null && undefined);
    //  const haveProfile = account.profile ? true : await Profile.findById(account.profile);
    //  const haveProfile = await Profile.findById(account.profile);
    //const haveProfile = await Profile.findById(account.profile);
    console.log(`Have a profile = ${haveProfile}`);

    res.render('accounts/edit.ejs', { account, haveProfile });
}));

//updates account info
app.patch('/account/:id', isLoggedIn, isAccountOwner, validateAccountUpdate, catchAsync(async (req, res) => {
    // console.log(`req.body = ${JSON.stringify(req.body)}`);
    const { id } = req.params;
    // const account = await Account.findByIdAndUpdate(id, { $set: updateProfile }, { new: true });
    const account = await Account.findByIdAndUpdate(id, { $set: res.locals.account }, { new: true });
    console.log(`Updated account = ${account}`);

    if (!account) {
        req.flash('error', 'Failed to update! Cannot find that account!');
        return res.redirect('/profiles');
    }

    req.flash('success', 'Successfully updated my account!');
    res.redirect(`/account/${account._id}`);
}));

app.delete('/account/:id', catchAsync(async (req, res) => {

    const profileToDelete = await Profile.findById(req.body.profileId);
    if (profileToDelete === null) {
        console.log('There was no valid profile connected to this account');
        req.flash('success', 'There was no profile connected to this account.');
    } else {
        console.log("Deleting the account's profile and reviews on the profile");
        await Review.deleteMany({ _id: { $in: profileToDelete.reviews } });
        await Profile.findByIdAndDelete(req.body.profileId);
        req.flash('success', 'Successfully deleted the profile of the account');
        req.flash('success', 'Successfully deleted reviews on the profile, if any existed');
    }


    await Account.findByIdAndDelete(req.params.id);
    req.flash('success', 'Successfully deleted the account!');
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