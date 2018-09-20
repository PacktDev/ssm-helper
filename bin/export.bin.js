#!/usr/bin/env node
// Copyright 2018 Packt Publishing Limited
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

const commander = require('commander');
const Fs = require('fs');
const SSMhelper = require('../dist').default;

// Debug
process.env.DEBUG = (process.env.DEBUG) ? `${process.env.DEBUG},ssm-helper:export` : 'ssm-helper:export';

// Commander config
commander
  .version(require('../package.json').version)
  .option('--stage [type]', 'Add environment stage [stage]', 'dev')
  .option('--region [type]', 'AWS region [region]', 'eu-west-1')
  .option('--env-variables [filename|string]', 'The ENV variables to process')
  .parse(process.argv);

// Hard code the STAGE to dev for initial run through or if not set
const STAGE = commander.stage;

// Hard code the REGION to eu-west-1 for initial run through or if not set
const REGION = commander.region;

// The ENV variables
if (!commander.envVariables) {
  console.log('Please provide --env-variables either file containing an array of ENV variable names or a comma (,) separated list of ENV variable names');
  process.exit(1);
}

const availableEnvs = Fs.existsSync(commander.envVariables)
  ? require(commander.envVariables)
  : commander.envVariables.split(',');

const SSM = new SSMhelper({
  stage: STAGE,
  region: REGION,
});

const pushToSSM = availableEnvs.filter((key) => {
  const stageKey = `${STAGE}_${key}`.toUpperCase();
  return (process.env[key] || process.env[stageKey]);
})
  .map((key) => {
    const stageKey = `${STAGE}_${key}`.toUpperCase();
    SSM.logger.info(`Key used in SSM: ${stageKey}`);
    const keyValue = process.env[key] || process.env[stageKey];
    return SSM.set(key, keyValue);
  });
Promise.all(pushToSSM)
  .then((result) => {
    SSM.logger.info('Return from SSM');
    SSM.logger.info('-----');
    SSM.logger.info(result);
    SSM.logger.info('-----');
    console.log('All keys saved to SSM');
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
