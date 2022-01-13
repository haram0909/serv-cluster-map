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
    // const profiles = await Profile.find().sort({ _id: -1 }).populate('account');
    //get oldest profiles first
    // const profiles = await Profile.find().populate('account');

        const [ results, itemCount ] = await Promise.all([
          Profile.find({}).sort({ _id: -1 }).limit(req.query.limit).skip(req.skip).populate('account').exec(),
        //   because of deprecation, Profile.count({}) has been replaced with below  
          Profile.countDocuments({})
        ]);
     
        const pageCount = Math.ceil(itemCount / req.query.limit);
        // console.log(pageCount)

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
        // console.log(hasNextPage)
        const hasPreviousPage = res.locals.paginate.hasPreviousPages;
      
            // console.log('pageCount = ')
            // console.log(pageCount)
            // console.log('itemCount = ')
            // console.log(itemCount)
            // console.log('pages = ')
            // console.dir(paginate.getArrayPages(req)(3, pageCount, req.query.page))
            // console.log('hasPreviousPage = ')
            // console.log(hasPreviousPage)

            // check if it is the first page
            let profilesCluster = {};
            if(!hasPreviousPage){
                profilesCluster = await Profile.find().populate('account');
            }

        res.render('profiles/index.ejs', {
            profilesCluster,
            profiles: results,
            // pageCount,
            // itemCount,
            hasPreviousPage,
            hasNextPage,
            pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
          });
        // }
     


    // console.dir(profiles);
    // return res.send('SENT FROM SHOWINDEX controller fn')

//    res.render('profiles/index.ejs', { profiles: results });
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
        // throw new Error("This Account already has a valid My Profile. An account is not allowed to have more than 1 valid profile.");
        req.flash('error', 'This Account already has a valid profile. An account is not allowed to have more than 1 valid profile.');
        return res.redirect(`/account/${account._id}`);
    }

    // console.log(req.body) //req.body.profile.location
    // console.log();
    // console.log(res.locals.profile) //.location
    // // return res.send(req.body)

    //using mapbox instance, forward goecode to generate long and lat for location string
    const forwardGeocodedLocation = await geocoder.forwardGeocode({
        // query: req.body.profile.location ,
        query: res.locals.profile.location,
        limit: 1
    }).send();
    // console.log()
    // console.log('Forward geocoded geoData = ')
    // console.log(forwardGeocodedLocation.body.features) //reuslts in []  null and empty --> 
    // console.log()
    // //If null, i.e., cannot get coordinate of the location, hardcode to Antarctic Ice shield, Antarctica coordinate
    // console.log(  (forwardGeocodedLocation.body.features[0])? forwardGeocodedLocation.body.features[0].geometry : {type:"Point", coordinates:[38.897957, -77.036560]} );
    
    

     if(!forwardGeocodedLocation.body.features[0]){     
        // console.log('Failed to get geo coordinate of the location of the profile.');   
        req.flash('error','Location of the profile was not identifiable. Location map will point to a default location.');
     } 
     
    const geoData = (forwardGeocodedLocation.body.features[0])? forwardGeocodedLocation.body.features[0].geometry : {type:"Point", coordinates:[38.897957, -77.036560]} ;
        //below's geometry will be undefined => if location string was invalid
    // res.locals.profile.geometry = geoData;
    // return res.send(res.locals.profile)

    //link the currentAccount with the newly created profile
    const profile = new Profile(res.locals.profile);
    profile.geometry = geoData;
    profile.account = account;

    //save image files uploaded to cloudinary's filename and path(url)
        //extract path and filename and create array of objects containing {url: path value, filename: filename value}
        //!!!! we also SHOULD have file upload count and size limits for both client-side and server-side (but we dont have it yet)
    profile.images = req.files.map(file => ({ url: file.path, filename: file.filename  }));

    await profile.save();
    // console.log(profile);

    //link the newly created profile to the currentAccount
    await Account.findByIdAndUpdate(req.body.accountId, { profile: profile }, { upsert: true });
    req.flash('success', 'Successfully created my profile!');
    //https://stackoverflow.com/questions/38011068/how-to-remove-object-taking-into-account-references-in-mongoose-node-js
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
        // console.log(req.body.deleteImages);
        //delete selected images from cloudinary storage
        for(let filename of req.body.deleteImages){
            // console.log(filename);
            //may NOT want to do await here for perceived performance...?
            await cloudinary.uploader.destroy(filename);
        }
        //pull out images deleted from cloudinary for this profile
        await updatedProfile.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } });
        req.flash('success', 'Successfully uploaded and/or deleted selected images for this profile.');
    }    
    // console.log(updatedProfile);

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
    //delete reviews written on the profile to delete, if any
    if (profileToDelete.reviews.length > 0) {
        await Review.deleteMany({ _id: { $in: profileToDelete.reviews } });
        req.flash('success', 'Successfully deleted reviews on the profile.');
    } else {
        req.flash('success', 'There was no reviews on the profile.');
    }

    //delete all images from cloudinary, if the profile has any image uploaded to cloudinary
    if(profileToDelete.images.length > 0){
        // console.log('DELETING IMAGES OF PROFILE = ')
        //delete selected images from cloudinary storage
        for(let image of profileToDelete.images){
            // console.log(image.filename)
            //may NOT want to do await here for perceived performance...?
            await cloudinary.uploader.destroy(image.filename);
        }
        req.flash('success', 'Successfully deleted all images uploaded by this profile.');
    }    
    // console.log(profileToDelete);





    await Profile.findByIdAndDelete(req.params.id);
    //set the profile linked account's profile property to null -> allow the account to create new profile
    await Account.findByIdAndUpdate(req.body.accountId, { profile: null });
    req.flash('success', 'Successfully deleted the profile!');
    res.redirect('/profiles');
}