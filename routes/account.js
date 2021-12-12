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
// const Profile = require('../models/profile.js');
// const Account = require('../models/account.js');
// const Review = require('../models/review.js');

//packages
// const passport = require('passport');

//controllers
const accountController = require('../controllers/account.js');




//all routes entering here are prefixed with '/account'

//routes for account
router.route('/login')
    .get(accountController.renderLoginForm)
    //user will be redirected back to where they were initially asked to login, if they got redirected to login 
    .post(accountController.passportLocalAuthenticate, accountController.loginAndRedirect);

router.get('/logout', accountController.logout);

router.route('/register')
    .get(accountController.renderRegistrationForm)
    .post(validateAccountRegister, catchAsync(accountController.register));

router.route('/:id')
    .get(isLoggedIn, isAccountOwner, catchAsync(accountController.showDetail))
    .patch(isLoggedIn, isAccountOwner, validateAccountUpdate, catchAsync(accountController.updateAccount))
    .delete(isLoggedIn, isAccountOwner, catchAsync(accountController.destroyAccount));

router.get('/:id/edit', isLoggedIn, isAccountOwner, catchAsync(accountController.renderUpdateAccountForm));

router.get('/:id/profile/new', isLoggedIn, isAccountOwner, catchAsync(accountController.renderCreateProfileForm));


module.exports = router;