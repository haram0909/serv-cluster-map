const { joiProfileSchema, joiAccountUpdateSchema, joiAccountRegisterSchema, joiReviewSchema, joiSearchProfileSchema } = require('./utils/validationSchemas.js');
const ExpressError = require('./utils/ExpressError.js');

//model
const Profile = require('./models/profile.js');
const Account = require('./models/account.js');




//middleware function
module.exports.validateProfile = (req, res, next) => {
    // requires allowUnknown: true option at validate, bc images of "" is type unknown...
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

module.exports.validateAccountUpdate = (req, res, next) => {
    // requires allowUnknown: true option at validate, bc images of "" is type unknown...
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

module.exports.validateAccountRegister = (req, res, next) => {
    // requires allowUnknown: true option at validate, bc images of "" is type unknown...
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

module.exports.validateReview = (req, res, next) => {
    // requires allowUnknown: true option at validate, bc images of "" is type unknown...
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

module.exports.validateProfileSearch = (req, res, next) => {
    // NOT require allowUnknown option to be true
    // Not require abortEarly option to be false
    const validationResult = joiSearchProfileSchema.validate(req.body);

    if (validationResult.error) {
        req.flash('error', 'Invalid keyword(s) detected! Please enter valid keyword(s)!');
        return res.redirect(`/search/experts`);
    } else {
        res.locals.searchProfile = validationResult.value;
        next();
    }
}

module.exports.isLoggedIn = (req, res, next) => {
    //updated to use .isAuthenticated() method from passport
    //instead of checking for res.locals.currentAccount exists
    if (!req.isAuthenticated()) {
        //save the original url that was requested for redirecting back to originally requested page, after logging in
        req.session.returnTo = req.originalUrl

        const errMsg = 'Needs to be logged in first!'
        // next(new ExpressError(400, errMsg));
        req.flash('error', errMsg);
        return res.redirect('/account/login')
    } else {
        next();
    }
}


module.exports.isAccountOwner = (req, res, next) => {
    if (!res.locals.currentAccount._id.equals(req.params.id)) {
        req.flash('error', 'Cannot interact with accounts that is not yours!');
        return res.redirect(`/profiles`);
    } else {
        // console.log('isAccountOwner = TRUE');
        next();
    }
}

module.exports.isProfileOwner = (req, res, next) => {
    //check whether the currentAccount has a profile AND ALSO is the owner of this profile
    if (res.locals.currentAccount.profile && req.params.id === res.locals.currentAccount.profile.toString()) {
        // console.log('IS the profile owner');
        next();
    } else {
        // console.log('NOT the profile owner');
        req.flash('error', 'Only the owner of the profile can do that!');
        return res.redirect(`/profiles`);
    }
}

//check if total file(s) attempted to upload is less than 10MB
    //if truthy, next() to allow uploading
    //if falsy, redirect to prevent uploading
module.exports.fileSizeIsBelowLimit = async (req, res, next) => {
    // console.dir(req.headers['content-length'])
    //set file size limit for uploading at once to 10MB
    const fileSizeLimit = 10485760; // 10 Mb //5242880; //10MB  

    //if the file size in total is larger than 10MB 
    if (req.headers['content-length'] && fileSizeLimit < parseInt(req.headers['content-length'])) {
        // console.log(`File(s) to upload is larger than 10MB`);
        req.flash('error', 'Cannot upload more than 10MB of images at once!');
        
        //might face file size limit issue when ...
                //because using callback function, this middleware might not need to be async/await
        await Profile.countDocuments({_id: req.params.id}, function(err, count){
            //...at editing profile or
            if(count > 0){
                // console.log(count)
                console.log('Profile with the id exists, thus Was trying to edit profile')
                return res.redirect(`/profiles/${req.params.id}/edit`);
            //...at creating new profile 
            }else{
                // console.log(count)
                console.log('Profile does not exists, thus redirected to create new profile page')
                return res.redirect(`/account/${res.locals.currentAccount._id}/profile/new`);
                // return res.redirect(`/account/${req.params.id}/profile/new`);
            }
        })
       
    } else {
        // console.log(`Total size of files to upload are less than 10MB`);
        next();

    }

}

//check if the account has any valid reviews
module.exports.wroteReview = async (req, res, next) => {
    const currentAccount = await Account.findById(req.params.id)
    // console.log(currentAccount);
    if (!currentAccount.reviews.length > 0) {
        req.flash('error', 'This account does NOT have any reviews written on other profiles!');
        return res.redirect(`/account/${req.params.id}`);
    } else {
        // console.log('hasReviews = TRUE');
        next();
    }
}