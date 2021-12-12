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
const Profile = require('../models/profile.js');
const Account = require('../models/account.js');
const Review = require('../models/review.js');





//all routes entering here are prefixed with '/profiles/:id/review'

//routes for reviews
router.post('/', isLoggedIn, validateReview, catchAsync(async (req, res) => {
    const profile = await Profile.findById(req.params.id).populate('reviews');
    if (!profile) {
        req.flash('error', 'Cannot find the profile to add this review!');
        return res.redirect('/profiles');
    }

    const account = await Account.findById(res.locals.currentAccount._id);
    if (!account) {
        req.flash('error', 'Cannot find the account that is attempting to leave a review!');
        return res.redirect('/profiles');
    }

    //this now validates whether the current account exists as an author of any of the reviews for this profile...
    let wroteReview = false;
    for (let review of profile.reviews) {
        if (review.author._id.equals(res.locals.currentAccount._id)) {
            wroteReview = true;
            break;
        }
    }
    // An account is only allowed to leave 1 review for a profile
    if (wroteReview) {
        req.flash('error', 'Cannot leave more than 1 review for a profile!');
        return res.redirect(`/profiles/${req.params.id}`)
    }

   //create new review 
    const review = new Review(res.locals.review);
    review.about = req.params.id;
    review.author = res.locals.currentAccount._id;
    await review.save();

    //add new review to reviews array of profile
    profile.reviews.push(review);
    await profile.save();

    //add new review to reviews array of account
    account.reviews.push(review);
    await account.save()

    req.flash('success', 'Successfully added a new review to this profile!');
    res.redirect(`/profiles/${profile._id}`);
}));


router.delete('/', isLoggedIn, catchAsync(async (req, res) => {
    const reviewToDelete = await Review.findById(req.body.reviewId).populate({ path: 'author', select: '_id' }).populate({ path: 'about', select: '_id' });

    //check whether the author(owner) of the review is currentAccount
    if (!res.locals.currentAccount._id.equals(reviewToDelete.author._id)) {
        req.flash('error', 'Cannot delete reviews written by others!');
        return res.redirect(`/profiles/${req.params.id}`)
    }
    
    if (!reviewToDelete) {
        req.flash('error', 'Failed to delete! Cannot find that review!');
        return res.redirect(`/profiles/${req.params.id}`);
    }

    //delete the review from the account that wrote the review
    await Account.findByIdAndUpdate(reviewToDelete.author._id, { $pull: { reviews: req.body.reviewId } });
    
    //delete the review from the profile the review was written for
    await Profile.findByIdAndUpdate(reviewToDelete.about._id, { $pull: { reviews: req.body.reviewId } });
 
    //delete the review
    await Review.findByIdAndDelete(req.body.reviewId);

    req.flash('success', 'Successfully deleted reviews on the profile.');
    res.redirect(`/profiles/${req.params.id}`);
}));

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