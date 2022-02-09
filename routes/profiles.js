const express = require('express');
    //no need to use Express Router option mergeParams and set to true 
        //because all the :id of the paths = req.params.id are defined inside this route 
        // --> paths inside of this route contains :id = granting us the access to req.params.id 
            //without having to use the mergeParams : true option (unlike reviews.js router) 
const router = express.Router();

//utils
const catchAsync = require('../utils/catchAsync.js');

//cloudinary storage
const { storage } = require('../cloudinary/cloudinaryConfig.js')

//packages
const multer = require('multer');
// const upload = multer({ dest: 'uploads/'});
    //instead of saving to local 'uploads/' folder, save using cloudinary storage
const upload = multer({ storage });

//express-pagination
const paginate = require('express-paginate');

//middleware
const { validateProfile, 
    isLoggedIn, 
    isProfileOwner, 
    fileSizeIsBelowLimit} = require('../middleware.js');

//controllers
const profilesController = require('../controllers/profiles.js');





//all routes entering here are prefixed with '/profiles'

//routes for profiles
router.route('/')
    .get(paginate.middleware(20, 100), catchAsync(profilesController.showIndex))
    //POST '/profiles' route = ONLY ACCESSIBLE THROUGH GET '/account/:id/profile/new' route  
        //with multer and cloudinary, mutler-cloudinary-storage pkgs, now uploads to cloudinary storage and store filename path(url) to mongoDB
            //total file upload size limits per upload set to 10MB through server-side validation
    .post(isLoggedIn, fileSizeIsBelowLimit, upload.array('images'), validateProfile, catchAsync(profilesController.createProfile));

router.route('/:id')
    .get(catchAsync(profilesController.showDetail))
     //with multer and cloudinary, mutler-cloudinary-storage pkgs, now uploads to cloudinary storage and store filename path(url) to mongoDB
         //total file upload size limits per upload set to 10MB through server-side validation
    .patch(isLoggedIn, isProfileOwner, fileSizeIsBelowLimit, upload.array('images'), validateProfile, catchAsync(profilesController.updateProfile))
    .delete(isLoggedIn, isProfileOwner, catchAsync(profilesController.destroyProfile));

router.get('/:id/edit', isLoggedIn, isProfileOwner, catchAsync(profilesController.renderUpdateProfileForm));





module.exports = router;