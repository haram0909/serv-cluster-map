if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');


const mongoDbUrl = process.env.MONGO_DB_URL ||'mongodb://localhost:27017/serv-cluster-map'
//doc's recommandation = https://mongoosejs.com/docs/index.html
connectToMongoDB().catch(err => console.log(err));
//https://mongoosejs.com/docs/migrating_to_6.html#no-more-deprecation-warning-options
async function connectToMongoDB() {
    await mongoose.connect(mongoDbUrl);
    console.log('MongoDb connection SUCCESS');
}




const app = express();

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



app.get('/', (req, res) => {
    res.render('home.ejs')
})



const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});