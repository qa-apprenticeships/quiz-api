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

describe('quiz.submitAnswerAsync()', function () {
    let instanceBefore;
    let instanceAfter;
    let saveInstance;

    beforeEach(function() {
        instanceBefore = {
            status: 'showing-question',
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
        instanceAfter = undefined;
        sinon.stub(db, 'getInstance').withArgs('1234').returns(instanceBefore);
        saveInstance = sinon.stub(db, 'saveInstance').callsFake(function(instance) {
            instanceAfter = instance;
        });
    });

    describe('when currently showing question', function() {  
        beforeEach(function() {
            instanceBefore.status = 'showing-question';
            instanceBefore.questionNumber = 1;
        });
        
        it("should record player's answer", async function () {
            await quiz.submitAnswerAsync('1234', 'Player 1', 'B');
            expect(instanceAfter.players.find(p => p.name == 'Player 1').answer).to.be.equal('B');
        });

        it("should match player name", async function () {
            await quiz.submitAnswerAsync('1234', ' PLAYer 1 ', 'C');
            expect(instanceAfter.players.find(p => p.name == 'Player 1').answer).to.be.equal('C');
        });

        it("should remain asking question", async function () {
            await quiz.submitAnswerAsync('1234', 'Player 1', 'B');
            expect(instanceAfter.status).to.be.equal('showing-question');
            expect(instanceAfter.questionNumber).to.be.equal(1);
        });
    });

    describe('when player has already answered this question', function() {  
        beforeEach(function() {
            instanceBefore.status = 'showing-question';
            instanceBefore.questionNumber = 1;
            instanceBefore.players.find(p => p.name == 'Player 1').answer = 'B';
        });
        
        it("should update player's answer", async function () {
            await quiz.submitAnswerAsync('1234', 'Player 1', 'A');
            expect(instanceAfter.players.find(p => p.name == 'Player 1').answer).to.be.equal('A');
        });
    });

    describe('when question is not being asked', function() {  
        beforeEach(function() {
            instanceBefore.status = 'showing-answer';
            instanceBefore.questionNumber = 1;
        });

        it("should reject submission", async function () {
            instanceBefore.status = 'showing-answer';
            instanceBefore.questionNumber = 1;
            await expect(quiz.submitAnswerAsync('1234', 'Player 1', 'A')).to.eventually.be.rejected;
            expect(saveInstance.notCalled).to.be.true;
        });
    });
});
