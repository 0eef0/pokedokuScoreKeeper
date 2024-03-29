// discord.js dependencies
const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');

require('dotenv').config(); // loading the .env
const connectDB = require('../db/connect'); // importing code to connect to database
const scoreModel = require('../models/score'); // importing the model for entries in the database
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

// Some global variables regarding permissions
const admins = ['Ethan', 'Miguel'];

// Some global variables regarding scores and streaks
const firstScore = 3; // points rewarded to first place
const secondScore = 2; // points rewarded to second place
const thirdScore = 1; // points rewarded to third place
const smallStreak = 2; // streak length requirement for personalized messages
const bigStreak = 5; // streak length requirement for a gold star

// Some global variables regarding emoticons used in messages, just in case a server has better ones to use
const firstPlace = ':first_place:'; // used instead of 1. on the leaderboard
const secondPlace = ':second_place:'; // used instead of 2. on the leaderboard
const thirdPlace = ':third_place:'; // used instead of 3. on the leaderboard
const goldStar = ':star:'; // rewarded to players with a bigStreak of wins
const crownIcon = ':crown:'; // rewarded to players who have won an interval

// Some global variables regarding universal and personalized messages
// Messages with embeded usernames are not included here, as they have to pull information that we do not have at this point of declaration
const personalizedStreakMsg = [
    {
        name: 'Ethan',
        msg: ` Everyone keep doin what they're doin.`
    },
    {
        name: 'Miguel',
        mgs: ` What a tryhard, you should find a girlfriend instead of studying the Pokedex.`
    }
];
const universalStreakMsg = ` Someone stop them!`;

const personalizedBigStreakMsg = [];
const universalBigStreakMsg = ` You are doing exceptionally well though, here is a gold star for your efforts!`;


// This code retrieves all scores from the database and inputs the leaderboard into the chat.
const returnMedal = (place) => {
    switch(place) {
        case 1:
            return firstPlace;
        case 2:
            return secondPlace;
        case 3:
            return thirdPlace;
        default:
            return ' ' + place + '.';
    }
}
const returnCrown = (crown) => {
    return (crown) ? crownIcon : '';
}
const returnStars = (stars) => {
    let temp = '';
    for(let i = 0; i < stars; i++) temp += goldStar;
    return temp;
}
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

        let currPlacing = 1;
        for(let i = 0; i < sortedScores.length; i++) {
            const { name, score, stars, crown } = sortedScores[i]; // destructure the current player

            if(i > 0 && sortedScores[i - 1].score != score) currPlacing++; // this is the if statement that settles ties

            res += `\t**${returnMedal(currPlacing)}** ${returnCrown(crown)}${name}${returnStars(stars)} with *${score} points*\n`; // add each score to the message string
        }

        let highestStreak = await scoreModel.findOne({ recentScore: 'first' }); // find the current highest streak user
        const { name: streakName, streak, stars, crown } = highestStreak; // destructuring highest streak user

        res += `\n### ${ streakName } has a winning streak of ${ streak } win${(streak > 1) ? 's' : ''}.`; // add the highest streak user to the message string

        // add personalized message for streak of smallStreak or higher
        if(streak >= smallStreak) {
            let personalized = false;
            for(let i of personalizedStreakMsg) {
                if(streakName === i.name) {
                    res += i.msg;
                    personalized = true;
                }
            }
            if(!personalized) res += universalStreakMsg;
        }

        // add a star to your name if you reach a streak as long as bigStreak variable
        if(streak >= bigStreak && streak % bigStreak == 0) {
            await scoreModel.findOneAndUpdate({ name: streakName }, {
                //name: userName,
                //score: highestStreak.score,
                //recentScore: highestStreak.recentScore,
                //streak: streak,
                stars: stars + 1,
                //crown: crown,
            });
            let personalized = false;
            for(let i of personalizedBigStreakMsg) {
                if(streakName === i.name) {
                    res += i.msg;
                    personalized = true;
                }
            }
            if(!personalized) res += universalBigStreakMsg;
        }

        interaction.reply(res); // Send the message string into the chat
    } catch (err) {
        console.error(err);
    }
}

