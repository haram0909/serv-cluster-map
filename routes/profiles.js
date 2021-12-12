const express = require('express');
    //no need to use Express Router option mergeParams and set to true 
        //because all the :id of the paths = req.params.id are defined inside this route 
        // --> paths inside of this route contains :id = granting us the access to req.params.id 
            //without having to use the mergeParams : true option (unlike reviews.js router) 
const router = express.Router();

//utils
const catchAsync = require('../utils/catchAsync.js');

//middleware
const { validateProfile, 
    isLoggedIn, 
    isProfileOwner } = require('../middleware.js');

//models
// const Profile = require('../models/profile.js');
// const Account = require('../models/account.js');
// const Review = require('../models/review.js');

//controllers
const profilesController = require('../controllers/profiles.js');





//all routes entering here are prefixed with '/profiles'

//routes for profiles
router.route('/')
    //might want pagination here, instead of full load all....
    .get(catchAsync(profilesController.showIndex))
    //POST '/profiles' route = ONLY ACCESSIBLE THROUGH GET '/account/:id/profile/new' route  
        //!!!! will break for now, because cannot meet model schema's requirement for now
        //need to have geometry.type path, etc
    .post(isLoggedIn, validateProfile, catchAsync(profilesController.createProfile));

router.route('/:id')
    .get(catchAsync(profilesController.showDetail))
    .patch(isLoggedIn, isProfileOwner, validateProfile, catchAsync(profilesController.updateProfile))
    .delete(isLoggedIn, isProfileOwner, catchAsync(profilesController.destroyProfile));

router.get('/:id/edit', isLoggedIn, isProfileOwner, catchAsync(profilesController.renderUpdateProfileForm));





module.exports = router;