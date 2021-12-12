const express = require('express');
    //use Express Router option mergeParams and set to true 
        //to be able to merge req.params from different routers --> granting us the access to req.params.id for this specific router file's case
const router = express.Router( { mergeParams: true });

//utils
const catchAsync = require('../utils/catchAsync.js');

//middlewares
const { validateReview, 
    isLoggedIn } = require('../middleware.js');

//models
// const Profile = require('../models/profile.js');
// const Account = require('../models/account.js');
// const Review = require('../models/review.js');

//controllers
const reviewsController = require('../controllers/reviews.js');





//all routes entering here are prefixed with '/profiles/:id/review'

//routes for reviews
router.route('/')
    .post(isLoggedIn, validateReview, catchAsync(reviewsController.createReview))
    .delete(isLoggedIn, catchAsync(reviewsController.destroyReview));

//need edit review route - patch? 
//--> needs form and view for review edit... will skip Edit for now... 
//need to check if logged in 
//need to check if have authority to edit
//find the review from reviews array and update
//flash msg & redirect 
// router.patch('/', isLoggedIn, validateReview, catchAsync(async (req, res)=> {
//         // console.log(`skills = ${req.body.profile.skills.filter(obj => (obj.proglang !== "" && obj.experience !== "" && obj.experience >= 0))}`);
//         // console.log(`offerings = ${req.body.profile.offerings.filter(obj => (obj.service !== "" && obj.price !== "" && obj.price >= 0))}`);
//         //console.log(`req.body = ${JSON.stringify(req.body)}`);

//         const { id } = req.params;
//         console.log('req.body = ');
//         console.log(req.body);
//         console.log('res.locals.profile = ');
//         console.log(JSON.stringify(res.locals.profile));

//         const profile = await Profile.findByIdAndUpdate(id, { $set: res.locals.profile }, { upsert: true, new: true });
//         console.log(`Updated profile = ${profile}`);
//         //need current session's account 
//         //curr account.profile = profile._id; ** just like seeding

//         // const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
//         // campground.images.push(...imgs);
//         // await campground.save();
//         // if (req.body.deleteImages) {
//         //     for (let filename of req.body.deleteImages) {
//         //         await cloudinary.uploader.destroy(filename);
//         //     }
//         //     await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
//         // }
//         if (!profile) {
//             req.flash('error', 'Failed to update! Cannot find that profile!');
//             return res.redirect('/profiles');
//         }

//         req.flash('success', 'Successfully updated my profile!')
//         res.redirect(`/profiles/${profile._id}`);
//     }));


module.exports = router;