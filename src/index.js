// discord.js dependencies
const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');

require('dotenv').config(); // loading the .env
const connectDB = require('../db/connect'); // importing code to connect to database
const scoreModel = require('../models/score'); // importing the model for entries in the database
const score = require('../models/score');
const client = new Client({ // initialize the bot itself
    intents: (
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    )
});

// Code to erase all commands
// const rest = new REST().setToken(process.env.TOKEN);
// rest.put(Routes.applicationCommands('1171318313276686356'), { body: [] })
// 	.then(() => console.log('Successfully deleted all application commands.'))
// 	.catch(console.error);

// Some global variables regarding scores and streaks
const firstScore = 3;
const secondScore = 2;
const thirdScore = 1;
const smallStreak = 2;
const bigStreak = 10;

// This code retrieves all scores from the database and inputs the leaderboard into the chat.
const getAllScores = async (interaction) => {
    try {
        const scores = await scoreModel.find({}); // get all scores from the database
        const sortedScores = scores.sort((a,b) => {
            if(a.score > b.score) {
                return -1;
            } else if(a.score < b.score) {
                return 1;
            } else {
                return 0;
            }
        }); // sort them all in descending order
        let res = '>>> # __\t\t\tLeaderboard\t\t\t__\n'; // initialize the message string

        const returnMedal = (place) => {
            switch(place) {
                case 1:
                    return ':first_place:';
                case 2:
                    return ':second_place:';
                case 3:
                    return ':third_place:';
                default:
                    return ' ' + place + '.';
            }
        }

        for(let i = 0; i < sortedScores.length; i++) {
            res += `\t**${returnMedal(i + 1)}** ${sortedScores[i].name} with *${sortedScores[i].score} points*\n`; // add each score to the message string
        }

        let highestStreak = await scoreModel.findOne({ recentScore: firstScore }); // find the current highest streak user

        res += `\n### ${ highestStreak.name } has a winning streak of ${ highestStreak.streak } win${(highestStreak.streak > 1) ? 's' : ''}.`; // add the highest streak user to the message string

        // add personalized message for streak of smallStreak or higher
        if(highestStreak.streak >= smallStreak) {
            if(highestStreak.name === "Ethan") {
                res += ` Everyone keep doin what they're doin.`
            } else if(highestStreak.name === "Miguel"){
                res += ` What a tryhard, you should find a girlfriend instead of studying the Pokedex.`
            } else {
                res += ` Someone stop them!`
            }
        }

        // add a star to your name if you reach a streak as long as bigStreak variable
        if(highestStreak.streak >= bigStreak && highestStreak.streak % bigStreak == 0) {
            await scoreModel.findOneAndUpdate({ name: highestStreak.name }, {
                name: userName + ':star:',
                score: highestStreak.score,
                recentScore: highestStreak.recentScore,
                streak: highestStreak.streak
            })
            res += ` You are doing exceptionally well though, here is a gold star for your efforts!`
        }

        interaction.reply(res); // Send the message string into the chat
    } catch (err) {
        console.error(err);
    }
}

// This is the method that changes the score for a person specified in the interaction object, by the number of points given.
const pointAdjust = async(interaction, points) => {
    try {
        const userName = (interaction.member.nickname) ? interaction.member.nickname : interaction.user.globalName; // ternary operator used here to prioritize server nicknames and fall back to universal names
        const userObject = await scoreModel.findOne({ name: userName }); // find a user in the database with matching username
        if(!userObject) { // if the user doesn't exist, then add them to the database and initialize them with the given amount of points
            scoreModel.create({
                name: userName,
                score: points,
                recentScore: Math.abs(points),
                streak: (points === firstScore) ? 1 : 0,
            });
        } else { // if the user does exist, then simply take their entry in the database and update their score by the amount of points given
            const updatedUserObj = await scoreModel.findByIdAndUpdate(userObject._id, {
                name: userName,
                score: userObject.score + points,
                recentScore: Math.abs(points),
                streak: (points === firstScore) ? userObject.streak + 1 : 0,
            },
            {
                new: true,
            });
            console.log(updatedUserObj);
        }
    } catch (err) {
        console.error(err);
    }
}

client.on('ready', async (e) => { // run to make sure the bot is ready for inputs
    console.log(`${e.user.tag} is ready!`);
    client.user.setActivity('Keepin Scores'); // set the bot activity

    // connecting to the database
    try {
        await connectDB(process.env.MONGO_URI);
    } catch (err) {
        console.error(err);
    }

    // initializing commands for adding points on the leaderboard for first, second, and third place
    const first = new SlashCommandBuilder().setName('first').setDescription('Add three points for yourself in the leaderboard');
    client.application.commands.create(first);
    const second = new SlashCommandBuilder().setName('second').setDescription('Add two points for yourself in the leaderboard');
    client.application.commands.create(second);
    const third = new SlashCommandBuilder().setName('third').setDescription('Add a point for yourself in the leaderboard');
    client.application.commands.create(third);

    // initializing the command to remove points on the leaderboard
    const oops = new SlashCommandBuilder().setName('oops').setDescription('Remove a point from yourself in the leaderboard');
    client.application.commands.create(oops);

    // initializing the command to print the leaderboard and send it in the chat
    const leaderboard = new SlashCommandBuilder().setName('leaderboard').setDescription('Get the current leaderboard');
    client.application.commands.create(leaderboard);
});

// code that takes in commands from users and does stuff with them
client.on('interactionCreate', async(interaction) => {
    if(!interaction.isChatInputCommand()) return; // if the command is not initialized, then return blank

    // commands for adding points to the leaderboard
    if(interaction.commandName === 'first') {
        interaction.reply(`Good job ${ (interaction.member.nickname) ? interaction.member.nickname : interaction.user.globalName }! Crush it again tomorrow!`);
        pointAdjust(interaction, firstScore);
    }
    if(interaction.commandName === 'second') {
        interaction.reply(`You got robbed ${ (interaction.member.nickname) ? interaction.member.nickname : interaction.user.globalName }! Tomorrow is a new day!`);
        pointAdjust(interaction, secondScore);
    }
    if(interaction.commandName === 'third') {
        interaction.reply(`You be slackin ${ (interaction.member.nickname) ? interaction.member.nickname : interaction.user.globalName }!`);
        pointAdjust(interaction, thirdScore);
    }

    // command for remove points from the leaderboard
    if(interaction.commandName === 'oops') {
        interaction.reply('Make sure you only use a win command when you have actually won a day');
        let user = await scoreModel.findOne({ name: (interaction.member.nickname) ? interaction.member.nickname : interaction.user.globalName });
        pointAdjust(interaction, user.recentScore * -1);
    }

    // command for displaying the leaderboard
    if(interaction.commandName === 'leaderboard') {
        getAllScores(interaction);
    }
});

// Login for the bot
client.login(process.env.TOKEN);