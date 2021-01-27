const CMD = require('commander');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const validateProjectName = require('validate-npm-package-name');
const { spawn } = require('child_process');
const which = require('which');

function init() {
  setCommands();
  CMD.parse(process.argv);
}

function setCommands() {
  CMD
    .command('init [name]')
    .description('initialize a React App')
    .action((name) => {
      initStart();
      const opts = parseOpts({ name });
      inquirer
        .prompt(setQuestions(opts))
        .then((answers) => {
          const results = Object.assign(opts, answers);
          results.root = path.resolve(results.name); // project root path
          checkAppName(results.name);
          run(results);
        });
    });

  CMD
    .option('--template <template>', 'use JavaScript or TypeScript template, can be js, javascript, ts, typescript')
    .option('--yarn', 'use yarn to install packages, default npm')
    .option('--eslint', 'use ESLint');
}

function parseOpts(cmdOpts) {
  const result = Object.assign(CMD.opts(), cmdOpts);
  if (result.template) {
    const tmpl = result.template.toLowerCase();
    if (tmpl === 'js' || tmpl === 'javascript') {
      result.template = 'javascript';
    } else if (tmpl === 'ts' || tmpl === 'typescript') {
      result.template = 'typescript';
    }
  }
  return result;
}

function run(data) {
  console.log(chalk.bgBlue('\nCreating project directory...'));
  createFolder(data.root);

  console.log(chalk.bgBlue('\nCreating templates...'));
  createTemplates(data);

  console.log(chalk.bgBlue('\nInstalling dependencies...'));
  install(data);
}

function createTemplates(data) {
  createPackageJson(data);
  Array.prototype.forEach.call([
    templatePath('public'),
    templatePath(data.template),
  ], (src) => readDirToCopyAll(src, data.root));
  if (data.eslint) {
    const eslintrcJson = parseJson(templatePath('eslintrc.json'));
    createFile(
      path.join(data.root, '.eslintrc.json'),
      JSON.stringify(eslintrcJson[data.template], null, 2),
    );
  }
}

function install(data) {
  const executor = which.sync(data.yarn ? 'yarn' : 'npm');
  if (!executor) {
    console.error(chalk.red(
      `\nCan not find ${chalk.bgGreen(data.yarn ? 'yarn' : 'npm')} !Please confirm the installation.`,
    ));
    process.exit(1);
  }
  const installer = spawn(executor, ['install'], { stdio: 'inherit', cwd: data.root });
  installer.on('close', () => initEnd(data));
}

function parseJson(pathname) {
  return JSON.parse(fs.readFileSync(pathname));
}

function createPackageJson(data) {
  const defaultJson = parseJson(templatePath('package.json'));
  const dependencyJson = parseJson(templatePath('dependency.json'));
  const packageJson = deepAssign(
    defaultJson,
    dependencyJson[data.template],
    data.eslint ? dependencyJson[`eslint-${data.template}`] : {},
  );
  packageJson.name = data.name;

  createFile(
    path.join(data.root, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );
}

function copyFile(src, dest, basename) {
  const target = path.join(dest, basename);
  if (isDirectory(src)) {
    createFolder(target);
    readDirToCopyAll(src, target);
  } else {
    createFile(target, fs.readFileSync(src));
  }
}

function readDirToCopyAll(src, dest) {
  fs.readdirSync(src)
    .forEach((name) => copyFile(path.resolve(src, name), dest, name));
}

function createFile(pathname, content) {
  fs.writeFileSync(pathname, content);
  console.log(chalk.cyanBright(`Created a new file at ${pathname}`));
}

function createFolder(pathname) {
  if (isExisted(path.basename(pathname), path.dirname(pathname))) return;
  fs.mkdirSync(pathname);
  console.log(chalk.greenBright(`Created a new folder at ${pathname}`));
}

function deepCopy(obj) {
  const result = Array.isArray(obj) ? [] : {};
  Object.entries(obj).forEach(([key, value]) => {
    result[key] = typeof value === 'object' ? deepCopy(value) : value;
  });
  return result;
}

function deepAssign(target, ...sources) {
  const result = deepCopy(target);
  sources.forEach((source) => {
    Object.entries(source).forEach(([key, value]) => {
      if (typeof value !== 'object' || !(key in result)) {
        result[key] = value;
      } else {
        result[key] = deepAssign(result[key], value);
      }
    });
  });
  return result;
}

function isExisted(name, targetDir) {
  return fs.readdirSync(targetDir).includes(name);
}

function isDirectory(pathname) {
  return fs.statSync(pathname).isDirectory();
}

function templatePath(...p) {
  return path.join(path.resolve(__dirname, '../templates'), ...p);
}

function checkAppName(appName) {
  const printNameError = (...reasons) => {
    console.error(
      chalk.red(
        `Cannot create a project named ${chalk.bgGreen(
          `"${appName}"`,
        )} because of following reasons:\n`,
      ),
    );
    reasons.forEach((reason) => console.error(chalk.red(`  * ${reason}`)));
    console.error(chalk.red('\nPlease choose a different project name.'));
    process.exit(1);
  };

  if (isExisted(appName, path.resolve())) {
    printNameError('name has existed in current directory');
  }

  const result = validateProjectName(appName);
  if (!result.validForNewPackages) {
    printNameError(...(result.errors || []), ...(result.warnings || []));
  }
}

function setQuestions(opts) {
  return [
    {
      name: 'name',
      type: 'input',
      message: 'Project name',
      when: () => !opts.name,
    },
    {
      name: 'template',
      type: 'list',
      message: 'Project template',
      choices: ['JavaScript', 'TypeScript'],
      filter: (val) => val.toLowerCase(),
      when: () => !opts.template,
    },
    {
      name: 'eslint',
      type: 'confirm',
      message: 'Use ESLint',
      default: true,
      when: () => !opts.eslint,
    },
  ];
}

function initStart() {
  console.log(chalk.blue(`
  #####################################
  #                                   #
  #        Welcome to ira-cli!        #
  #                                   #
  #             For React             #
  #                                   #
  #####################################
`));
}

function initEnd(data) {
  console.log(chalk.greenBright('\nInitialized successfully!You can run:'));
  console.log('  1.', chalk.whiteBright(`cd ${data.name}`));
  console.log('  2.', chalk.whiteBright(`${data.yarn ? 'yarn' : 'npm'} start`));
}

module.exports = {
  init,
};
