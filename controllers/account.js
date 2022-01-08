//models
const Profile = require('../models/profile.js');
const Account = require('../models/account.js');
const Review = require('../models/review.js');

//packages
const passport = require('passport');

//cloudinary for image storage
const { cloudinary } = require('../cloudinary/cloudinaryConfig.js');




//controller functions related to reviews

module.exports.renderLoginForm = async (req, res) => {
    //check if the user is already logged in
    if (req.user) {
        req.flash('error', 'You are already logged in as this account.')
        return res.redirect(`/account/${req.user._id}`);
    }
    res.render('accounts/login.ejs');
}

module.exports.passportLocalAuthenticate = passport.authenticate('local', { failureFlash: true, failureRedirect: '/account/login' });

module.exports.loginAndRedirect = async (req, res) => {
    req.flash('success', 'Successfully logged in!');
    //clean out /review portion to redirect back to /profile/:id, if the req was POST to /profile/:id/review
    //NOT THE BEST APPROACH.. more of a hack...
    if(req.session.returnTo){
        req.session.returnTo = req.session.returnTo.replace('/review','');
    }
    //if req.session.returnTo is falsy, redirect to /profiles path
    const redirectUrl = req.session.returnTo || '/profiles';
    //clean the req.session.returnTo data by setting it back to undefined
    req.session.returnTo = undefined;
    res.redirect(redirectUrl);
}

module.exports.logout = (req, res) => {
    //check if there even is any currentAccount logged in
    if (!req.user) {
        req.flash('error', 'No account is currently logged in.');
        return res.redirect('/account/login')
    }
    req.logout();
    req.flash('success', 'Successfully logged out');
    res.redirect('/profiles');
}

module.exports.renderRegistrationForm = async (req, res) => {
    res.render('accounts/register.ejs');
}

module.exports.register = async (req, res) => {
    try {
        const password = res.locals.account.password;
        const account = new Account(res.locals.account);
        //uses passport-local-mongoose plugin method .register 
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
}

module.exports.showDetail = async (req, res) => {
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
    const wroteReview = (account.reviews.length !== 0);
    res.render('accounts/show.ejs', { account, haveProfile, wroteReview });
}

module.exports.renderUpdateAccountForm = async (req, res) => {
    const account = await Account.findById(req.params.id);
    if (!account) {
        req.flash('error', 'Cannot find that account!');
        return res.redirect('/profiles');
    }
    //will NOT send entire profile object to save data & bc not needed to
    const haveProfile = (account.profile !== null) && (account.profile !== undefined);
    res.render('accounts/edit.ejs', { account, haveProfile });
}

module.exports.updateAccount = async (req, res) => {
    const account = await Account.findByIdAndUpdate(req.params.id, { $set: res.locals.account }, { new: true });
    if (!account) {
        req.flash('error', 'Failed to update! Cannot find that account!');
        return res.redirect('/profiles');
    }
    req.flash('success', 'Successfully updated my account!');
    res.redirect(`/account/${account._id}`);
}

module.exports.destroyAccount = async (req, res) => {
    const accountToDelete = await Account.findById(req.params.id);
    if (!accountToDelete) {
        req.flash('error', 'Failed to delete! Cannot find that account!');
        return res.redirect('/profiles');
    }

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
        //delete all images from cloudinary, if the profile has any image uploaded to cloudinary
        if(profileToDelete.images.length > 0){
            //delete selected images from cloudinary storage
            for(let image of profileToDelete.images){
                // console.log(image.filename)
                //may NOT want to do await here for perceived performance...?
                await cloudinary.uploader.destroy(image.filename);
            }
            req.flash('success', 'Successfully deleted all images uploaded by the profile of this account.');
        }       
        // console.log(profileToDelete);
        
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
}

//should only be allowed when the account wrote at least 1 review
module.exports.showRatingsIndex = async (req, res) => {
    const account = await Account.findById(req.params.id).populate(
        {
        path: 'reviews',
        populate: {
            //populate just the object id & availability of field 'about' of each review on reviews
            //populate firstname and lastname of field 'account' for each of 'about'
            path: 'about',
            model: 'Profile',
            select: 'availability',
            populate: {
                path: 'account',
                model: 'Account',
                select: 'firstname lastname'
            }
            }
        });
    //reverse the array of reviews to show most recently written reviews at the top
    const reviewsByAccount = account.reviews.reverse();
    res.render('accounts/ratings.ejs', {reviewsByAccount} );
}

//$$$$$$!!!!!!! All profile routes need authorization check before any edit ability
//should only be allowed when current account does NOT have profile
module.exports.renderCreateProfileForm = async (req, res) => {
    const account = await Account.findById(req.params.id);
    //confirm that the account does NOT have a valid linked profile
    const haveProfile = (account.profile !== null) && (account.profile !== undefined);
    if (haveProfile) {
        // throw new Error("This Account already has a valid My Profile. An account is not allowed to have more than 1 valid profile.");
        req.flash('error', 'This Account already has a valid profile. An account is not allowed to have more than 1 valid profile.');
        return res.redirect(`/account/${account._id}`);
    }
    const accountId = req.params.id;
    res.render('profiles/new.ejs', { accountId });
}