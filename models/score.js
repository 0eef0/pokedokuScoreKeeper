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
        type: String,
        required: [true, 'Must provide recent score'],
        trim: true,
    },
    streak: {
        type: Number,
        required: [true, 'Must provide streak'],
        trim: true,
    },
    stars: {
        type: Number,
        required: [true, 'Must provide star count'],
    },
    crown: {
        type: Boolean,
        required: [true, 'Must provide crown status'],
    },
    birthMonth: {
        type: Number
    },
    birthDate: {
        type: Number,
    },
    bDayRegistered: {
        type: Boolean,
        required: [true, 'Must provide registered status']
    }
});

module.exports = mongoose.model('Score', ScoreSchema);