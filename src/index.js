const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');

require('dotenv').config();
const connectDB = require('../db/connect');
const scoreModel = require('../models/score');
const client = new Client({
    intents: (
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    )
});

const getAllScores = async (interaction) => {
    try {
        const scores = await scoreModel.find({});
        const sortedScores = scores.sort((a,b) => {
            if(a.score > b.score) {
                return -1;
            } else if(a.score < b.score) {
                return 1;
            } else {
                return 0;
            }
        });
        let res = 'Leaderboard:\n';
        for(let i = 0; i < sortedScores.length; i++) {
            res += `${i + 1}. ${sortedScores[i].name} with ${sortedScores[i].score} points\n`;
        }
        interaction.reply(res);
        console.log(sortedScores);
    } catch (err) {
        console.error(err);
    }
}
const win = async(interaction) => {
    try {
        const userName = (interaction.member.nickname) ? interaction.member.nickname : interaction.user.globalName;
        const userObject = await scoreModel.findOne({ name: userName });
        if(!userObject) {
            scoreModel.create({
                name: userName,
                score: 1
            });
        } else {
            const updatedUserObj = await scoreModel.findByIdAndUpdate(userObject._id, {
                name: userName,
                score: userObject.score + 1,
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
const lose = async(interaction) => {
    try {
        const userName = (interaction.member.nickname) ? interaction.member.nickname : interaction.user.globalName;
        const userObject = await scoreModel.findOne({ name: userName });
        if(!userObject) {
            scoreModel.create({
                name: userName,
                score: 1
            });
        } else {
            const updatedUserObj = await scoreModel.findByIdAndUpdate(userObject._id, {
                name: userName,
                score: userObject.score - 1,
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

client.on('ready', async (e) => {
    console.log(`${e.user.tag} is ready!`);
    client.user.setActivity('Keepin Scores');

    try {
        await connectDB(process.env.MONGO_URI);
    } catch (err) {
        console.error(err);
    }

    const win = new SlashCommandBuilder().setName('win').setDescription('Add a point for yourself in the leaderboard');
    client.application.commands.create(win);

    const oops = new SlashCommandBuilder().setName('oops').setDescription('Remove a point from yourself in the leaderboard');
    client.application.commands.create(oops);

    const leaderboard = new SlashCommandBuilder().setName('leaderboard').setDescription('Get the current leaderboard');
    client.application.commands.create(leaderboard);
});

client.on('interactionCreate', (interaction) => {
    if(!interaction.isChatInputCommand()) return;

    if(interaction.commandName === 'win') {
        interaction.reply(`Good job ${ (interaction.member.nickname) ? interaction.member.nickname : interaction.user.globalName }! Crush it again tomorrow!`);
        win(interaction);
    }
    if(interaction.commandName === 'oops') {
        interaction.reply('Make sure you only use "/win" when you have actually won a day');
        lose(interaction);
    }
    if(interaction.commandName === 'leaderboard') {
        getAllScores(interaction);
    }
});

client.login(process.env.TOKEN);