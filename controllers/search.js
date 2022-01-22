//models
const Profile = require('../models/profile.js');
const Account = require('../models/account.js');

//cloudinary for image storage
const { cloudinary } = require('../cloudinary/cloudinaryConfig.js');

//mapbox for geocoding and map related services
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapboxToken = process.env.MAPBOX_TOKEN;

//instantiate mapbox instance as 'geocoder'
const geocoder = mbxGeocoding({ accessToken: mapboxToken });

//express-pagination
const paginate = require('express-paginate');
const { countDocuments } = require('../models/profile.js');




//controller functions related to searching profiles


module.exports.renderSearchProfilesForm = (req, res) => {
    res.render('search/searchProfilesForm.ejs');
}
