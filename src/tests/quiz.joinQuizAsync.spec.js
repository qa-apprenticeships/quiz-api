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

describe('quiz.joinQuizAsync()', function () {
    let saveInstance;
    beforeEach(function() {
        saveInstance = sinon.stub(db, 'saveInstance');
    });

    it('should add player to list when first player', async function () {
        sinon.stub(db, 'getInstance').withArgs('1234').resolves({
            status: 'awaiting-players',
            players: []
        });
        await quiz.joinQuizAsync('1234', 'Fred');
        expect(saveInstance.calledOnce).to.be.true;
        const instance = saveInstance.firstCall.args[0];
        expect(instance.players.map(p => p.name)).to.have.ordered.members(['Fred']);
    });

    it('should add player to end of list when other players already joined', async function () {
        sinon.stub(db, 'getInstance').withArgs('1234').resolves({
            status: 'awaiting-players',
            players: [
                { name: 'Henry' },
                { name: 'Sally' }
            ]
        });
        await quiz.joinQuizAsync('1234', 'Fred');
        expect(saveInstance.calledOnce).to.be.true;
        const instance = saveInstance.firstCall.args[0];
        expect(instance.players.map(p => p.name)).to.have.ordered.members(['Henry', 'Sally', 'Fred']);
    });

    it('should throw error when player with duplicate name tries to join', async function () {
        sinon.stub(db, 'getInstance').withArgs('1234').resolves({
            status: 'awaiting-players',
            players: [
                { name: 'Henry' },
                { name: 'Sally' }
            ]
        });
        await expect(quiz.joinQuizAsync('1234', 'Sally')).to.eventually.be.rejectedWith('Name already taken');
        expect(saveInstance.notCalled).to.be.true;
    });

    it('should detect same name with case difference and/or spaces', async function () {
        sinon.stub(db, 'getInstance').withArgs('1234').resolves({
            status: 'awaiting-players',
            players: [
                { name: 'Henry' },
                { name: 'Sally' }
            ]
        });
        await expect(quiz.joinQuizAsync('1234', '  salLY  ')).to.eventually.be.rejectedWith('Name already taken');
        expect(saveInstance.notCalled).to.be.true;
    });

    it("should trim player's name before saving", async function () {
        sinon.stub(db, 'getInstance').withArgs('1234').resolves({
            status: 'awaiting-players',
            players: []
        });
        await quiz.joinQuizAsync('1234', '  Fred  ');
        expect(saveInstance.calledOnce).to.be.true;
        const instance = saveInstance.firstCall.args[0];
        expect(instance.players.map(p => p.name)).to.have.ordered.members(['Fred']);
    });
});
