const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const validateProjectName = require('validate-npm-package-name');

const logger = {
  info(text) {
    console.log(`${chalk.blue('info')} ${text}`);
  },
  error(text) {
    console.log(`${chalk.red('error')} ${text}`);
  },
  success(text) {
    console.log(`${chalk.green('success')} ${text}`);
  },
  warning(text) {
    console.log(`${chalk.yellow('warning')} ${text}`);
  },
};

const isExisted = (name, targetDir) => fs.readdirSync(targetDir).includes(name);

const isDirectory = (pathname) => fs.statSync(pathname).isDirectory();

const parsePathname = (pathname) => [
  path.basename(pathname),
  path.dirname(pathname),
];

const createDirectory = (pathname) => {
  const [basename, dirname] = parsePathname(pathname);
  if (isExisted(basename, dirname)) {
    logger.warning(`${basename} has existed on ${dirname}`);
    return;
  }
  fs.mkdirSync(pathname);
  logger.success(`created directory ${basename} on ${dirname}`);
};

const createFile = (pathname, content) => {
  fs.writeFileSync(pathname, content);
  const [basename, dirname] = parsePathname(pathname);
  logger.success(`created file ${basename} on ${dirname}`);
};

const copyFile = (srcDir, destDir, filename, excludes = []) => {
  const src = path.resolve(srcDir, filename);
  const target = path.resolve(destDir, filename);
  if (isDirectory(src)) {
    createDirectory(target);
    copyAllFilesFromDir(src, target, excludes);
  } else {
    if (excludes.includes(filename)) return;
    createFile(target, fs.readFileSync(src));
  }
};

function copyAllFilesFromDir(srcDir, destDir, excludes = []) {
  fs.readdirSync(srcDir)
    .forEach((name) => {
      copyFile(srcDir, destDir, name, excludes);
    });
}

const checkAppName = (appName) => {
  const printNameError = (...reasons) => {
    logger.error('create project failed because of following reasons:\n');
    reasons.forEach((reason) => {
      console.log(chalk.red(`  * ${reason}`));
    });
    process.exit(9);
  };
  if (isExisted(appName, path.resolve())) {
    printNameError(`${appName} has existed on ${path.resolve()}`);
  }
  const result = validateProjectName(appName);
  if (!result.validForNewPackages) {
    printNameError(...(result.errors || []), ...(result.warnings || []));
  }
};

module.exports = {
  logger,
  checkAppName,
  createDirectory,
  copyFile,
  copyAllFilesFromDir,
};
