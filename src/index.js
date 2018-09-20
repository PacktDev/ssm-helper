import Debug from 'debug';
import AWS from 'aws-sdk';
import Joi from 'joi';

export default class SSMHelper {
  constructor(params) {
    const config = params || {};
    this.logger = {
      error: Debug('ssm-helper:error'),
      info: Debug('ssm-helper:info'),
    };
    const joiValidation = Joi.validate(config, {
      OFFLINE: Joi.boolean(),
      stage: Joi.string(),
      region: Joi.string(),
    });
    if (joiValidation.error) {
      this.logger.error('Invalid Config Object');
      this.logger.error(joiValidation.value);
      throw new Error('Please provide a valid object');
    }

    this.logger.info('Config Object:');
    this.logger.info(config);
    this.OFFLINE = config.OFFLINE || false;
    this.stage = config.stage || 'dev';
    this.region = config.region || 'eu-west-1';
    this.ssm = new AWS.SSM({
      apiVersion: '2014-11-06',
      region: this.region,
    });
  }

  get(keyName) {
    if (!this.OFFLINE) {
      const stageKey = `${this.stage}_${keyName}`.toUpperCase();
      return this.ssm.getParameter({
        Name: stageKey,
        WithDecryption: true,
      }).promise()
        .then((result) => {
          this.logger.info(`Response for ${stageKey}`);
          this.logger.info(result);
          return result.Parameter.Value;
        })
        .catch((error) => {
          this.logger.error(error);
          return Promise.reject(error);
        });
    }

    this.logger.info(`Local ENV: ${keyName} = ${process.env[keyName]}`);
    if (process.env[keyName]) {
      return Promise.resolve(process.env[keyName]);
    }

    return Promise.reject(new Error('Unknown ENV variable'));
  }

  set(keyName, keyValue) {
    if (!this.OFFLINE) {
      const stageKey = `${this.stage}_${keyName}`.toUpperCase();
      return this.ssm.putParameter({
        Name: stageKey, /* required */
        Type: 'SecureString', /* required */
        Value: keyValue, /* required */
        Overwrite: true,
      }).promise()
        .catch((error) => {
          this.logger.error(error);
          return Promise.reject(error);
        });
    }

    process.env[keyName] = keyValue;
    this.logger.info(`Local ENV: ${keyName} = ${process.env[keyName]}`);
    return Promise.resolve(process.env[keyName]);
  }
}
