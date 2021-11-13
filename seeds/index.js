//Seeding local mongoDB for development purpose
const mongoose = require('mongoose');

//import cleaned dataset for seeding database
const locations = require('./locations.js');
const names = require('./firstname-lastname.js');
const emails = require('./emails.js');
const { descriptors, areas } = require('./offerings.js');
const proglangs = require('./proglang.js');

//import models
const User = require('../models/user.js');
const ProgLang = require('../models/proglang.js');
const Offering = require('../models/offering.js');

//establish mongoose connection
const mongoDbUrl = 'mongodb://localhost:27017/serv-cluster-map'
//doc's recommandation = https://mongoosejs.com/docs/index.html
connectToMongoDB().catch(err => console.log(err));
//https://mongoosejs.com/docs/migrating_to_6.html#no-more-deprecation-warning-options
async function connectToMongoDB() {
    await mongoose.connect(mongoDbUrl);
    console.log('##MongoDb connection SUCCESS');
}

//delete and populate proglangs collection
const seedProgLangCol = async () => {
    await ProgLang.deleteMany({});
    for (let i = 0; i < proglangs.length; i++) {
        console.log(`##Seeding proglang ${i}.`);
        const proglangEntry = new ProgLang({
            proglang: `${proglangs[i]}`
        })
        await proglangEntry.save();
    }
}

//function to pick random item from array
const randomItem = array => array[Math.floor(Math.random() * array.length)];
//function to pick random number between 0 and set max
const random0toNum = (maxNum) => Math.floor(Math.random() * maxNum);

//delete and populate offerings and users collections
//offerings colletion will be populated as users collection gets populated
const seedUserAndOfferingCol = async () => {
    //drop users collection
    await User.deleteMany({});
    //drop offerings collection
    await Offering.deleteMany({});
    for (let i = 0; i < names.length; i++) {
        console.log(`##Seeding user ${i}.`);
        const randomLocation = randomItem(locations);
        //get proglang documents to be used for current iteration of user
        const proglang1 = await ProgLang.findOne({ proglang: randomItem(proglangs) });
        const proglang2 = await ProgLang.findOne({ proglang: randomItem(proglangs) });
        const proglang3 = await ProgLang.findOne({ proglang: randomItem(proglangs) });
        //randomly assign true or false
        const availOrNot = Math.random() < 0.5;

        //populate offerings collections 
        //the 3 offerings will be bound as objectId to user to be created at current iteration
        console.log(`##Seeding offering ${i} for user ${i}.`);
        const offering1 = new Offering({
            service: `${randomItem(descriptors)} ${randomItem(areas)}`,
            //random num between 0 to 150 (usd per hour)
            price: `${random0toNum(150)}`
        })
        await offering1.save();
        const offering2 = new Offering({
            service: `${randomItem(descriptors)} ${randomItem(areas)}`,
            price: `${random0toNum(150)}`
        })
        await offering2.save();
        const offering3 = new Offering({
            service: `${randomItem(descriptors)} ${randomItem(areas)}`,
            price: `${random0toNum(150)}`
        })
        await offering3.save();


        //new user of current iteration
        const user = new User({
            firstname: `${names[i].firstname}`,
            lastname: `${names[i].lastname}`,
            email: `${emails[i].email}`,
            introduction: 'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ad laudantium totam excepturi ducimus eos amet in, dolores molestias nemo autem culpa voluptatibus sunt, vero veritatis ipsam accusamus nostrum assumenda fugiat.',
            images: [
                {
                    url: 'https://images.unsplash.com/photo-1570286424717-86d8a0082d0c?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=436&q=80',
                    filename: 'MorseCode'
                },
                {
                    url: 'https://images.unsplash.com/photo-1615525137689-198778541af6?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1032&q=80',
                    filename: 'CCode'
                }
            ],
            location: `${randomLocation.properties.location}`,
            //should pass in entire goemetry obj without converting to string
            geometry: randomLocation.geometry,
            skills: [{
                //passing in entire found doc will auto cast to objectId
                proglang: proglang1,
                //random num between 1 to 30 (year)
                experience: `${random0toNum(30)}`
            },
            {
                proglang: proglang2,
                experience: `${random0toNum(30)}`
            },
            {
                proglang: proglang3,
                experience: `${random0toNum(30)}`
            }
            ],
            //either true or false
            availability: availOrNot,
            offerings: [
                offering1,
                offering2,
                offering3
            ]
        })
        await user.save();
    }
}

//using async await, 
//1. seed proglangs collection 
//2. seed users collection, 
//3. lastly close mongoose connection
const executeSeeding = async () => {
    await seedProgLangCol().then(() => {
        console.log('## proglangs collection seeded');
    });
    await seedUserAndOfferingCol().then(() => {
        console.log('## users collection and offerings collection seeded');
    });
    await mongoose.connection.close();
}

executeSeeding();