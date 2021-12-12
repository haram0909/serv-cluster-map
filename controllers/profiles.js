//models
const Profile = require('../models/profile.js');
const Account = require('../models/account.js');
const Review = require('../models/review.js');





//controller functions related to profiles

module.exports.showIndex = async (req, res) => {
    const profiles = await Profile.find({}).populate('account');
    res.render('profiles/index.ejs', { profiles });
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
    //link the currentAccount with the newly created profile
    const profile = new Profile(res.locals.profile);
    profile.account = account;
    await profile.save();
    //link the newly created profile to the currentAccount
    await Account.findByIdAndUpdate(req.body.accountId, { profile: profile }, { upsert: true });
    req.flash('success', 'Successfully created my profile!');
    //https://stackoverflow.com/questions/38011068/how-to-remove-object-taking-into-account-references-in-mongoose-node-js
    res.redirect(`/profiles/${profile._id}`);
}

module.exports.updateProfile = async (req, res) => {
    const updatedProfile = await Profile.findByIdAndUpdate(req.params.id, { $set: res.locals.profile }, { upsert: true, new: true });
    //!!!! implement image upload here

    // const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    // campground.images.push(...imgs);
    // await campground.save();
    // if (req.body.deleteImages) {
    //     for (let filename of req.body.deleteImages) {
    //         await cloudinary.uploader.destroy(filename);
    //     }
    //     await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
    // }

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
    await Profile.findByIdAndDelete(req.params.id);
    //set the profile linked account's profile property to null -> allow the account to create new profile
    await Account.findByIdAndUpdate(req.body.accountId, { profile: null });
    req.flash('success', 'Successfully deleted the profile!');
    res.redirect('/profiles');
}