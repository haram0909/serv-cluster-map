const express = require('express');
    //no need to use Express Router option mergeParams and set to true 
        //because all the :id of the paths = req.params.id are defined inside this route 
        // --> paths inside of this route contains :id = granting us the access to req.params.id 
            //without having to use the mergeParams : true option (unlike reviews.js router) 
const router = express.Router();

//utils
const catchAsync = require('../utils/catchAsync.js');

//middlewares
const {  
    validateAccountUpdate, 
    validateAccountRegister, 
    isLoggedIn, 
    isAccountOwner } = require('../middleware.js');

//models
const Profile = require('../models/profile.js');
const Account = require('../models/account.js');
const Review = require('../models/review.js');

//packages
const passport = require('passport');





//all routes entering here are prefixed with '/account'

//routes for account
router.get('/login', async (req, res) => {

    //check if the user is already logged in
    if (req.user) {
        req.flash('error', 'You are already logged in as this account.')
        return res.redirect(`/account/${req.user._id}`);
    }

    res.render('accounts/login.ejs');
});


//user will be redirected back to where they were initially asked to login, if they got redirected to login 
router.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/account/login' }), async (req, res) => {
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


router.get('/logout', (req, res) => {
    //check if there even is any currentAccount logged in
    if (!req.user) {
        req.flash('error', 'No account is currently logged in.');
        return res.redirect('/account/login')
    }

    req.logout();
    req.flash('success', 'Successfully logged out');
    res.redirect('/profiles');
})


router.get('/register', async (req, res) => {
    res.render('accounts/register.ejs');
});


router.post('/register', validateAccountRegister, catchAsync(async (req, res) => {

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


router.get('/:id', isLoggedIn, isAccountOwner, catchAsync(async (req, res) => {
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


router.get('/:id/edit', isLoggedIn, isAccountOwner, catchAsync(async (req, res) => {
    const account = await Account.findById(req.params.id);
    if (!account) {
        req.flash('error', 'Cannot find that account!');
        return res.redirect('/profiles');
    }

    //will NOT send entire profile object to save data & bc not needed to
    const haveProfile = (account.profile !== null) && (account.profile !== undefined);

    res.render('accounts/edit.ejs', { account, haveProfile });
}));


router.patch('/:id', isLoggedIn, isAccountOwner, validateAccountUpdate, catchAsync(async (req, res) => {
    const account = await Account.findByIdAndUpdate(req.params.id, { $set: res.locals.account }, { new: true });
    if (!account) {
        req.flash('error', 'Failed to update! Cannot find that account!');
        return res.redirect('/profiles');
    }

    req.flash('success', 'Successfully updated my account!');
    res.redirect(`/account/${account._id}`);
}));

router.delete('/:id', isLoggedIn, isAccountOwner, catchAsync(async (req, res) => {
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
router.get('/:id/profile/new', isLoggedIn, isAccountOwner, catchAsync(async (req, res) => {
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
}));


module.exports = router;