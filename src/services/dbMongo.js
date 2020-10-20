const { MongoClient } = require('mongodb');
const connectionString = 'mongodb://localhost:27017/quizdb';

const ld = require('lodash');
const { iteratee } = require('lodash');

const quizzes = {};
const instances = {};

let client = new MongoClient(connectionString);

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

async function saveQuiz(quiz) {
    try {
        quiz.id = quiz.id || uuidv4();
        await client.connect();
        await client.db().collection("quizzes").insertOne(quiz);
        return quiz.id;
    }
    finally {
        await client.close();
    }
}

function getAllQuizzes() {
    return Object.values(quizzes).map(quiz => {
        return ld.cloneDeep(quiz);
    });
}

function getQuiz(id) {
    const quiz = quizzes[id];
    return ld.cloneDeep(quiz);
}

function deleteQuiz(id) {
    delete quizzes[id];
}

function saveInstance(instance) {
    // Use roomCode as ID
    const roomCode = instance.roomCode;
    instances[roomCode] = ld.cloneDeep(instance);
    return roomCode;
}

function getInstance(roomCode) {
    const instance = instances[roomCode];
    return ld.cloneDeep(instance);
}

function deleteInstance(roomCode) {
    delete instances[roomCode];
}

module.exports = {
    saveQuiz,
    getQuiz,
    getAllQuizzes,
    deleteQuiz,
    saveInstance,
    getInstance,
    deleteInstance
};