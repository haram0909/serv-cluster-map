const express = require('express');
    //use Express Router option mergeParams and set to true 
        //to be able to merge req.params from different routers --> granting us the access to req.params.id for this specific router file's case
const router = express.Router( { mergeParams: true });

//utils
const catchAsync = require('../utils/catchAsync.js');

//middlewares
const { validateReview, 
    isLoggedIn } = require('../middleware.js');

//controllers
const reviewsController = require('../controllers/reviews.js');





//all routes entering here are prefixed with '/profiles/:id/review'

//routes for reviews
router.route('/')
    .post(isLoggedIn, validateReview, catchAsync(reviewsController.createReview))
    .delete(isLoggedIn, catchAsync(reviewsController.destroyReview));

module.exports = router;