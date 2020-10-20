const db = require('./db');
const _ = require('underscore');
const { ValidationError, NotFoundError, InvalidOperationError } = require('./errors');

async function saveQuizAsync(quiz) {
    quiz.name = (quiz.name || '').trim();
    if (quiz.name == '') {
        throw new ValidationError('Blank quiz name');
    }

    const allQuizzes = await db.getAllQuizzes();
    const nameExists = allQuizzes
        .filter(q => q.id != quiz.id)
        .some(q => q.name.toLowerCase() == quiz.name.toLowerCase().trim());    
    if (nameExists) {
        throw new ValidationError('Duplicate quiz name');
    }

    if (quiz.questions.some(q => (q.question || '').trim() == '')) {
        throw new ValidationError('Blank question');
    }

    quiz.questions.forEach(q => {
        if (['correctAnswer', 'wrongAnswer1', 'wrongAnswer2', 'wrongAnswer3'].some(e => (q[e] || '').trim() == '')) {
            throw new ValidationError('Blank answer');
        }
    });

    const id = await db.saveQuiz(quiz);
    return id;
}

async function getAllQuizzesAsync() {
    const quizzes = await db.getAllQuizzes();
    const list = quizzes.map(quiz => {
        return {
            id: quiz.id,
            name: quiz.name
        };
    });
    return list;
}

async function getQuizAsync(id) {
    const quiz = await db.getQuiz(id);
    if (quiz == undefined) {
        throw new NotFoundError('Quiz not found');
    }
    return quiz;
}

async function deleteQuizAsync(id) {
    const quiz = await db.getQuiz(id);
    if (quiz == undefined) {
        throw new NotFoundError('Quiz not found');
    }
    await db.deleteQuiz(id);
}

function getRandom4DigitCode() {
    return (Math.trunc(Math.random() * 9000) + 1000).toString();
}

function trueShuffle(list) {
    let needToShuffle = true;
    let shuffled;

    while (needToShuffle) {
        shuffled = _.shuffle(list);
        for (let i = 0; i < list.length; i++)
        {
            if (shuffled[i] != list[i]) {
                needToShuffle = false;
                break;
            }
        }    
    }

    return shuffled;
}

async function hostQuizAsync(id, getRandomRoomCode = getRandom4DigitCode) {
    const quiz = await db.getQuiz(id);

    if (quiz == undefined) {
        throw new NotFoundError('Quiz not found');
    }

    const questions = [];

    quiz.questions.forEach(q => {
        let answers = [
            { answer: q.correctAnswer, isCorrect: true },
            { answer: q.wrongAnswer1, isCorrect: false },
            { answer: q.wrongAnswer2, isCorrect: false },
            { answer: q.wrongAnswer3, isCorrect: false }
        ];
        answers = trueShuffle(answers);
        answers[0].letter = 'A';
        answers[1].letter = 'B';
        answers[2].letter = 'C';
        answers[3].letter = 'D';

        const question = {
            question: q.question,
            answers: answers
        };

        questions.push(question);
    });
    
    let haveUniqueCode = false;
    let roomCode = undefined;

    while (!haveUniqueCode) {
        roomCode = getRandomRoomCode();
        let room = await db.getInstance(roomCode);
        haveUniqueCode = (room == undefined);
    }

    const instance = {
        roomCode: roomCode,
        name: quiz.name,
        questions: questions,
        players: [],
        winner: undefined,
        status: 'awaiting-players',
        questionNumber: undefined
    };

    await db.saveInstance(instance);

    return roomCode;
}

async function getStateAsync(roomCode, playerName = undefined) {
    const instance = await db.getInstance(roomCode);
    if (instance == undefined) {
        throw new NotFoundError('Room not found');
    }

    const player = playerName ? instance.players.find(p => p.name.toLowerCase() == playerName.toLowerCase().trim()) : undefined;
    if (playerName && player == undefined) {
        throw new NotFoundError('Player not found');
    }

    const state = {};
    state.roomCode = instance.roomCode;
    state.status = instance.status;

    if (player) {
        state.playerName = player.name;
    }

    if (!player) {
        state.playerCount = instance.players.length;
    }

    switch (instance.status) {
        case 'awaiting-players': {
            state.players = instance.players.map(p => p.name);
            state.count = instance.players.length;
            break;
        }
        case 'showing-question': {
            const question = instance.questions[instance.questionNumber - 1];
            state.questionNumber = instance.questionNumber;
            state.totalQuestions = instance.questions.length;
            state.question = question.question;
            state.answers = [];
            question.answers.forEach(a => {
                const answer = { letter: a.letter, answer: a.answer };
                if (player && (player.answer == a.letter)) {
                    answer.isSelected = true;
                }
                state.answers.push(answer);
            });
            if (!player) {
                state.answerCount = instance.players.filter(p => p.answer).length;
            }
            break;
        }
        case 'showing-answer': {
            const question = instance.questions[instance.questionNumber - 1];
            state.questionNumber = instance.questionNumber;
            state.totalQuestions = instance.questions.length;
            state.question = question.question;
            state.answers = [];
            let correctLetter;
            question.answers.forEach(a => {
                const answer = {
                    letter: a.letter,
                    answer: a.answer,
                    isCorrect: (a.isCorrect == true), // Deal with undefined!
                    count: a.count || 0
                };
                if (answer.isCorrect) {
                    correctLetter = answer.letter;
                }
                if (player && (player.answer == a.letter)) {
                    answer.isSelected = true;
                }    
                state.answers.push(answer);
            });
            if (!player) {
                state.answerCount = instance.players.filter(p => p.answer).length;
            }
            if (player) {
                state.isCorrect = (player.answer == correctLetter);
            }
            break;
        }
        case 'showing-scores': {
            state.questionNumber = instance.questionNumber;
            state.totalQuestions = instance.questions.length;
            state.players = instance.players;
            if (instance.questionNumber == instance.questions.length) {
                state.isGameOver = true;
                const winners = instance.players.filter(p => p.rank == 1).map(p => p.name);
                state.winner = winners.join(' and ');
            }
            break;
        }
        default: {
            throw new Error('Unrecognised room status');
        }
    }

    return state;
}

