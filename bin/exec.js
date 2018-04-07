#!/usr/bin/env node
const App = require('./../lib/app.js');
const reqCwd = require('req-cwd');
const death = require('death');

const log = console.log;

const config = reqCwd.silent('./.solcover.js') || {};
const app = new App(config);

death((signal, err) => app.cleanUp(err));

(async () => {

  try {
    app.injectEthEventHandler();
    await app.generateCoverageEnvironment();
    await app.instrumentTarget();
    await app.launchTestrpc();
    await app.runTestCommand();
    await app.generateReport();
  }
  catch (err) {
    log(err);
  }

})();



