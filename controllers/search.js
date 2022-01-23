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
    console.log()
    console.log('received search keyword ====== ', keyword)
    console.log('received availability criteria ===== ', availability)

//search/filter after populate
//https://stackoverflow.com/questions/11303294/querying-after-populate-in-mongoose

    //dynamically generate match object for Model.aggregate pipeline's $match stage
    let dynamicMatchObject = {};
    //dynamically add $or based on search-type
        //initialize dynamicMatchObject before dynamically add $or filter
    dynamicMatchObject["$or"] = []
    console.log('after adding $or array to matchobject ======== ')
    console.log(dynamicMatchObject)
    console.log()
    //using $regex at $match stage documentation =
    //https://docs.mongodb.com/manual/reference/operator/query/regex/#-regex
        //only default case (case of search-type 'all') will have names based filter option included
        //other search-types will NOT have name based filter to prevent potential profile scanning behavior
    switch (searchType) {
        case 'location':
            console.log()
            console.log('searchtype = ', searchType)
            console.log()
            
            const orConditionLocation =  
            { "location": { $regex: keyword, $options: 'i' } };

            dynamicMatchObject["$or"].push(orConditionLocation);
            break;
        case 'skills':
            console.log()
            console.log('searchtype = ', searchType)
            console.log()
            const orConditionSkills =  
            { "skills.proglang": {$regex: keyword, $options: 'i' } }; 
            // { "skills": { $regex: keyword, $options: 'i' } };

            dynamicMatchObject["$or"].push(orConditionSkills);
            break;
        case 'offerings':
            console.log()
            console.log('searchtype = ', searchType)
            console.log()
            const orConditionOfferings = 
            { "offerings.service": { $regex: keyword, $options: 'i' } };
            // { "offerings": { $regex: keyword, $options: 'i' } };

            dynamicMatchObject["$or"].push(orConditionOfferings);
            break;
        case 'introduction':
            console.log()
            console.log('searchtype = ', searchType)
            console.log()
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
    console.log('after dynamically generating $or condition')
    console.log(dynamicMatchObject)
    console.log()

    //dynamically add $and based on availability filter
    switch (availability) {
        case 'available':
            dynamicMatchObject["$and"] = [{"availability" : true }]

            break;
        case 'unavailable':
            dynamicMatchObject["$and"] = [{"availability" : false }]
            break;
        default:
            console.log('treating availability filter as "any"');
    }
    
    console.log('after adding $and array to matchobject ======== ')
    console.log(dynamicMatchObject)
    console.log()

//define and run aggregate pipeline 
    //https://stackoverflow.com/questions/52498620/mongodb-elemmatch-with-regex-return-only-one-element-from-array-of-a-single-doc?rq=1
    //https://masteringjs.io/tutorials/mongoose/aggregate
    const resultsIds = await Profile.aggregate([
    //$lookup to grab related Account information
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
        {
        // pass dynamically generate match object for $match stage
            $match: dynamicMatchObject
        }
        ,
    //$group by _id
        {
            $group:{
                _id: '$_id'
            }
        }
    ]);

    console.log();
    console.log('results grouped by id');
    console.log(resultsIds);
    console.log();

//save the array of _id output of aggregate pipeline to session
    req.session.searchProfilesResult = resultsIds
    console.log()
    console.log('req.session.searchProfilesResult ===== ')
    console.log(req.session.searchProfilesResult)
    console.log()
    res.redirect('/search/experts/result');
}
