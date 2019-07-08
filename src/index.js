// Copyright 2019 Packt Publishing Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import Debug from 'debug';
import AWS from 'aws-sdk';
import Joi from 'joi';
import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 60,
});

export default class SSMHelper {
  constructor(params) {
    const config = params || {};
    this.logger = {
      error: Debug('ssm-helper:error'),
      info: Debug('ssm-helper:info'),
    };
    const joiValidation = Joi.validate(config, {
      OFFLINE: Joi.boolean(),
      cache: Joi.boolean(),
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
    this.cache = (config.cache) ? cache : false;
    this.stage = config.stage || 'dev';
    this.region = config.region || 'eu-west-1';
    this.ssm = new AWS.SSM({
      apiVersion: '2014-11-06',
      region: this.region,
    });
  }

  stageKey(keyName) {
    return `${this.stage}_${keyName}`.toUpperCase();
  }

  get(keyName) {
    if (!this.OFFLINE) {
      const stageKey = this.stageKey(keyName);
      if (this.cache) {
        const cachedKeyValue = this.cache.get(stageKey);
        /* istanbul ignore else */
        if (cachedKeyValue) {
          this.logger.info(`Cache for ${stageKey} found`);
          return Promise.resolve(cachedKeyValue);
        }

        this.logger.info(`No cache found for ${stageKey}`);
        return this.getAws(stageKey);
      }

      return this.getAws(stageKey);
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

  getAws(stageKey) {
    return this.ssm.getParameter({
      Name: stageKey,
      WithDecryption: true,
    }).promise()
      .then((result) => {
        this.logger.info(`Response for ${stageKey}`);
        this.logger.info(result);
        const { Value } = result.Parameter;
        if (this.cache) {
          try {
            /* istanbul ignore else */
            if (this.cache.set(stageKey, Value)) {
              this.logger.info(`Successfully written ${stageKey} to cache`);
            }
          } catch (error) {
            this.logger.error(error);
          }
        }

        return Promise.resolve(Value);
      })
      .catch((error) => {
        this.logger.error(error);
        return Promise.reject(error);
      });
  }
}
