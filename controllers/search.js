//models
const Profile = require('../models/profile.js');
const Account = require('../models/account.js');

//express-pagination
const paginate = require('express-paginate');




//controller functions related to searching profiles


module.exports.renderSearchProfilesForm = (req, res) => {
    res.render('search/searchProfilesForm.ejs');
}
