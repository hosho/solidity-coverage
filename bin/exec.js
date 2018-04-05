#!/usr/bin/env node
const process = require('process');
const App = require('./../lib/app.js');
const reqCwd = require('req-cwd');
const death = require('death');

const log = console.log;

const config = reqCwd.silent('./.solcover.js') || {};
const app = new App(config);

death((signal, err) => app.cleanUp(err));

(async () => {

  let workingDir = process.cwd();

  try {

    await app.generateCoverageEnvironment();
    await app.instrumentTarget();
    await app.launchTestrpc();
    await app.runTestCommand();
    await app.generateReport();
  }  
  //catch (err) {
  //  console.error(err);
  //}
  finally {    
    process.chdir(workingDir);
  }


})();



