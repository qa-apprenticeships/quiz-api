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

describe('quiz.nextStageAsync()', function () {
    let saveInstance;
    let instanceBefore;

    beforeEach(function() {
        instanceBefore = {
            status: 'awaiting-players',
            questionNumber: 1,
            players: [
                { name: 'Player 1' },
                { name: 'Player 2' },
                { name: 'Player 3' }
            ],
            questions: [
                {
                    question: 'Q1',
                    answers: [
                        { answer: '100', letter: 'A', isCorrect: true },
                        { answer: '200', letter: 'B' },
                        { answer: '300', letter: 'C' },
                        { answer: '400', letter: 'D' }
                    ]
                },
                {
                    question: 'Q2',
                    answers: [
                        { answer: '500', letter: 'A' },
                        { answer: '600', letter: 'B' },
                        { answer: '700', letter: 'C' },
                        { answer: '800', letter: 'D', isCorrect: true }
                    ]
                }
            ]
        };

        sinon.stub(db, 'getInstance').withArgs('1234').resolves(instanceBefore);
        saveInstance = sinon.stub(db, 'saveInstance');
    });

    describe('when currently awaiting players', function() {
        it('should move to showing first question when enough players', async function () {
            instanceBefore.players = [
                { name: 'Player 1' },
                { name: 'Player 2' }
            ]; // Two players
            await quiz.nextStageAsync('1234');
            expect(saveInstance.calledOnce).to.be.true;
            const instance = saveInstance.firstCall.args[0];
            expect(instance.status).to.be.equal('showing-question');
            expect(instance.questionNumber).to.be.equal(1);
        });

        it('should reset all player scores to zero', async function () {
            await quiz.nextStageAsync('1234');
            expect(saveInstance.calledOnce).to.be.true;
            const instance = saveInstance.firstCall.args[0];
            expect(instance.players.map(p => p.score)).to.have.members([0, 0, 0]);
        });    

        it('should reject request if no players yet', async function () {
            instanceBefore.players = [ ]; // No players yet
            await expect(quiz.nextStageAsync('1234')).to.eventually.be.rejectedWith('Not enough players yet');
            expect(saveInstance.notCalled).to.be.true;
        });
    });

    describe('when showing question', function() {
        beforeEach(function() {
            instanceBefore.status = 'showing-question';
            instanceBefore.questionNumber = 1;
            instanceBefore.players = [
                { name: 'Player 1', score: 10, answer: 'D' },
                { name: 'Player 2', score: 50, answer: 'A' },
                { name: 'Player 3', score: 60, answer: 'A' }
            ];
        });

        it('should move to showing answer', async function () {
            await quiz.nextStageAsync('1234');
            expect(saveInstance.calledOnce).to.be.true;
            const instance = saveInstance.firstCall.args[0];
            expect(instance.status).to.be.equal('showing-answer');
            expect(instance.questionNumber).to.be.equal(1);
        });

        it('should count how many players picked each answer', async function () {
            await quiz.nextStageAsync('1234');
            expect(saveInstance.calledOnce).to.be.true;
            const instance = saveInstance.firstCall.args[0];
            expect(instance.questions[0].answers.find(a => a.letter == 'A').count).to.be.equal(2);
            expect(instance.questions[0].answers.find(a => a.letter == 'B').count).to.be.equal(0);
            expect(instance.questions[0].answers.find(a => a.letter == 'C').count).to.be.equal(0);
            expect(instance.questions[0].answers.find(a => a.letter == 'D').count).to.be.equal(1);
        });

        it('should award points to each player who gets the answer right', async function () {
            await quiz.nextStageAsync('1234');
            expect(saveInstance.calledOnce).to.be.true;
            const instance = saveInstance.firstCall.args[0];
            expect(instance.players.find(p => p.name == 'Player 1').score).to.be.equal(10 + 0);
            expect(instance.players.find(p => p.name == 'Player 2').score).to.be.equal(50 + 10);
            expect(instance.players.find(p => p.name == 'Player 3').score).to.be.equal(60 + 10);
        });

        it('should sort players by score (descending)', async function () {
            await quiz.nextStageAsync('1234');
            expect(saveInstance.calledOnce).to.be.true;
            const instance = saveInstance.firstCall.args[0];
            expect(instance.players.map(p => p.name)).to.have.members(['Player 3', 'Player 2', 'Player 1']);
        });

        it('should rank players by score (descending)', async function () {
            await quiz.nextStageAsync('1234');
            expect(saveInstance.calledOnce).to.be.true;
            const instance = saveInstance.firstCall.args[0];
            expect(instance.players.find(p => p.name == 'Player 1').rank).to.be.equal(3);
            expect(instance.players.find(p => p.name == 'Player 2').rank).to.be.equal(2);
            expect(instance.players.find(p => p.name == 'Player 3').rank).to.be.equal(1);
        });

        it('should handle ranking when multiple players on same score', async function () {
            instanceBefore.players.find(p => p.name == 'Player 2').score = 60;
            await quiz.nextStageAsync('1234');
            expect(saveInstance.calledOnce).to.be.true;
            const instance = saveInstance.firstCall.args[0];
            expect(instance.players.find(p => p.name == 'Player 2').rank).to.be.equal(1);
            expect(instance.players.find(p => p.name == 'Player 3').rank).to.be.equal(1);
            expect(instance.players.find(p => p.name == 'Player 1').rank).to.be.equal(3);
        });
    });

    describe('when showing answer', function() {
        beforeEach(function() {
            instanceBefore.status = 'showing-answer';
            instanceBefore.questionNumber = 1;
            instanceBefore.players = [
                { name: 'Player 1', score: 10, answer: 'D' },
                { name: 'Player 2', score: 50, answer: 'A' },
                { name: 'Player 3', score: 60, answer: 'A' }
            ];
        });

        it('should move to showing scores', async function () {
            await quiz.nextStageAsync('1234');
            expect(saveInstance.calledOnce).to.be.true;
            const instance = saveInstance.firstCall.args[0];
            expect(instance.status).to.be.equal('showing-scores');
            expect(instance.questionNumber).to.be.equal(1);
        });
    });

    describe('when showing scores', function() {
        beforeEach(function() {
            instanceBefore.status = 'showing-scores';
            instanceBefore.questionNumber = 1;
            instanceBefore.players = [
                { name: 'Player 1', score: 10, answer: 'D' },
                { name: 'Player 2', score: 50, answer: 'A' },
                { name: 'Player 3', score: 60, answer: 'A' }
            ];
        });

        it('should move to next question when not at end of quiz', async function () {
            const finished = await quiz.nextStageAsync('1234');
            expect(saveInstance.calledOnce).to.be.true;
            const instance = saveInstance.firstCall.args[0];
            expect(instance.status).to.be.equal('showing-question');
            expect(instance.questionNumber).to.be.equal(2);
            expect(finished).to.be.false;
        });

        it('should delete quiz instance when at end of quiz and return finished flag', async function () {
            instanceBefore.questionNumber = 2; // Last one
            const deleteInstance = sinon.stub(db, 'deleteInstance');
            const finished = await quiz.nextStageAsync('1234');
            expect(deleteInstance.calledOnceWith('1234')).to.be.true;
            expect(finished).to.be.true;
        });
    });
});
