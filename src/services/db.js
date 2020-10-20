const ld = require('lodash');

const quizzes = {};
const instances = {};

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

async function saveQuiz(quiz) {
    let id = quiz.id;
    if (id == undefined) {
        id = uuidv4();
    }
    quizzes[id] = ld.cloneDeep({ ...quiz, id });
    return id;
}

async function getAllQuizzes() {
    return Object.values(quizzes).map(quiz => {
        return ld.cloneDeep(quiz);
    });
}

async function getQuiz(id) {
    const quiz = quizzes[id];
    return ld.cloneDeep(quiz);
}

async function deleteQuiz(id) {
    delete quizzes[id];
}

async function saveInstance(instance) {
    // Use roomCode as ID
    const roomCode = instance.roomCode;
    instances[roomCode] = ld.cloneDeep(instance);
    return roomCode;
}

async function getInstance(roomCode) {
    const instance = instances[roomCode];
    return ld.cloneDeep(instance);
}

async function deleteInstance(roomCode) {
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