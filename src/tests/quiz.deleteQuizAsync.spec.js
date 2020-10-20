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

describe('quiz.deleteQuizAsync()', function () {
    let dbDeleteQuiz;
    this.beforeEach(function() {
        dbDeleteQuiz = sinon.stub(db, 'deleteQuiz');
        sinon.stub(db, 'getQuiz').withArgs('AAAA').resolves(sampleData.quiz);
    });

    it('should delete quiz when quiz exists', async function () {
        await quizService.deleteQuizAsync('AAAA');
        expect(dbDeleteQuiz.calledOnceWith('AAAA')).to.be.true;
    });

    it('should throw error when quiz not found', async function () {
        await expect(quizService.deleteQuizAsync('BBBB')).to.eventually.be.rejectedWith('Quiz not found');
        expect(dbDeleteQuiz.notCalled).to.be.true;
    });
});