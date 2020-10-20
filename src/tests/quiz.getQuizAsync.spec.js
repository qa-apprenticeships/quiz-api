const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const ld = require('lodash');

chai.use(chaiAsPromised);
const expect = chai.expect;

const quizService = require('../services/quiz');
const sampleData = require('./sample-data');
const db = require('../services/db');
const { sample } = require('lodash');

afterEach(function () {
    sinon.restore();
})

describe('quiz.getQuizAsync()', function () {
    this.beforeEach(function() {
        sinon.stub(db, 'getQuiz').withArgs('AAAA').resolves(sampleData.quiz);
    });

    it('should get quiz from database when exists', async function () {
        const quiz = await quizService.getQuizAsync('AAAA');
        expect(quiz).to.be.equal(sampleData.quiz);
    });

    it('should throw error when quiz does not exist', async function () {
        await expect(quizService.getQuizAsync('BBBB')).to.eventually.be.rejectedWith('Quiz not found');
    });
});