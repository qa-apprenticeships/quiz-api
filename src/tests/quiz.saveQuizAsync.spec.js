const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const ld = require('lodash');

chai.use(chaiAsPromised);
const expect = chai.expect;

const quizService = require('../services/quiz');
const sampleData = require('./sample-data');
const db = require('../services/db');

afterEach(function () {
    sinon.restore();
})

describe('quiz.saveQuizAsync()', function () {
    let quiz;
    this.beforeEach(function() {
        quiz = ld.cloneDeep(sampleData.quiz);
        sinon.stub(db, 'getAllQuizzes').returns([
            { id: 'AAAA', name: 'Demo Quiz 1' },
            { id: 'BBBB', name: 'Demo Quiz 2' },
            { id: 'CCCC', name: 'Demo Quiz 3' }
        ]);
    });

    it('should trim the name of the quiz', async function () {
        quiz.id = undefined;
        quiz.name = '  Demo Quiz 4  ';
        const saveQuiz = sinon.stub(db, 'saveQuiz').resolves('DDDD');
        const id = await quizService.saveQuizAsync(quiz);
        expect(quiz.name).to.be.equal('Demo Quiz 4');
    });

    it('should reject request when quiz has no name (undefined)', async function () {
        quiz.id = undefined;
        quiz.name = undefined;
        const saveQuiz = sinon.stub(db, 'saveQuiz').resolves('DDDD');
        await expect(quizService.saveQuizAsync(quiz)).to.eventually.be.rejectedWith('Blank quiz name');
        expect(saveQuiz.notCalled).to.be.true;
    });

    it('should reject request when quiz has no name (blank)', async function () {
        quiz.id = undefined;
        quiz.name = '    ';
        const saveQuiz = sinon.stub(db, 'saveQuiz').resolves('DDDD');
        await expect(quizService.saveQuizAsync(quiz)).to.eventually.be.rejectedWith('Blank quiz name');
        expect(saveQuiz.notCalled).to.be.true;
    });

    it('should reject request when quiz has a blank question', async function () {
        quiz.id = undefined;
        quiz.name = 'Demo Quiz 4';
        quiz.questions[0].question = '  ';
        const saveQuiz = sinon.stub(db, 'saveQuiz').resolves('DDDD');
        await expect(quizService.saveQuizAsync(quiz)).to.eventually.be.rejectedWith('Blank question');
        expect(saveQuiz.notCalled).to.be.true;
    });

    ['correctAnswer', 'wrongAnswer1', 'wrongAnswer2', 'wrongAnswer3'].forEach(function (e) {
        it(`should reject request when question has a blank ${e}`, async function () {
            quiz.id = undefined;
            quiz.name = 'Demo Quiz 4';
            quiz.questions[0][e] = '  ';
            const saveQuiz = sinon.stub(db, 'saveQuiz').resolves('DDDD');
            await expect(quizService.saveQuizAsync(quiz)).to.eventually.be.rejectedWith('Blank answer');
            expect(saveQuiz.notCalled).to.be.true;
        });    
    });

    describe('when quiz has no id and has a unique name', function() {
        it('should insert quiz into db and return generated id', async function () {
            quiz.id = undefined;
            quiz.name = 'Demo Quiz 4';
            const saveQuiz = sinon.stub(db, 'saveQuiz').resolves('DDDD');
            const id = await quizService.saveQuizAsync(quiz);
            expect(saveQuiz.calledOnceWith(quiz)).to.be.true;
            expect(id).to.be.equal('DDDD');
        });
    });

    describe('when quiz has no id but has a duplicate name', function() {
        it('should reject request', async function () {
            quiz.id = undefined;
            quiz.name = 'Demo Quiz 1';
            const saveQuiz = sinon.stub(db, 'saveQuiz').resolves('DDDD');
            await expect(quizService.saveQuizAsync(quiz)).to.eventually.be.rejectedWith('Duplicate quiz name');
            expect(saveQuiz.notCalled).to.be.true;
        });
    });

    describe('when quiz has duplicate name with different case / spacing', function() {
        it('should reject request', async function () {
            quiz.id = undefined;
            quiz.name = '  demo QUIZ 1  ';
            const saveQuiz = sinon.stub(db, 'saveQuiz').resolves('DDDD');
            await expect(quizService.saveQuizAsync(quiz)).to.eventually.be.rejectedWith('Duplicate quiz name');
            expect(saveQuiz.notCalled).to.be.true;
        });
    });

    describe('when quiz has existing id and has a unique name', function() {
        it('should update quiz into db and return existing id', async function () {
            quiz.id = 'AAAA';
            quiz.name = 'Demo Quiz 1';
            const saveQuiz = sinon.stub(db, 'saveQuiz').resolves('AAAA');
            const id = await quizService.saveQuizAsync(quiz);
            expect(saveQuiz.calledOnceWith(quiz)).to.be.true;
            expect(id).to.be.equal('AAAA');
        });
    });

    describe('when quiz is updated with a duplicate name', function() {
        it('should reject request', async function () {
            quiz.id = 'AAAA';
            quiz.name = 'Demo Quiz 2';
            const saveQuiz = sinon.stub(db, 'saveQuiz').resolves('AAAA');
            await expect(quizService.saveQuizAsync(quiz)).to.eventually.be.rejectedWith('Duplicate quiz name');
            expect(saveQuiz.notCalled).to.be.true;
        });
    });
});