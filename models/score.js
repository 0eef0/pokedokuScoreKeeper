const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Must provide name'],
        trim: true,
    },
    score: {
        type: Number,
        required: [true, 'Must provide score'],
        trim: true,
    }
});

module.exports = mongoose.model('Score', ScoreSchema);