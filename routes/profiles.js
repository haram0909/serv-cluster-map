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



//middleware
const { validateProfile, 
    isLoggedIn, 
    isProfileOwner, 
    fileSizeIsBelowLimit} = require('../middleware.js');

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
        //with multer and cloudinary, mutler-cloudinary-storage pkgs, now uploads to cloudinary storage and store filename path(url) to mongoDB
            //total file upload size limits of 10MB for server-side validation 
    .post(isLoggedIn, fileSizeIsBelowLimit, upload.array('images'), validateProfile, catchAsync(profilesController.createProfile));

    //!!!using npm multer to parse form enctype multipart/form-data     
        //upload.single() = upload single file
            //will give req.file = contains info about the file attempted to upload 
            //{
            // fieldname: 'images', (because the form's field name for image upload was 'images')
            // originalname: 'actualFileName.png',
            // encoding: '7bit',
            // mimetype: 'image/png',
            // destination: 'uploads/',  (because we set multer's upload destination to 'uploads/' folder in this route file --> will eventually be cloudinary)
            // filename: 'some unique encoded string',
            // path: 'uploads/some encoded string from above field 'filename'', (because we set multer's upload destination to 'uploads/' folder in this route file)
            // size: number
            //    }
    // .post(upload.single('images'), (req,res)=>{

        //upload.array() = uploads potentially multiple files under the fieldname of 'images'
            //will give req.file = contains info about the file attempted to upload 
            //[
            //    {
            //      fieldname: 'images', (because the form's field name for image upload was 'images')
            //      originalname: 'actualFileName.png',
            //      encoding: '7bit',
            //      mimetype: 'image/png',
            //      destination: 'uploads/',  (because we set multer's upload destination to 'uploads/' folder in this route file --> will eventually be cloudinary)
            //      filename: 'some unique encoded string',
            //      path: 'uploads/some encoded string from above field 'filename'', (because we set multer's upload destination to 'uploads/' folder in this route file)
            //      size: number
            //    }
            //]
    // .post(upload.array('images'), (req,res)=>{
        
    //multer configured to upload to cloudinary storage 
        //upload.array() = uploads potentially multiple files under the fieldname of 'images'
            //will give req.file = contains info about the file attempted to upload 
            //[
            //    {
            //      fieldname: 'images', (because the form's field name for image upload was 'images')
            //      originalname: 'actualFileName.png',
            //      encoding: '7bit',
            //      mimetype: 'image/png',
            //      path: 'cloudinary url for the file', (ex. 'https://res.cloudinary.com/servclustermap/image/upload/{string}/{filename string}{.file extention}') (because we now setted multer's upload destination to be cloudinary storage in this route file)
            //      size: number,
            //      filename: 'ServClusterMap/encoded unique file name string' = ({cloudinary storage name}/{filename})
            //    }
            //]
    // .post(upload.array('images'), (req,res)=>{
    //     console.log();
    //     console.log('req.body = ');
    //     console.log(req.body);
    //     console.log();
    //     console.log('req.files = ');
    //     console.log(req.files);
    //     console.log();
    //     res.send(req.body);
    // });

router.route('/:id')
    .get(catchAsync(profilesController.showDetail))
     //with multer and cloudinary, mutler-cloudinary-storage pkgs, now uploads to cloudinary storage and store filename path(url) to mongoDB
        //total file upload size limits of 10MB for server-side validation 
    .patch(isLoggedIn, isProfileOwner, fileSizeIsBelowLimit, upload.array('images'), validateProfile, catchAsync(profilesController.updateProfile))
    .delete(isLoggedIn, isProfileOwner, catchAsync(profilesController.destroyProfile));

router.get('/:id/edit', isLoggedIn, isProfileOwner, catchAsync(profilesController.renderUpdateProfileForm));





module.exports = router;