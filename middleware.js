const { joiProfileSchema, joiAccountUpdateSchema, joiAccountRegisterSchema, joiReviewSchema } = require('./utils/validationSchemas.js');
const ExpressError = require('./utils/ExpressError.js');

//model
const Profile = require('./models/profile.js');




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
        // console.log('Logged in account exists');
        //for potential redirection, if total file upload size is larger than 10MB limit
        // console.log('At renderCreation profile form -->')
        // console.log(req.params.id)
        // req.session.fromNewProfileCreation = req.params.id
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
        // console.log();
        next();
    } else {
        // console.log('NOT the profile owner');
        req.flash('error', 'Only the owner of the profile can do that!');
        return res.redirect(`/profiles`);
    }
}

//check whether the profile is allowed to upload the passed through count of images.
module.exports.fileSizeIsBelowLimit = async (req, res, next) => {
    // console.log()
    // console.dir(req.headers['content-length'])
    const fileSizeLimit = 10485760; // 10 Mb //5242880; //10MB  
    // console.log()

  
    //profile edit form should NOT even show upload form, 
    //if the file size in total is larger than 10MB. 
    //else, next()

    if (req.headers['content-length'] && fileSizeLimit < parseInt(req.headers['content-length'])) {
        // console.log(`File(s) to upload is larger than 10MB`);

        req.flash('error', 'Cannot upload more than 10MB of images at once!');
        
        //might face file size limit issue when
        Profile.countDocuments({_id: req.params.id}, function(err, count){
            // at editing profile or
            if(count > 0){
                // console.log(count)
                console.log('Profile with the id exists, thus Was trying to edit profile')
                return res.redirect(`/profiles/${req.params.id}/edit`);
            // at creating new profile 
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


    //if upload attempting image count is larger than 10, redirect with error flash message


    // after making this middleware, insert it to the .patch of profiles router, before the uploading by multer starts

    //when done with that, attempt pagination 
}