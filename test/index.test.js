/* eslint-env node, mocha */

import sinon from 'sinon';
import chai from 'chai';
import AWSMock from 'aws-sdk-mock';
import UUID from 'uuid/v4';

import SSMHelper from '../src';

const { expect } = chai;
let sandbox;
describe('SSM Helper', () => {
  beforeEach(() => {
    AWSMock.restore();
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
  });
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

  describe('stageKey', () => {
    it('Generates correct stageKey', () => {
      const SSM = new SSMHelper();
      const stageKey = SSM.stageKey('its_a_key');
      expect(stageKey).to.eql('DEV_ITS_A_KEY');
    });
  });

  describe('get', () => {
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
                      ARN: 'arn:aws:ssm:eu-west-1:*:parameter/DEV_TESTY',
                    },
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
          done();
        })
        .catch(done);
    });
    it('successfully gets and caches', (done) => {
      const testValue = UUID();
      AWSMock.mock('SSM', 'getParameter', (params, callback) => {
        callback(null, {
          Parameter:
                    {
                      Name: 'DEV_TESTY',
                      Type: 'SecureString',
                      Value: testValue,
                      Version: 4,
                      LastModifiedDate: new Date().toISOString(),
                      ARN: 'arn:aws:ssm:eu-west-1:*:parameter/DEV_TESTY',
                    },
        });
      });

      const SSM = new SSMHelper({
        cache: true,
      });

      SSM.get('TESTY')
        .then(() => {
          return SSM.get('TESTY');
        })
        .then((result) => {
          expect(result).to.eql(testValue);
          done();
        })
        .catch(done);
    });
    it('successfully gets - offline', (done) => {
      const offlineGet = 'TESTingOffline';
      sandbox.stub(process, 'env')
        .value({
          TESTY: offlineGet,
        });
      const SSM = new SSMHelper({
        OFFLINE: true,
      });
      SSM.get('TESTY')
        .then((result) => {
          expect(result).to.eql(offlineGet);
          done();
        })
        .catch(done);
    });
    it('fails gettng ENV that doesnt exist - offline', (done) => {
      const SSM = new SSMHelper({
        OFFLINE: true,
      });
      SSM.get('TESTY-asdawda')
        .then(() => {
          expect(true).to.eql(false);
        })
        .catch((error) => {
          expect(error).to.be.instanceOf(Error);
          expect(error.message).to.eql('Unknown ENV variable');
          done();
        });
    });
  });

  describe('getAws', () => {
    it('successfully gets', (done) => {
      const testValue = UUID();
      AWSMock.mock('SSM', 'getParameter', (params, callback) => {
        callback(null, {
          Parameter:
                    {
                      Name: 'DEV_TESTY',
                      Type: 'SecureString',
                      Value: testValue,
                      Version: 4,
                      LastModifiedDate: new Date().toISOString(),
                      ARN: 'arn:aws:ssm:eu-west-1:*:parameter/DEV_TESTY',
                    },
        });
      });

      const SSM = new SSMHelper({});
      SSM.getAws('DEVB_TESTY')
        .then((result) => {
          expect(result).to.eql(testValue);
          done();
        })
        .catch(done);
    });
    it('successfully gets and adds to cache', (done) => {
      const testValue = UUID();
      AWSMock.mock('SSM', 'getParameter', (params, callback) => {
        callback(null, {
          Parameter:
                    {
                      Name: 'DEV_TESTY',
                      Type: 'SecureString',
                      Value: testValue,
                      Version: 4,
                      LastModifiedDate: new Date().toISOString(),
                      ARN: 'arn:aws:ssm:eu-west-1:*:parameter/DEV_TESTY',
                    },
        });
      });

      const SSM = new SSMHelper({
        cache: true,
      });
      SSM.getAws('DEV_TESTY')
        .then((result) => {
          expect(result).to.eql(testValue);
          done();
        })
        .catch(done);
    });
    it('successfully gets but fails to cache', (done) => {
      const testStageKey = UUID();
      const testValue = UUID();
      AWSMock.mock('SSM', 'getParameter', (params, callback) => {
        callback(null, {
          Parameter:
                    {
                      Name: 'DEV_TESTY',
                      Type: 'SecureString',
                      Value: testValue,
                      Version: 4,
                      LastModifiedDate: new Date().toISOString(),
                      ARN: `arn:aws:ssm:eu-west-1:*:parameter/${testStageKey}`,
                    },
        });
      });

      const SSM = new SSMHelper({
        cache: true,
      });
      SSM.cache.set = () => {
        throw new Error('Boomstick');
      };

      SSM.getAws(testStageKey)
        .then((result) => {
          expect(result).to.eql(testValue);
          done();
        })
        .catch(done);
    });
  });

  describe('set', () => {
    it('successfully set', (done) => {
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
          done();
        })
        .catch(done);
    });
    it('successfully sets - offline', (done) => {
      const SSM = new SSMHelper({
        OFFLINE: true,
      });
      const testtytesting = 'testitlikeaboss';
      SSM.set('TESTY_OFFLINE', testtytesting)
        .then((result) => {
          expect(result).to.eql(process.env.TESTY_OFFLINE);
          expect(process.env.TESTY_OFFLINE).to.eql(testtytesting);
          delete process.env.TESTY_OFFLINE;
          done();
        })
        .catch(done);
    });
  });
});
