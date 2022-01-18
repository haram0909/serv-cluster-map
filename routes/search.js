const express = require('express');
    //no need to use Express Router option mergeParams and set to true 
        //because all the :id of the paths = req.params.id are defined inside this route 
        // --> paths inside of this route contains :id = granting us the access to req.params.id 
            //without having to use the mergeParams : true option (unlike reviews.js router) 
const router = express.Router();

//utils
const catchAsync = require('../utils/catchAsync.js');

//express-pagination
const paginate = require('express-paginate');

//middlewares
const {  
    isLoggedIn,
    validateProfileSearch,
    clearSearchProfilesResult,
    hasSearchProfilesResult } = require('../middleware.js');


//controllers
const searchController = require('../controllers/search.js');



//all routes entering here are prefixed with '/search'
    //because search is a core feature and is are more expensive on the database, 
    // will allow only logged in user to run searches... for now?
//maybe not... because incentive to make an account already exists by
    //, profile's contact only becoming visible when logged in.
    // instead, it makes sense to show what users might want already exists
        //, then pointing them to create an account --> just browsing and searching is OK,
        // but actually want to contact and etc, need account and login to be able to use full feature(contact info & leaving reviews, etc)  

//routes for searching experts
router.route('/experts')
    .get(isLoggedIn, clearSearchProfilesResult, searchController.renderSearchProfilesForm)
    .post(isLoggedIn, clearSearchProfilesResult, validateProfileSearch, catchAsync(searchController.searchProfiles)); 

//routes for rendering results of searching experts
router.get('/experts/result', isLoggedIn, hasSearchProfilesResult, paginate.middleware(20, 100), catchAsync(searchController.renderSearchProfilesResult)); 

module.exports = router;