// This is the methods that resets all of the scores on the leaderboard and gives a crown to the current leader
const resetLeaderboard = async (interaction) => {
    const userName = (interaction.member.nickname) ? interaction.member.nickname : interaction.user.globalName; // ternary operator used here to prioritize server nicknames and fall back to universal names

    if(admins.indexOf(userName) > -1) { // check whether or not the user is on the admin list
        const scores = await scoreModel.find({}); // get all scores
        const sortedScores = scores.sort((a,b) => {
            if(a.score > b.score) {
                return -1;
            } else if(a.score < b.score) {
                return 1;
            } else {
                return 0;
            }
        }); // sort them all in descending order
        // set all scores to 0, give a crown to the current leader, leave everything else the same
        for(let i of sortedScores) {
            await scoreModel.findOneAndUpdate({ name: i.name }, {
                name: i.name,
                score: 0,
                streak: i.streak,
                recentScore: i.recentScore,
                stars: i.stars,
                crown: sortedScores[0]._id == i._id,
            });
        }
        interaction.reply('Scores successfully reset.'); // reset feedback
    } else {
        interaction.reply('You do not have permission to use this command.'); // deny permission for non admins
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
                recentScore: (interaction.commandName != 'oops') ? interaction.commandName : userObject.recentScore,
                streak: (points === firstScore) ? 1 : 0,
                stars: 0,
                crown: false,
            });
        } else { // if the user does exist, then simply take their entry in the database and update their score by the amount of points given
            const updatedUserObj = await scoreModel.findByIdAndUpdate(userObject._id, {
                name: userName,
                score: userObject.score + points,
                recentScore: (interaction.commandName != 'oops') ? interaction.commandName : userObject.recentScore,
                streak: (points === firstScore) ? userObject.streak + 1 : 0,
                //stars: 0,
                crown: false,
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
    client.user.setActivity('scorekeeper'); // set the bot activity

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

    // initializing the command to reset the leaderboard and give current leader a crown in their name
    const reset = new SlashCommandBuilder().setName('reset').setDescription('Reset the leaderboard and give current leader a crown (Admins only)');
    client.application.commands.create(reset);

    // initializing the command to register your birthday to the database
    const register = new SlashCommandBuilder().setName('register').setDescription('Register your birthday to the database').addStringOption(option => option.setName('month').setDescription('Choose your birth month').setRequired(true).addChoices(
        { name: 'January', value: '0' },
        { name: 'February', value: '1' },
        { name: 'March', value: '2' },
        { name: 'April', value: '3' },
        { name: 'May', value: '4' },
        { name: 'June', value: '5' },
        { name: 'July', value: '6' },
        { name: 'August', value: '7' },
        { name: 'September', value: '8' },
        { name: 'October', value: '9' },
        { name: 'November', value: '10' },
        { name: 'December', value: '11' },
    )).addStringOption(option => option.setName('datefirstdigit').setDescription('Choose your birth date (first digit)').setRequired(true).addChoices(
        { name: '0', value: '0' },
        { name: '1', value: '1' },
        { name: '2', value: '2' },
        { name: '3', value: '3' }
        )).addStringOption(option => option.setName('dateseconddigit').setDescription('Choose your birth date (second digit)').setRequired(true).addChoices(
        { name: '0', value: '0' },
        { name: '1', value: '1' },
        { name: '2', value: '2' },
        { name: '3', value: '3' },
        { name: '4', value: '4' },
        { name: '5', value: '5' },
        { name: '6', value: '6' },
        { name: '7', value: '7' },
        { name: '8', value: '8' },
        { name: '9', value: '9' }
        ));
    client.application.commands.create(register);
});

// code that takes in commands from users and does stuff with them
client.on('interactionCreate', async(interaction) => {
    if(!interaction.isChatInputCommand()) return; // if the command is not initialized, then return blank

    const userName = (interaction.member.nickname) ? interaction.member.nickname : interaction.user.globalName; // ternary operator used here to prioritize server nicknames and fall back to universal names

    const today = new Date();
    const currMonth = today.getMonth();
    const currDate = today.getDate();
    const currDay = today.getDay();

    const user = await scoreModel.findOne({ name: userName });
    const userBMonth = user.birthMonth;
    const userBDate = user.birthDate;

    // commands for adding points to the leaderboard
    let msgData = {};
    switch(true) {
        case currMonth == userBMonth && currDate == userBDate:
            msgData = {
                msg: `Happy Birthday ${ userName }! Triple Points! Some consolation for being gross and old.`,
                modifier: 3,
            };
            break;
        case currMonth == 11 && currDate == 25:
            msgData = {
                msg: `Merry Christmas ${ userName }! :christmas_tree: Double Points!`,
                modifier: 2,
            };
            break;
        case currMonth == 0 && currDate == 1:
            msgData = {
                msg: `Happy New Year ${ userName }! Double Points! Better stick to your resolutions!`,
                modifier: 2,
            };
            break;
        case currMonth == 9 && currDate == 31:
            msgData = {
                msg: `Happy Halloween ${ userName }! Double Points! Your costume better be good or Ethan will take bonus points away!`,
                modifier: 2,
            };
            break;
        case currMonth == 10 && currDate >= 22 && currDate <= 28 && currDay == 4:
            msgData = {
                msg: `Happy Thanksgiving ${ userName }! :turkey: Double points! Be grateful!`,
                modifier: 2,
            };
            break;
        case interaction.commandName === 'first':
            msgData = {
                msg: `Good job ${ userName }! Crush it again tomorrow!`,
                modifier: 1,
            };
            break;
        case interaction.commandName === 'second':
            msgData = {
                msg: `You got robbed ${ userName }! Tomorrow is a new day!`,
                modifier: 1,
            };
            break;
        case interaction.commandName === 'third':
            msgData = {
                msg: `You be slackin ${ userName }!`,
                modifier: 1,
            };
            break;
        default:
            msgData = { modifier: 1 };
    }

    if(['first', 'second', 'third'].indexOf(interaction.commandName) > -1) {
        interaction.reply(msgData.msg);
        const playerScore = (interaction.commandName == 'first') ?
                                firstScore : (interaction.commandName == 'second') ?
                                    secondScore : thirdScore; 
        pointAdjust(interaction, playerScore * msgData.modifier);
    }

    // command for remove points from the leaderboard
    if(interaction.commandName === 'oops') {
        interaction.reply('Make sure you only use a win command when you have actually won a day');
        const lastScore = (user.recentScore == 'first') ? 
                            firstScore : (user.recentScore == 'second') ?
                                secondScore : thirdScore;
        pointAdjust(interaction, lastScore * msgData.modifier * -1);
    }

    // command for displaying the leaderboard
    if(interaction.commandName === 'leaderboard') {
        if(admins.indexOf(userName) > -1) {
            getAllScores(interaction);
        } else {
            interaction.reply("You do not have permission to use this command.");
        }
    }

    // command for resetting the leaderboard
    if(interaction.commandName === 'reset') {
        resetLeaderboard(interaction);
    }

    // command for registering your birthday
    if(interaction.commandName === 'register') {
        if(!user.bDayRegistered) {
            const setBMonth = Number(interaction.options._hoistedOptions[0].value);
            const setBDate = Number(interaction.options._hoistedOptions[1].value) * 10 + Number(interaction.options._hoistedOptions[2].value)
            await scoreModel.findOneAndUpdate({ name: userName }, {
                birthMonth: setBMonth,
                birthDate: setBDate,
                bDayRegistered: true
            });
            interaction.reply('Your birthday has been set.')
        } else {
            interaction.reply('You have already registered a birthday.')
        }
    }
});

// Login for the bot
client.login(process.env.TOKEN);