async function joinQuizAsync(roomCode, playerName) {
    const instance = await db.getInstance(roomCode);

    if (instance == undefined || instance.status != 'awaiting-players') {
        throw new NotFoundError('Room not found');
    }

    if (instance.status != 'awaiting-players') {
        throw new InvalidOperationError('Room is not accepting new players');
    }

    if (instance.players.some(p => p.name.toLowerCase() == playerName.trim().toLowerCase())) {
        throw new ValidationError('Name already taken');
    }

    const player = {
        name: playerName.trim(),
        score: 0
    };

    instance.players.push(player);

    await db.saveInstance(instance);
}

async function submitAnswerAsync(roomCode, playerName, answer) {
    const instance = await db.getInstance(roomCode);

    if (instance == undefined) {
        throw new NotFoundError('Room not found');
    }

    if (instance.status != 'showing-question') {
        throw new InvalidOperationError('Quiz is not waiting for answer');
    }

    const player = instance.players.find(p => p.name.toLowerCase() == playerName.toLowerCase().trim());
    if (player == undefined) {
        throw new NotFoundError('Player not found');
    }

    player.answer = answer;

    await db.saveInstance(instance);
}

function start(instance) {
    if (instance.players.length == 0) {
        throw new InvalidOperationError('Not enough players yet');
    }
    instance.questionNumber = 1;
    instance.players.forEach(p => {
        p.answer = undefined;
        p.rank = undefined;
        p.score = 0;
    });
    instance.status = 'showing-question';
}

function awardPoints(players, correctAnswer) {
    players.forEach(p => {
        if (p.answer == correctAnswer) {
            p.score += 10;
        }
    });
}

function rankPlayers(players) {
    players.sort((p1, p2) => p2.score - p1.score);
    let rank = 1;
    players.forEach((p, i) => {
        if (i > 0 && p.score != players[i-1].score) {
            rank = i + 1;
        }
        p.rank = rank;                
    });
}

function countResponses(players, question) {
    question.answers.forEach(a => {
        a.count = players.filter(p => p.answer == a.letter).length;
    });
}

function showAnswers(instance) {
    const question = instance.questions[instance.questionNumber - 1];
    const correctAnswer = question.answers.find(a => a.isCorrect).letter;
    countResponses(instance.players, question);
    awardPoints(instance.players, correctAnswer);
    rankPlayers(instance.players);
    instance.status = 'showing-answer';
}

function showScores(instance) {
    instance.isGameOver = instance.questionNumber == instance.questions.length;
    instance.status = 'showing-scores';
}

function nextQuestion(instance) {
    if (instance.questionNumber >= instance.questions.length) {
        throw new InvalidOperationError('No more questions');
    }

    instance.questionNumber++;
    instance.players.forEach(p => p.answer = undefined);
    instance.status = 'showing-question';
}

async function nextStageAsync(roomCode) {
    const instance = await db.getInstance(roomCode);    

    if (instance == undefined) {
        throw new NotFoundError('Room not found');
    }

    let finished = false;
    switch (instance.status) {
        case 'awaiting-players':
            start(instance);
            await db.saveInstance(instance);
            break;
        case 'showing-question':
            showAnswers(instance);
            await db.saveInstance(instance);
            break;
        case 'showing-answer':
            showScores(instance);
            await db.saveInstance(instance);
            break;
        case 'showing-scores':
            if (instance.questionNumber < instance.questions.length) {
                nextQuestion(instance);
                await db.saveInstance(instance);
            } else {
                await db.deleteInstance(roomCode);
                finished = true;
            }
            break;
    }

    return finished;
}

async function deleteRoomAsync(roomCode) {
    await db.deleteInstance(roomCode);
}

async function init() {
    await db.saveQuiz(require('../sample-quizzes/demo-quiz-1'));
    await db.saveQuiz(require('../sample-quizzes/demo-quiz-2'));    
}

init();

module.exports = {
    saveQuizAsync,
    getAllQuizzesAsync,
    getQuizAsync,
    deleteQuizAsync,
    hostQuizAsync,
    joinQuizAsync,
    nextStageAsync,
    submitAnswerAsync,
    getStateAsync,
    deleteRoomAsync
};