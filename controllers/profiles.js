//models
const Profile = require('../models/profile.js');
const Account = require('../models/account.js');
const Review = require('../models/review.js');

//cloudinary for image storage
const { cloudinary } = require('../cloudinary/cloudinaryConfig.js');

//mapbox for geocoding and map related services
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapboxToken = process.env.MAPBOX_TOKEN;

//instantiate mapbox instance as 'geocoder'
const geocoder = mbxGeocoding({ accessToken: mapboxToken });

//express-pagination
const paginate = require('express-paginate');

//controller functions related to profiles
module.exports.showIndex = async (req, res) => {
    //get newest profiles first
        const [ results, itemCount ] = await Promise.all([
          Profile.find({}).sort({ _id: -1 }).limit(req.query.limit).skip(req.skip).populate('account').exec(),
          Profile.countDocuments({}) //because of deprecation, Profile.count({}) has been replaced 
        ]);
     
        const pageCount = Math.ceil(itemCount / req.query.limit);

        //handle when there is 0 profiles (i.e., when the app has no account with valid profile in production.)
        if(pageCount ===0){
            req.flash('error', 'There is no profiles to show yet.');
            req.flash('success', 'Be the first one to create an account and profile!')
            return res.redirect('/account/login')
        }
        if(pageCount < parseInt(req.query.page)){
            req.flash('error', `There is no page ${req.query.page}, but here is the last page.`);
            return res.redirect(`/profiles?page=${pageCount}&limit=${req.query.limit}`);
        }

        const hasNextPage = res.locals.paginate.hasNextPages(pageCount);
        const hasPreviousPage = res.locals.paginate.hasPreviousPages;

        // check if it is the first page
        let profilesCluster = {};
        if(!hasPreviousPage){
            profilesCluster = await Profile.find().populate('account');
        }

        res.render('profiles/index.ejs', {
            profilesCluster,
            profiles: results,
            hasPreviousPage,
            hasNextPage,
            pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
        });
}

module.exports.showDetail = async (req, res) => {
    const profile = await Profile.findById(req.params.id).populate('account');
    if (!profile) {
        req.flash('error', 'Cannot find that profile!');
        return res.redirect('/profiles');
    }
    //check whether the currentAccount is the owner of this profile to pass ownership flag or not
    const isProfileOwner = (res.locals.currentAccount && res.locals.currentAccount._id.equals(profile.account._id));
    const reviewsForProfile = await Review.find({ 'about': req.params.id }).populate({ path: 'author', select: 'firstname lastname _id' });

    //save the profile url, if user is not logged in, but logs in to see the profile's contact info
    if(!req.isAuthenticated()){
        req.session.returnTo = `/profiles/${req.params.id}`;
    }

    res.render('profiles/show.ejs', { profile, reviewsForProfile, isProfileOwner });
}

module.exports.renderUpdateProfileForm = async (req, res) => {
    const profile = await Profile.findById(req.params.id).populate('account');
    if (!profile) {
        req.flash('error', 'Cannot find that profile!');
        return res.redirect('/profiles');
    }
    res.render('profiles/edit.ejs', { profile });
}

module.exports.createProfile = async (req, res) => {
    const account = await Account.findById(req.body.accountId);
    //authorization : check whether the currentAccount is the owner of the account to create the profile
    if (!res.locals.currentAccount._id.equals(account._id)) {
        req.flash('error', 'Cannot create profile of other accounts!');
        return res.redirect(`/profiles`)
    }
    //confirm that the account does NOT have a valid linked profile
    const haveProfile = (account.profile !== null) && (account.profile !== undefined);
    if (haveProfile) {
        req.flash('error', 'This Account already has a valid profile. An account is not allowed to have more than 1 valid profile.');
        return res.redirect(`/account/${account._id}`);
    }

    //using mapbox instance, forward goecode to generate long and lat for location string
    const forwardGeocodedLocation = await geocoder.forwardGeocode({
        query: res.locals.profile.location,
        limit: 1
    }).send();

    if(!forwardGeocodedLocation.body.features[0]){     
        req.flash('error','Location of the profile was not identifiable. Location map will point to a default location.');
    } 

    //If null, i.e., cannot get coordinate of the location, hardcode to default location of Antarctic Ice shield, Antarctica coordinate     
    const geoData = (forwardGeocodedLocation.body.features[0])? forwardGeocodedLocation.body.features[0].geometry : {type:"Point", coordinates:[38.897957, -77.036560]} ;

    //link the currentAccount with the newly created profile
    const profile = new Profile(res.locals.profile);
    profile.geometry = geoData;
    profile.account = account;

    //save image files uploaded to cloudinary's filename and path(url)
        //extract path and filename and create array of objects containing {url: path value, filename: filename value}
    profile.images = req.files.map(file => ({ url: file.path, filename: file.filename  }));

    await profile.save();

    //link the newly created profile to the currentAccount
    await Account.findByIdAndUpdate(req.body.accountId, { profile: profile }, { upsert: true });
    req.flash('success', 'Successfully created my profile!');
    res.redirect(`/profiles/${profile._id}`);
}

module.exports.updateProfile = async (req, res) => {
    const updatedProfile = await Profile.findByIdAndUpdate(req.params.id, { $set: res.locals.profile }, { upsert: true, new: true });

    //save image files uploaded to cloudinary's filename and path(url)
        //extract path and filename and create array of objects containing {url: path value, filename: filename value}
    const images = req.files.map(file => ({ url: file.path, filename: file.filename  }));
    updatedProfile.images.push(...images);
    await updatedProfile.save();

    //delete images if requested to be deleted
    if(req.body.deleteImages){
        //delete selected images from cloudinary storage
        for(let filename of req.body.deleteImages){
            await cloudinary.uploader.destroy(filename);
        }
        //pull out images deleted from cloudinary for this profile
        await updatedProfile.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } });
        req.flash('success', 'Successfully uploaded and/or deleted selected images for this profile.');
    }    

    if (!updatedProfile) {
        req.flash('error', 'Failed to update! Cannot find that profile!');
        return res.redirect('/profiles');
    }
    req.flash('success', 'Successfully updated my profile!')
    res.redirect(`/profiles/${updatedProfile._id}`);
}

module.exports.destroyProfile = async (req, res) => {
    const profileToDelete = await Profile.findById(req.params.id);
    if (!profileToDelete) {
        req.flash('error', 'Failed to delete! Cannot find that profile!');
        return res.redirect('/profiles');
    }
    //delete reviews written on the profile, if any
    if (profileToDelete.reviews.length > 0) {
        await Review.deleteMany({ _id: { $in: profileToDelete.reviews } });
        req.flash('success', 'Successfully deleted reviews on the profile.');
    } else {
        req.flash('success', 'There was no reviews on the profile.');
    }

    //if the profile has any image uploaded to cloudinary, delete all images uploaded by the profile from cloudinary storage
    if(profileToDelete.images.length > 0){
        for(let image of profileToDelete.images){
            await cloudinary.uploader.destroy(image.filename);
        }
        req.flash('success', 'Successfully deleted all images uploaded by this profile.');
    }    

    await Profile.findByIdAndDelete(req.params.id);
    //set the profile's linked account's profile property to null -> allow the account to create new profile
    await Account.findByIdAndUpdate(req.body.accountId, { profile: null });
    req.flash('success', 'Successfully deleted the profile!');
    res.redirect('/profiles');
}