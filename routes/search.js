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
    validateProfileSearch,
    clearSearchProfilesResult,
    hasSearchProfilesResult } = require('../middleware.js');

//controllers
const searchController = require('../controllers/search.js');



//all routes entering here are prefixed with '/search'

//routes for searching experts
router.route('/experts')
    .get(clearSearchProfilesResult, searchController.renderSearchProfilesForm)
    .post(clearSearchProfilesResult, validateProfileSearch, catchAsync(searchController.searchProfiles)); 

//routes for rendering results of searching experts
router.get('/experts/result', hasSearchProfilesResult, paginate.middleware(20, 100), catchAsync(searchController.renderSearchProfilesResult)); 

module.exports = router;