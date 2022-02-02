//models
const Profile = require('../models/profile.js');
const Account = require('../models/account.js');
const Review = require('../models/review.js');

//controller functions related to reviews
module.exports.createReview = async (req, res) => {
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
    // An account is only allowed to leave 1 review per profile
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
}

module.exports.destroyReview = async (req, res) => {
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
}