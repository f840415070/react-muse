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
    .description('start to initialize a project')
    .action((name) => {
      const opts = parseOpts({ name });
      inquirer
        .prompt(setQuestions(opts))
        .then((answers) => {
          const results = { ...opts, ...answers };
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

function parseOpts({ name }) {
  const result = { ...CMD.opts(), name };
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

function run({
  template, name, eslint, root, yarn,
}) {
  console.log(chalk.bgBlue('\nCreating project directory...'));
  createFolder(root);

  console.log(chalk.bgBlue('\nCreating templates...'));
  createTemplates({
    template, name, eslint, root,
  });

  console.log(chalk.bgBlue('\nInstalling dependencies...'));
  install({ yarn, name, root });
}

function createTemplates({
  template, name, eslint, root,
}) {
  createPackageJson({
    template, name, eslint, root,
  });
  Array.prototype.forEach.call([
    templatePath('public'),
    templatePath(template),
  ], (src) => readDirToCopyAll(src, root));
  if (eslint) {
    const eslintrcJson = parseJson(templatePath('eslintrc.json'));
    createFile(
      path.join(root, '.eslintrc.json'),
      JSON.stringify(eslintrcJson[template], null, 2),
    );
  }
}

function install({ yarn, name, root }) {
  const executor = which.sync(yarn ? 'yarn' : 'npm');
  if (!executor) {
    console.error(chalk.red(
      `\nCan not find ${chalk.bgGreen(yarn ? 'yarn' : 'npm')} !Please confirm the installation.`,
    ));
    process.exit(1);
  }
  const installer = spawn(executor, ['install'], { stdio: 'inherit', cwd: root });
  installer.on('close', () => done({ yarn, name }));
}

function parseJson(pathname) {
  return JSON.parse(fs.readFileSync(pathname));
}

function createPackageJson({
  template, name, eslint, root,
}) {
  const defaultJson = parseJson(templatePath('package.json'));
  const dependencyJson = parseJson(templatePath('dependency.json'));
  const packageJson = deepAssign(
    defaultJson,
    dependencyJson[template],
    eslint ? dependencyJson[`eslint-${template}`] : {},
  );
  packageJson.name = name;

  createFile(
    path.join(root, 'package.json'),
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
  return path.join(path.resolve(__dirname, '../template'), ...p);
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

function done({ yarn, name }) {
  console.log(chalk.greenBright('\nCreated successfully!You can run:'));
  console.log('  1.', chalk.whiteBright(`cd ${name}`));
  console.log('  2.', chalk.whiteBright(`${yarn ? 'yarn' : 'npm'} start\n`));
}

module.exports = {
  init,
};
