const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const ld = require('lodash');

chai.use(chaiAsPromised);
const expect = chai.expect;

const quiz = require('../services/quiz');
const sampleData = require('./sample-data');
const db = require('../services/db');

afterEach(function () {
    sinon.restore();
});

describe('quiz.hostQuizAsync()', function () {
    beforeEach(function () {
        sinon.stub(db, 'getQuiz').withArgs('ABCD').resolves(sampleData.quiz);
    });

    describe('room code', function() {
        it('should be 4-digit code by default', async function () {
            const roomCode = await quiz.hostQuizAsync('ABCD');
            expect(roomCode).to.match(/\d{4}/);
        });
    
        it('should be generated using supplied function', async function () {
            const roomCodeFunction = () => '1234';
            const roomCode = await quiz.hostQuizAsync('ABCD', roomCodeFunction);
            expect(roomCode).to.be.equal('1234');
        });
    
        it('should be different to any room codes which already exist in database', async function () {
            const getRandomRoomCode = sinon.stub();
            getRandomRoomCode.onCall(0).returns('1111');
            getRandomRoomCode.onCall(1).returns('2222');
            getRandomRoomCode.onCall(2).returns('3333');
            const getInstance = sinon.stub(db, 'getInstance');
            getInstance.withArgs('1111').resolves({});
            getInstance.withArgs('2222').resolves({});
            getInstance.resolves(undefined);
            const roomCode = await quiz.hostQuizAsync('ABCD', getRandomRoomCode);
            expect(roomCode).to.be.equal('3333');
        });    
    });

    describe('created instance of quiz', function() {
        let saveInstance;
        let instance;

        beforeEach(async function() {
            saveInstance = sinon.stub(db, 'saveInstance');
            await quiz.hostQuizAsync('ABCD');
            expect(saveInstance.calledOnce).to.be.true;
            instance = saveInstance.firstCall.args[0];
        });

        it('should be saved into database', function () {
            expect(saveInstance.calledOnce).to.be.true;
        });

        it('should have same name as quiz', function () {
            expect(instance.name).to.equal('Fake Quiz');
        });

        it('should have same number of questions as quiz', function () {
            expect(instance.questions).to.be.length(2);
        });

        it('should have no players', function () {
            expect(instance.players).to.be.length(0);
        });

        describe('individual question', function() {
            let question;

            beforeEach(function() {
                question = instance.questions[0];
            });

            it('should have same text as quiz question', function() {
                expect(question.question).to.be.equal('Fake Q1');
            });

            it('should have 4 answers', function() {
                expect(question.answers).to.be.length(4);
            });

            it('should have options A, B, C and D in that order', function() {
                expect(question.answers.map(a => a.letter)).to.have.ordered.members(['A', 'B', 'C', 'D']);
            });

            it('should have answers shuffled', function() {
                expect(question.answers.map(a => a.answer)).to.have.members(['100', '200', '300', '400']);
                expect(question.answers.map(a => a.answer)).to.not.have.ordered.members(['100', '200', '300', '400']);
            });

            it('should have correct answer indicated', function() {
                expect(question.answers.filter(a => a.isCorrect)).to.have.length(1);
                expect(question.answers.filter(a => !a.isCorrect)).to.have.length(3);
                expect(question.answers.find(a => a.isCorrect).answer).to.equal('100');
            });
        });
    });
});
