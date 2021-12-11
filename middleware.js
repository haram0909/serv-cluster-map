const { joiProfileSchema, joiAccountUpdateSchema, joiAccountRegisterSchema, joiReviewSchema } = require('./utils/validationSchemas.js');
const ExpressError = require('./utils/ExpressError.js');




//middleware function
module.exports.validateProfile = (req, res, next) => {
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

module.exports.validateAccountUpdate = (req, res, next) => {
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

module.exports.validateAccountRegister = (req, res, next) => {
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

module.exports.validateReview = (req, res, next) => {
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

module.exports.isLoggedIn = (req, res, next) => {
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


module.exports.isAccountOwner = (req, res, next) => {

    if (!res.locals.currentAccount._id.equals(req.params.id)) {
        req.flash('error', 'Cannot interact with accounts that is not yours!');
        return res.redirect(`/profiles`);
    } else{
        console.log('isAccountOwner = TRUE');
        next();
    }
}

module.exports.isProfileOwner = (req, res, next) => {

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