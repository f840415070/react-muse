const path = require('path');
const commander = require('commander');
const { spawn } = require('child_process');
const which = require('which');
const preset = require('./preset');
const {
  logger,
  checkAppName,
  createDirectory,
  copyFile,
  copyAllFilesFromDir,
} = require('./lib');

const initCommands = () => {
  commander
    .command('create <name>')
    .description('Create a react project with command')
    .alias('c')
    .option('-t, --ts', 'use TypeScript', false)
    .option('-y, --yarn', 'use yarn to install packages', false)
    .option('-l, --lint', 'use ESLint', true)
    .option('--no-lint', 'donot use ESLint')
    .action((name, { ts, yarn, lint }) => {
      checkAppName(name);
      run({
        name,
        ts,
        yarn,
        lint,
        root: path.resolve(name),
      });
    });
};

const run = (opts) => {
  logger.info('start creating...');
  createDirectory(opts.root);
  createTemplates(opts);
  install(opts);
};

const install = ({
  yarn,
  root,
  ts,
  lint,
  name,
}) => {
  logger.info('installing dependencies...');
  const executor = which.sync(yarn ? 'yarn' : 'npm');
  if (!executor) {
    logger.error(`cannot find ${yarn ? 'yarn' : 'npm'}!`);
    process.exit(9);
  }
  const { dependencies, devDependencies } = preset;
  const cmd = yarn ? 'add' : 'install';
  installDependencies(executor, [cmd, ...dependencies.valueOf()], root)
    .then((code) => {
      if (code !== 0) return;
      return installDependencies(executor, [cmd, '-D', ...devDependencies.valueOf({ ts, lint })], root);
    })
    .then((code) => {
      if (code === 0) {
        logger.success('React project is created successfully!');
        logger.info('now you can run: ');
        console.log(`  1. cd ${name}\n  2. ${yarn ? 'yarn' : 'npm'} start`);
      }
    });
};

const installDependencies = (executor, args, cwd) => {
  return new Promise((resolve) => {
    spawn(executor, args, { stdio: 'inherit', cwd })
      .on('close', (code) => {
        resolve(code);
      });
  });
};

const createTemplates = ({
  ts,
  lint,
  root,
}) => {
  logger.info('generating templates...');
  const tmpl = path.resolve(__dirname, `../src/template/${ts ? 'typescript' : 'javascript'}`);
  copyAllFilesFromDir(tmpl, root, ['.eslintrc.js']);
  if (lint) copyFile(tmpl, root, '.eslintrc.js');
};

const startup = () => {
  initCommands();
  commander.parse(process.argv);
};

module.exports = { startup };
