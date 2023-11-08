const mongoose = require('mongoose');

const connectDB = (uri) => {
    return mongoose
    .connect(uri)
    .then(() => {console.log('CONNECTED TO MONGODB')})
    .catch((err) => console.log(err));
}

module.exports = connectDB;