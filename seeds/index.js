//Seeding local mongoDB for development purpose
const mongoose = require('mongoose');

//import cleaned dataset for seeding database
const locations = require('./locations.js');
const names = require('./firstname-lastname.js');
const emails = require('./emails.js');
const { descriptors, areas } = require('./offerings.js');
const proglangs = require('./proglang.js');

//import models
const Profile = require('../models/profile.js');
const Account = require('../models/account.js');
const Review = require('../models/review.js');

//establish mongoose connection
const mongoDbUrl = 'mongodb://localhost:27017/serv-cluster-map'
//doc's recommandation = https://mongoosejs.com/docs/index.html
connectToMongoDB().catch(err => console.log(err));
//https://mongoosejs.com/docs/migrating_to_6.html#no-more-deprecation-warning-options
async function connectToMongoDB() {
    await mongoose.connect(mongoDbUrl);
    console.log('##MongoDb connection SUCCESS');
}


//function to pick random item from array
const randomItem = array => array[Math.floor(Math.random() * array.length)];
//function to pick random number between set min and max number both inclusive
const randomNumToNum = (minNum, maxNum) => Math.floor(Math.random() * (maxNum - minNum + 1) + minNum);

//delete and populate accounts and profiles collections
//profiles collection will be populated as accounts collection gets populated
//account doc's profile object id will be filled back after profile doc seeded
const seedAccountProfileCol = async () => {
    //drop accounts collection
    await Account.deleteMany({});
    //drop users collection
    await Profile.deleteMany({});


    //create account to attach profile
    for (let i = 0; i < names.length; i++) {
        console.log(`##Seeding account ${i}.`);
        const accountInfo = {
            firstname: `${names[i].firstname}`,
            lastname: `${names[i].lastname}`,
            email: `${emails[i].email}`,
            //will use email address as username and password because emails are unique 
            username: `${emails[i].email}`
        };

        
            const password = `${emails[i].email}`;
            const accountEntry = new Account(accountInfo);
            
            

        console.log(`##Seeding profile ${i}.`);

        //randomly assign a location from dataset
        const randomLocation = randomItem(locations);

        //get 3 unique proglang documents to be used for current iteration of profile
        const indexForProglang1 = randomNumToNum(0, 11);
        let indexForProglang2 = randomNumToNum(0, 11);
        while (indexForProglang1 === indexForProglang2) {
            indexForProglang2 = randomNumToNum(0, 11);
        }
        //property proglang's type changed to String from ObjectId
        const proglang1 = proglangs[indexForProglang1];
        // const proglang1 = await ProgLang.findOne({ proglang: proglangs[indexForProglang1] });
        console.log(`>> selected proglang1 = ${proglang1}`);
        const proglang2 = proglangs[indexForProglang2];
        // const proglang2 = await ProgLang.findOne({ proglang: proglangs[indexForProglang2] });
        console.log(`>> selected proglang2 = ${proglang2}`);
        const proglang3 = proglangs[randomNumToNum(12, proglangs.length-1)];
        // const proglang3 = await ProgLang.findOne({ proglang: proglangs[randomNumToNum(12, proglangs.length)] });
        console.log(`>> selected proglang3 = ${proglang3}`);

        //randomly assign true or false
        const availOrNot = Math.random() < 0.5;

        //new profile of current iteration
        const profileEntry = new Profile({
            account: accountEntry,
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
                experience: `${randomNumToNum(0, 30)}`
            },
            {
                proglang: proglang2,
                experience: `${randomNumToNum(0, 30)}`
            },
            {
                proglang: proglang3,
                experience: `${randomNumToNum(0, 30)}`
            }
            ],
            //either true or false
            availability: availOrNot,
            offerings: [
                {
                    service: `${randomItem(descriptors)} ${randomItem(areas)}`,
                    //random num between 0 to 150 (usd per hour)
                    price: `${randomNumToNum(0, 150)}`
                },
                {
                    service: `${randomItem(descriptors)} ${randomItem(areas)}`,
                    //random num between 0 to 150 (usd per hour)
                    price: `${randomNumToNum(0, 150)}`
                },
                {
                    service: `${randomItem(descriptors)} ${randomItem(areas)}`,
                    //random num between 0 to 150 (usd per hour)
                    price: `${randomNumToNum(0, 150)}`
                }
            ]
        })
        //attach profile to account
        accountEntry.profile = profileEntry._id;
        //register the account and save the account to accounts collection
        const registeredAccount = await Account.register(accountEntry, password);
            console.log('registered account = ');
            console.log(registeredAccount);
        // await accountEntry.save();
        await profileEntry.save();
    }
}

//using async await, 
//1. seed accounts, profiles, and offerings collection 
//2. close mongoose connection
const executeSeeding = async () => {
    await seedAccountProfileCol().then(() => {
        console.log('## accounts and profiles collections seeded');
    });
    await mongoose.connection.close();
}

executeSeeding();