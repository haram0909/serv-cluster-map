const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

//confingure cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

//instantiate cloudinary storage
const storage = new CloudinaryStorage({
    //pass in configured cloudinary object
    cloudinary,
    params:{
        //folder in cloudinary, where we will store files in
        folder: 'MappedExps',
        allowedFormats: ['jpeg', 'png', 'jpg']
    }
});

module.exports = {
    cloudinary,
    storage
}