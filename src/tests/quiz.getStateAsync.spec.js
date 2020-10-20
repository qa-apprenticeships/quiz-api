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

describe('quiz.getStateAsync()', function () {
    let instance;

    beforeEach(function() {
        instance = {
            roomCode: '1234',
            status: 'awaiting-players',
            questionNumber: 1,
            players: [
                { name: 'Player 1' },
                { name: 'Player 2' },
                { name: 'Player 3' }
            ],
            questions: [
                {
                    question: 'Fake question 1',
                    answers: [
                        { answer: '100', letter: 'A', isCorrect: true },
                        { answer: '200', letter: 'B' },
                        { answer: '300', letter: 'C' },
                        { answer: '400', letter: 'D' }
                    ]
                },
                {
                    question: 'Fake question 2',
                    answers: [
                        { answer: '500', letter: 'A' },
                        { answer: '600', letter: 'B' },
                        { answer: '700', letter: 'C' },
                        { answer: '800', letter: 'D', isCorrect: true }
                    ]
                }
            ]
        };
        sinon.stub(db, 'getInstance').withArgs('1234').resolves(instance);
    });

    describe('when ask for state without specifying a player (i.e. host)', function() {
        getStateTests(undefined);

        it('should include player count', async function() {
            const state = await quiz.getStateAsync('1234', undefined);
            expect(state.playerCount).to.be.equal(3);
        });
    });

    describe("when ask for state from a specific player's point of view", function() {
        getStateTests(' PLAYer 1 ');

        it('should include player name, as when registered', async function() {
            const state = await quiz.getStateAsync('1234', '  PLAYer 1  ');
            expect(state.playerName).to.be.equal('Player 1');
        });

        it('should indicate if player got question right', async function () {
            instance.status = 'showing-answer';
            instance.players.find(p => p.name == 'Player 1').answer = 'A';
            const state = await quiz.getStateAsync('1234', '  PLAYer 1  ');
            expect(state.isCorrect).to.be.true;
        });

        it('should indicate if player got question right', async function () {
            instance.status = 'showing-answer';
            instance.players.find(p => p.name == 'Player 1').answer = 'B';
            const state = await quiz.getStateAsync('1234', '  PLAYer 1  ');
            expect(state.isCorrect).to.be.false;
        });
    });

    function getStateTests(playerName) {
        describe('for all states', function () {
            it("should include room code", async function () {
                const state = await quiz.getStateAsync('1234', playerName);
                expect(state.roomCode).to.be.equal('1234');
            });
        });

        describe('when awaiting players', function() {  
            beforeEach(function() {
                instance.status = 'awaiting-players';
            });
            
            it("should have status of awaiting players", async function () {
                const state = await quiz.getStateAsync('1234', playerName);
                expect(state.status).to.be.equal('awaiting-players');
            });
    
            it("should list players already joined", async function () {
                const state = await quiz.getStateAsync('1234', playerName);
                expect(state.players).to.have.ordered.members(['Player 1', 'Player 2', 'Player 3']);
            });
    
            it("should count players already joined", async function () {
                const state = await quiz.getStateAsync('1234', playerName);
                expect(state.count).to.be.equal(3);
            });
        });
    
        describe('when showing question', function() {  
            beforeEach(function() {
                instance.status = 'showing-question';
                instance.questionNumber = 1;
            });
            
            it("should have question text", async function () {
                const state = await quiz.getStateAsync('1234', playerName);
                expect(state.question).to.be.equal('Fake question 1');
            });
    
            it("should have possible answers", async function () {
                const state = await quiz.getStateAsync('1234', playerName);
                expect(state.answers).to.have.deep.ordered.members([
                    { letter: 'A', answer: '100' },
                    { letter: 'B', answer: '200' },
                    { letter: 'C', answer: '300' },
                    { letter: 'D', answer: '400' }
                ]);
            });

            if (playerName != undefined) {
                describe('when player has selected an answer', function() {
                    it('should indicate selected answer', async function() {
                        instance.players[0].answer = 'B';
                        const state = await quiz.getStateAsync('1234', playerName);
                        expect(state.answers).to.have.deep.ordered.members([
                            { letter: 'A', answer: '100' },
                            { letter: 'B', answer: '200', isSelected: true },
                            { letter: 'C', answer: '300' },
                            { letter: 'D', answer: '400' }
                        ]);
                    });
                });
            }

            it('should have question number', async function() {
                const state = await quiz.getStateAsync('1234', playerName);
                expect(state.questionNumber).to.be.equal(1);               
            });
    
            it('should have total questions', async function() {
                const state = await quiz.getStateAsync('1234', playerName);
                expect(state.totalQuestions).to.be.equal(2);               
            });
    
            if (playerName == undefined) {
                it('should have number of answers received', async function() {
                    instance.players[0].answer = 'A';
                    instance.players[1].answer = 'B';
                    instance.players[2].answer = 'B';
                    const state = await quiz.getStateAsync('1234', playerName);
                    expect(state.answerCount).to.be.equal(3);
                });    
            }
        });    
    
        describe('when showing answer', function() {  
            beforeEach(function() {
                instance.status = 'showing-answer';
                instance.questionNumber = 1;
            });
            
            it("should have question text", async function () {
                const state = await quiz.getStateAsync('1234', playerName);
                expect(state.question).to.be.equal('Fake question 1');
            });
    
            it("should have possible answers, including whether correct or not, and number of players who chose that answer", async function () {
                instance.players[0].answer = 'A';
                instance.players[1].answer = 'B';
                instance.players[2].answer = 'B';
    
                instance.questions[0].answers.find(a => a.letter == 'A').count = 1;
                instance.questions[0].answers.find(a => a.letter == 'B').count = 2;
    
                const state = await quiz.getStateAsync('1234', playerName);
    
                if (playerName == undefined) {
                    expect(state.answers).to.have.deep.ordered.members([
                        { letter: 'A', answer: '100', isCorrect: true, count: 1 },
                        { letter: 'B', answer: '200', isCorrect: false, count: 2 },
                        { letter: 'C', answer: '300', isCorrect: false, count: 0 },
                        { letter: 'D', answer: '400', isCorrect: false, count: 0 }
                    ]);    
                } else {
                    expect(state.answers).to.have.deep.ordered.members([
                        { letter: 'A', answer: '100', isCorrect: true, count: 1, isSelected: true },
                        { letter: 'B', answer: '200', isCorrect: false, count: 2 },
                        { letter: 'C', answer: '300', isCorrect: false, count: 0 },
                        { letter: 'D', answer: '400', isCorrect: false, count: 0 }
                    ]);    
                }
            });
    
            it('should have question number', async function() {
                const state = await quiz.getStateAsync('1234', playerName);
                expect(state.questionNumber).to.be.equal(1);               
            });
    
            it('should have total questions', async function() {
                const state = await quiz.getStateAsync('1234', playerName);
                expect(state.totalQuestions).to.be.equal(2);               
            });
    
            if (playerName == undefined) {
                it('should have number of answers received', async function() {
                    instance.players[0].answer = 'A';
                    instance.players[1].answer = 'B';
                    instance.players[2].answer = 'B';
                    const state = await quiz.getStateAsync('1234', playerName);
                    expect(state.answerCount).to.be.equal(3);
                });    
            }
        });
    
        describe('when showing scores', function() {  
            beforeEach(function() {
                instance.status = 'showing-scores';
                instance.questionNumber = 1;
                instance.players = [
                    { rank: 1, name: 'Player 3', score: 100 },
                    { rank: 2, name: 'Player 2', score: 85 },
                    { rank: 3, name: 'Player 1', score: 50 }
                ];
            });
            
            it("should have players with rank and score", async function () {
                const state = await quiz.getStateAsync('1234', playerName);
                expect(state.players).to.have.deep.ordered.members([
                    { rank: 1, name: 'Player 3', score: 100 },
                    { rank: 2, name: 'Player 2', score: 85 },
                    { rank: 3, name: 'Player 1', score: 50 }
                ]);
            });
    
            describe('when not last question', function() {
                beforeEach(function () {
                    instance.questionNumber = 1;
                });
    
                it("should not have game over flag set", async function () {
                    const state = await quiz.getStateAsync('1234', playerName);
                    expect(state.isGameOver || false).to.be.false;
                });    
            });
    
            describe('when last question', function() {
                beforeEach(function () {
                    instance.questionNumber = 2;
                });
    
                it("should have game over flag set", async function () {
                    const state = await quiz.getStateAsync('1234', playerName);
                    expect(state.isGameOver).to.be.true;
                });
    
                describe('when single winner', function() {
                    beforeEach(function() {
                        instance.players = [
                            { rank: 1, name: 'Player 3', score: 100 },
                            { rank: 2, name: 'Player 2', score: 85 },
                            { rank: 3, name: 'Player 1', score: 50 }
                        ];
                    });
    
                    it('should name single winner', async function() {
                        const state = await quiz.getStateAsync('1234', playerName);
                        expect(state.winner).to.be.equal('Player 3');
                    });
                });
            });
        });
    }    
});

