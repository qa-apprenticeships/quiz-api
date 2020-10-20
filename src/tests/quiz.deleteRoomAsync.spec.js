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

describe('quiz.deleteRoomAsync()', function () {
    let dbDeleteInstance;
    this.beforeEach(function() {
        dbDeleteInstance = sinon.stub(db, 'deleteInstance');
    });

    it('should delete instance', async function () {
        await quizService.deleteRoomAsync('AAAA');
        expect(dbDeleteInstance.calledOnceWith('AAAA')).to.be.true;
    });
});