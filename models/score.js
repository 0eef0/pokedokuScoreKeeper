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
    },
    recentScore: {
        type: Number,
        required: [true, 'Must provide recent score'],
        trim: true,
    },
    streak: {
        type: Number,
        required: [true, 'Must provide streak'],
        trim: true,
    },
});

module.exports = mongoose.model('Score', ScoreSchema);