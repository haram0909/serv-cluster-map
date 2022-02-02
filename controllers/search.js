//models
const Profile = require('../models/profile.js');
const Account = require('../models/account.js');

//express-pagination
const paginate = require('express-paginate');

//controller functions related to searching profiles
module.exports.renderSearchProfilesForm = (req, res) => {
    res.render('search/searchProfilesForm.ejs');
}

module.exports.searchProfiles = async (req, res) => {
    const searchType = res.locals.searchProfile['search-type'];
    const keyword = res.locals.searchProfile.keyword;
    const availability = res.locals.searchProfile.availability;

//search/filter after populate
//https://stackoverflow.com/questions/11303294/querying-after-populate-in-mongoose

    //dynamically generate match object for Model.aggregate pipeline's $match stage
    let dynamicMatchObject = {};
    //dynamically add $or based on search-type
        //initialize dynamicMatchObject before dynamically add $or filter
    dynamicMatchObject["$or"] = []

    //using $regex at $match stage documentation =
    //https://docs.mongodb.com/manual/reference/operator/query/regex/#-regex
        //only default case (case of search-type 'all') will have names based filter option included
        //other search-types will NOT have name based filter to prevent potential profile scanning behavior
    switch (searchType) {
        case 'location':
            const orConditionLocation =  
            { "location": { $regex: keyword, $options: 'i' } };
            dynamicMatchObject["$or"].push(orConditionLocation);
            break;

        case 'skills':
            const orConditionSkills =  
            { "skills.proglang": {$regex: keyword, $options: 'i' } }; 
            dynamicMatchObject["$or"].push(orConditionSkills);
            break;

        case 'offerings':
            const orConditionOfferings = 
            { "offerings.service": { $regex: keyword, $options: 'i' } };
            dynamicMatchObject["$or"].push(orConditionOfferings);
            break;

        case 'introduction':
            const orConditionIntroduction = 
            { "introduction": { $regex: keyword, $options: 'i' } };
            dynamicMatchObject["$or"].push(orConditionIntroduction);
            break;
        
        default:
            const orConditionAll = [
                { "profileOwner.firstname": { $regex: keyword, $options: 'i' } },
                { "profileOwner.lastname": { $regex: keyword, $options: 'i' } },
                { "introduction": {$regex: keyword, $options: 'i'}},
                { "location": { $regex: keyword, $options: 'i' } },
                { "skills.proglang": {$regex: keyword, $options: 'i' } }, 
                { "offerings.service": { $regex: keyword, $options: 'i' } }
            ];

            dynamicMatchObject["$or"].push(...orConditionAll);
    }

    //dynamically add $and based on availability filter
    switch (availability) {
        case 'available':
            dynamicMatchObject["$and"] = [{"availability" : true }]
            break;

        case 'unavailable':
            dynamicMatchObject["$and"] = [{"availability" : false }]
            break;

        default:
            // console.log('treating availability filter as "any"');
    }

//define and run aggregate pipeline 
    //https://stackoverflow.com/questions/52498620/mongodb-elemmatch-with-regex-return-only-one-element-from-array-of-a-single-doc?rq=1
    //https://masteringjs.io/tutorials/mongoose/aggregate
    const resultsIds = await Profile.aggregate([
    //$lookup to grab profile's related Account information
        {
            $lookup: {
                //'from' field needs collection name = Model.collection.name
                from: Account.collection.name,
                localField: "account",
                foreignField: "_id",
                as: "profileOwner"
            }
        },
    //$unwind fields of arrays will split each element of an array into separate documents
    //if using unwind, will want to use group at the end to combine the splitted documents by object id -> merging splitted docs with same object id back to 1 doc 
        //unwind behavior is NOT needed for below match purpose
        //but group by object id is still needed 
            // to prevent having to move documents around with credential information,
            // but only return list of document _ids, which then can be used to find docs by ids to get documents without sensitive info, such as credentials
    //https://docs.mongodb.com/manual/reference/operator/aggregation/unwind/
        // {
        //     $unwind: '$skills'
        //     // {
        //     //     path: "$reviews"
        //     // }
        // },
        // {
        //     $unwind: '$offerings'
        //     // {
        //     //     path: "$offerings"
        //     // }
        // }
        // ,
    //$match stage of aggregate = where actual filtering occurs
        //pass dynamically generate match object for $match stage
        {
            $match: dynamicMatchObject
        },
    //$group by _id
        {
            $group:{
                _id: '$_id'
            }
        }
    ]);

    //save the array of _id output of aggregate pipeline to session
    req.session.searchProfilesResult = resultsIds
    res.redirect('/search/experts/result');
}

module.exports.renderSearchProfilesResult = async (req, res) => {
    const resultsIds = req.session.searchProfilesResult;
    const results = await Profile.find({'_id': { $in: resultsIds}})
                                 .sort({ _id: -1 })
                                 .limit(req.query.limit)
                                 .skip(req.skip)
                                 .populate('account');
    
    const itemCount = resultsIds.length;
    const pageCount = Math.ceil(itemCount / req.query.limit);

    //handle when there is 0 profiles (i.e., when the search yeilded no result)
    if (pageCount === 0) {
        req.flash('error', 'Oh no! There is no experts to show. Try some other keywords.');
        return res.redirect('/search/experts')
    }

    if (pageCount < parseInt(req.query.page)) {
        req.flash('error', `There is no page ${req.query.page} of the results, but here is the last page of the result.`);
        return res.redirect(`/search/experts/result?page=${pageCount}&limit=${req.query.limit}`);
    }

    const hasNextPage = res.locals.paginate.hasNextPages(pageCount);
    const hasPreviousPage = res.locals.paginate.hasPreviousPages;

    // check if it is the first page
    let profilesCluster = {};
    if (!hasPreviousPage) {
        profilesCluster = await Profile.find({'_id': { $in: resultsIds}}).populate('account');
    }

    res.render('search/searchProfilesResult.ejs', {
        profilesCluster,
        profiles: results,
        itemCount,
        hasPreviousPage,
        hasNextPage,
        pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
    });
}
