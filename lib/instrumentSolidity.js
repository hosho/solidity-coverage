const SolidityParser = require('solidity-parser');
const preprocessor = require('./preprocessor');
const injector = require('./injector');
const parse = require('./parse');

const path = require('path');

module.exports = function instrumentSolidity(contractSource, fileName) {
  const contract = {};
  contract.source = contractSource;
  contract.instrumented = contractSource;

  contract.runnableLines = [];
  contract.fnMap = {};
  contract.fnId = 0;
  contract.branchMap = {};
  contract.branchId = 0;
  contract.statementMap = {};
  contract.statementId = 0;
  contract.injectionPoints = {};

  // First, we run over the original contract to get the source mapping.

  let t1 = Date.now();
  let ast = SolidityParser.parse(contract.source);
  console.log(`${Date.now() - t1} ms parsing original contract ${fileName}`);

  parse[ast.type](contract, ast);
  const retValue = JSON.parse(JSON.stringify(contract));

  // Now, we reset almost everything and use the preprocessor first to increase our effectiveness.
  contract.runnableLines = [];
  contract.fnMap = {};
  contract.fnId = 0;
  contract.branchMap = {};
  contract.branchId = 0;
  contract.statementMap = {};
  contract.statementId = 0;
  contract.injectionPoints = {};

  t1 = Date.now();
  contract.preprocessed = preprocessor.run(contract.source, fileName);

  contract.instrumented = contract.preprocessed;

  t1 = Date.now();
  ast = SolidityParser.parse(contract.preprocessed);
  console.log(`${Date.now() - t1} ms parsing instrumented contract ${fileName}`);

  const contractStatement = ast.body.filter(node => (node.type === 'ContractStatement' ||
                                                     node.type === 'LibraryStatement'  ||
                                                     node.type === 'InterfaceStatement'));
  contract.contractName = contractStatement[0].name;

  parse[ast.type](contract, ast);

  // We have to iterate through these injection points in descending order to not mess up
  // the injection process.
  const sortedPoints = Object.keys(contract.injectionPoints).sort((a, b) => b - a);
  sortedPoints.forEach(injectionPoint => {
    // Line instrumentation has to happen first
    contract.injectionPoints[injectionPoint].sort((a, b) => {
      const eventTypes = ['openParen', 'callBranchEvent', 'callEmptyBranchEvent', 'callEvent'];
      return eventTypes.indexOf(b.type) - eventTypes.indexOf(a.type);
    });
    contract.injectionPoints[injectionPoint].forEach(injection => {
      injector[injection.type](contract, fileName, injectionPoint, injection);
    });
  });
  retValue.runnableLines = contract.runnableLines;
  retValue.contract = contract.instrumented;
  retValue.contractName = contractStatement[0].name;

  return retValue;
};
