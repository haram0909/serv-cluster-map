if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

//packages
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');

//dev dependencies
const morgan = require('morgan');

//models
// const Profile = require('./models/profile.js');
const Account = require('./models/account.js');
// const Review = require('./models/review.js');

//utils
// const catchAsync = require('./utils/catchAsync.js');
const ExpressError = require('./utils/ExpressError.js');
// const { joiProfileSchema, joiAccountUpdateSchema, joiAccountRegisterSchema, joiReviewSchema } = require('./utils/validationSchemas.js');

//middlewares
// const { validateProfile, 
//         validateAccountUpdate, 
//         validateAccountRegister, 
//         validateReview, 
//         isLoggedIn, 
//         isAccountOwner, 
//         isProfileOwner } = require('./middleware.js');

//routers
const profilesRouter = require('./routes/profiles.js')
const reviewsRouter = require('./routes/reviews.js')
const accountRouter = require('./routes/account.js')



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

//flash and currentAccount helper
app.use((req, res, next) => {
    //if there is anything under req.flash.success,
    //set that under res.locals.sucessMsg & pass along to destination path
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currentAccount = req.user;
    next();
})

// //middleware functions refactored into middleware.js file on the same level

//routers
    //any routes that starts with /profiles, use profilesRouter (profiles route)
app.use('/profiles', profilesRouter);
    //any routes that starts with /profiles/:id/review, use reivewsRouter (reviews route)
app.use('/profiles/:id/review', reviewsRouter);
    //any routes that starts with /account, use accountRouter (reviews route)
app.use('/account', accountRouter);


//routes
app.get('/', (req, res) => {
    res.render('home.ejs');
});


//!!!! might want pagination for index of profiles, instead of full load all....

//need edit review route - patch? 
//--> needs form and view for review edit... will skip Edit for now... 


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