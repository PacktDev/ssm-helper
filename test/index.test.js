/* eslint-env node, mocha */

import sinon from 'sinon'; // eslint-disable-line
import chai from 'chai'; // eslint-disable-line
import AWSMock from 'aws-sdk-mock';

import SSMHelper from '../src';

const expect = chai.expect;
const assert = chai.assert;

describe('SSM Helper', () => {
    beforeEach(() => {
        AWSMock.restore();
    })
    describe('constructor', () => {
        it('successfully instantiate', (done) => {
            try {
                const SSM = new SSMHelper();
                expect(SSM.stage).to.eql('dev');
                expect(SSM.region).to.eql('eu-west-1');
                expect(SSM.OFFLINE).to.eql(false);
                done();
            } catch (error) {
                done(error);
            }
        });
        it('Throws error for invalid config', (done) => {
            try {
                const SSM = new SSMHelper({
                    OFFLINE: 'asdawdas',
                });
                expect().fail();
                done();
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect(error.message).to.eql('Please provide a valid object');
                done();
            }
        });
    });

    describe('Getter', () => {
        it('successfully gets', (done) => {
            const testValue = 'itsatest';
            AWSMock.mock('SSM', 'getParameter', (params, callback) => {
                callback(null, {
                    Parameter:
                    {
                        Name: 'DEV_TESTY',
                        Type: 'SecureString',
                        Value: testValue,
                        Version: 4,
                        LastModifiedDate: new Date().toISOString(),
                        ARN: 'arn:aws:ssm:eu-west-1:*:parameter/DEV_TESTY'
                    }
                });
            });

            const SSM = new SSMHelper();
            SSM.get('TESTY')
                .then((result) => {
                    expect(result).to.eql(testValue);
                    done();
                })
                .catch(done);
        });
        it('parameter doesnt exist', (done) => {
            AWSMock.mock('SSM', 'getParameter', (params, callback) => {
                callback(new Error('ParameterNotFound: null'));
            });

            const SSM = new SSMHelper();
            SSM.get('TESTY')
                .then(() => {
                    expect('true').to.eql('false');
                    done();
                })
                .catch((error) => {
                    expect(error).to.be.instanceOf(Error);
                    expect(error.message).to.eql('ParameterNotFound: null');
                    done()
                })
                .catch(done);
        });
    });

    describe('Setter', () => {
        it('successfully set', (done) => {
            const testValue = 'itsatest';
            AWSMock.mock('SSM', 'putParameter', (params, callback) => {
                callback(null, { Version: 1 });
            });
            const SSM = new SSMHelper();
            SSM.set('TESTY', 'itsnotatest')
                .then((result) => {
                    expect(result).to.eql({ Version: 1 });
                    done();
                })
                .catch(done);
        });
        it('incorrect value set', (done) => {
            AWSMock.mock('SSM', 'putParameter', (params, callback) => {
                callback(new Error());
            });
            const SSM = new SSMHelper();
            SSM.set({}, 'ssm-helper:*')
                .then(() => {
                    expect('true').to.eql('false');
                    done();
                })
                .catch((error) => {
                    expect(error).to.be.instanceOf(Error);
                    done()
                })
                .catch(done);
        });
    });
});