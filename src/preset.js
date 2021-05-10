module.exports = {
  dependencies: {
    base: {
      list: [
        'react',
        'react-dom',
      ],
    },
    valueOf() {
      return this.base.list;
    },
  },
  devDependencies: {
    base: {
      list: [
        '@babel/core',
        '@babel/preset-env',
        '@babel/preset-react',
        'babel-loader',
        'html-loader',
        'html-webpack-plugin',
        'webpack',
        'webpack-cli',
        'webpack-dev-server',
      ],
      ts: [
        'typescript',
        '@types/react',
        '@types/react-dom',
        '@babel/preset-typescript',
      ],
    },
    eslint: {
      list: [
        'eslint',
        'eslint-config-airbnb',
        'eslint-plugin-import',
        'eslint-plugin-jsx-a11y',
        'eslint-plugin-react',
        'eslint-plugin-react-hooks',
      ],
      ts: [
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
      ],
    },
    addDeps(depList, whichType, ts) {
      depList.push(...this[whichType].list);
      if (ts) {
        depList.push(...this[whichType].ts);
      }
    },
    valueOf({ ts, lint }) {
      const dep = [];
      this.addDeps(dep, 'base', ts);
      if (lint) this.addDeps(dep, 'eslint', ts);
      return dep;
    },
  },
};
