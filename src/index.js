const express = require('express');
require('express-async-errors');
const cors = require('cors');
const quiz = require('./services/quiz');

// This allows us to read environment variables from the .env file
// (But, when the system runs in the cloud, it won't use the file)
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// This is just for SSL certificate verification!
app.use('/.well-known/pki-validation', express.static('src/pki-validation/'));

// Create or update a quiz, ready for playing later
app.post('/quiz', async (req, res) => {
    const id = await quiz.saveQuizAsync(req.body);
    res.status(200).json({ id });
});

// Get quiz (to review or edit it)
app.get('/quiz/:id', async (req, res) => {
    const id = req.params.id;
    const quizData = await quiz.getQuizAsync(id);
    res.status(200).json(quizData);
});

// Delete quiz
app.delete('/quiz/:id', async (req, res) => {
    const id = req.params.id;
    await quiz.deleteQuizAsync(id);
    res.status(200).end();
});

// Get list of all quizzes
app.get('/quiz', async (req, res) => {
    const list = await quiz.getAllQuizzesAsync();
    res.status(200).json(list);
});

// Start hosting a quiz (with given ID)
app.post('/host/:id', async (req, res) => {
    const id = req.params.id;
    const roomCode = await quiz.hostQuizAsync(id);
    const state = await quiz.getStateAsync(roomCode);
    res.status(200).json(state);
});

// Join the quiz as a player
app.post('/join/:roomCode', async (req, res) => {
    const roomCode = req.params.roomCode;
    const playerName = req.body.playerName;
    await quiz.joinQuizAsync(roomCode, playerName);
    const state = await quiz.getStateAsync(roomCode, playerName);
    res.status(200).json(state);
});

// Get state of quiz
app.get('/state/:roomCode/:playerName?', async (req, res) => {
    const roomCode = req.params.roomCode;
    const playerName = req.params.playerName;
    const state = await quiz.getStateAsync(roomCode, playerName);
    res.status(200).json(state);
});

// Move to next stage of the quiz
app.post('/next/:roomCode', async (req, res) => {
    const roomCode = req.params.roomCode;
    const finished = await quiz.nextStageAsync(roomCode);
    if (finished) {
        res.status(204).send('Room deleted');
        return;
    }
    const state = await quiz.getStateAsync(roomCode);
    res.status(200).json(state);
});

// Answer a question
app.post('/answer/:roomCode/:playerName', async (req, res) => {
    const roomCode = req.params.roomCode;
    const playerName = req.params.playerName;
    const answer = req.body.answer;
    await quiz.submitAnswerAsync(roomCode, playerName, answer);
    const state = await quiz.getStateAsync(roomCode, playerName);
    res.status(200).json(state);
});

// Delete quiz
app.delete('/room/:roomCode', async (req, res) => {
    const roomCode = req.params.roomCode;
    await quiz.deleteRoomAsync(roomCode);
    res.status(200).end();
});

// Show version information
app.get('/version', (req, res) => {
    res.status(200).send({
        version: process.env.VERSION || 1
    });
});

// Catch-all handler
app.all('*', (req, res) => {
    res.status(400).json({
        error: 'No API handler for URL'        
    });
});

// Use a better error handler
app.use((err, req, res, next) => {
    switch (err.name) {
        case 'NotFoundError':
            res.status(404);
            break;
        case 'InvalidOperationError':
        case 'ValidationError':
            res.status(400);
            break;
        default:
            res.status(500);
            break;
    }
    res.json({ error: err.message });
});

const port = process.env.PORT || 8001;
app.listen(port, () => {
    console.log(`quiz-api listening on port ${port}`);
});
