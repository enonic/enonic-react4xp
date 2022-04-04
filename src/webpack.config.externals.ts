/* eslint-disable no-console */

/*
  Externals is webpack's way to keep certain dependencies
  out of the compilation/chunking flow,
  and instead tell compiled code that they will be
  globally available in runtime from other ímported libraries, say from a CDN.

  This webpack file wraps the building those external libraries from existing packages.
  They are built into one separate chunk (TODO for later: multiple chunks?),
  along with some features tailored for React4xp:
  it gives the produced chunk a contenthash in the filename, and outputs a JSON file with the
  hashed name, for runtime reference. Content-hashed for caching and cache-busting.

  Which dependencies are inserted into the external library,
  depends on an `env.EXTERNALS` parameter (EXTERNALS can also be supplied through a
  JSON config file referenced with an `env.REACT4XP_CONFIG_FILE` - see for example
  [react4xp-buildconstants](https://www.npmjs.com/package/react4xp-buildconstants), although you can roll your own).
  This `EXTERNALS` parameter must be an object on the webpack
  externals format `{ "libraryname": "ReferenceInCode", ... }`,
  e.g. `{ "react-dom": "ReactDOM" }`. These libraries of course have to be supplied
  from the calling context (as such, they can be thought of
  as peer dependencies, but are obviously impossible to declare).
  `EXTERNALS` can also be a valid JSON-format string.

  In the same way, one more parameter is expected either directly through `env`
  or in the JSON file referenced through `env.REACT4XP_CONFIG_FILE`:
  - `BUILD_R4X`: mandatory string, full path to the
  React4xp build folder (where all react4xp-specific output files will be built)
*/
import type {Environment} from './index.d';


import {statSync} from 'fs';

import {
  isAbsolute,
  join,
  resolve
} from 'path';

import * as Chunks2json from 'chunks-2-json-webpack-plugin';
import * as FileManagerPlugin from 'filemanager-webpack-plugin';

import {
  DIR_PATH_RELATIVE_BUILD_ASSETS_R4X,
  EXTERNALS_DEFAULT,
  FILE_NAME_R4X_CONFIG_JS
} from './constants.buildtime';

import {EXTERNALS_CHUNKS_FILENAME} from './constants.runtime';

import {generateTempES6SourceAndGetFilename} from './externals/generateTempES6SourceAndGetFilename';

import {cleanAnyDoublequotes} from './util/cleanAnyDoublequotes';
import {isSet} from './util/isSet';
import {makeVerboseLogger} from './util/makeVerboseLogger';
//import {toStr} from './util/toStr';


// TODO: Find a good pattern to control output name for chunks,
// allowing for multi-chunks and still doing it in one pass (only one chunks.externals.json)
// TODO: Allowing build path (where BUILD_R4X today must be absolute)
// to instead be relative to project/calling context

module.exports = (env :Environment = {}) => {
  //console.debug('env', toStr(env));

  const DIR_PATH_ABSOLUTE_PROJECT = cleanAnyDoublequotes('DIR_PATH_ABSOLUTE_PROJECT', env.DIR_PATH_ABSOLUTE_PROJECT || process.cwd());
  if (!isAbsolute(DIR_PATH_ABSOLUTE_PROJECT)) {
    throw new Error(`env.DIR_PATH_ABSOLUTE_PROJECT:${DIR_PATH_ABSOLUTE_PROJECT} not an absolute path!`);
  }

  const DIR_PATH_ABSOLUTE_BUILD_SYSTEM = resolve(__dirname, '..');
  //console.debug('DIR_PATH_ABSOLUTE_BUILD_SYSTEM', DIR_PATH_ABSOLUTE_BUILD_SYSTEM);

  const DIR_PATH_ABSOLUTE_BUILD_ASSETS_R4X = join(DIR_PATH_ABSOLUTE_PROJECT, DIR_PATH_RELATIVE_BUILD_ASSETS_R4X);


  const environmentObj = {
    buildEnvString: 'production',
    chunkDirsCommaString: null,
    entryDirsCommaString: null,
    entryExtCommaString: 'jsx,tsx,js,ts,es6,es',
    isVerbose: false
  };
  //console.debug('environmentObj', environmentObj);


  let EXTERNALS = EXTERNALS_DEFAULT;
  //console.debug('EXTERNALS', toStr(EXTERNALS));
  const FILE_PATH_ABSOLUTE_R4X_CONFIG_JS = join(DIR_PATH_ABSOLUTE_PROJECT, FILE_NAME_R4X_CONFIG_JS);
  try {
    const configJsonStats = statSync(FILE_PATH_ABSOLUTE_R4X_CONFIG_JS);
    if (configJsonStats.isFile()) {
      const config = require(FILE_PATH_ABSOLUTE_R4X_CONFIG_JS);
      //console.debug('config', toStr(config));
      if (config.externals) {
        EXTERNALS = Object.assign(config.externals, EXTERNALS);
      }
    } // if FILE_NAME_R4X_CONFIG_JS
    //console.debug('EXTERNALS', toStr(EXTERNALS));
  } catch (e) {
    //console.debug('e', e);
    console.info(`${FILE_PATH_ABSOLUTE_R4X_CONFIG_JS} not found.`)
  }

  if (isSet(env.BUILD_ENV)) {
    environmentObj.buildEnvString = env.BUILD_ENV;
  }
  if (isSet(env.VERBOSE)) {
    environmentObj.isVerbose = env.VERBOSE !== 'false';
  }
  //console.debug('environmentObj', environmentObj);


  const verboseLog = makeVerboseLogger(environmentObj.isVerbose);
  verboseLog(DIR_PATH_ABSOLUTE_BUILD_ASSETS_R4X, 'DIR_PATH_ABSOLUTE_BUILD_ASSETS_R4X', 1);

  const tempFileName = generateTempES6SourceAndGetFilename(
    EXTERNALS,
    join(__dirname, '_AUTOGENERATED_tmp_externals_.es6')
  );
  //console.debug('tempFileName', tempFileName);

  const entry = tempFileName ? { externals: tempFileName } : {};
  //console.debug('entry', entry);

  const plugins = tempFileName
    ? [
        //@ts-ignore
        new FileManagerPlugin({
          events: {
            onStart: {
              mkdir: [
                DIR_PATH_ABSOLUTE_BUILD_ASSETS_R4X // Chunks2json fails without this (when using npm explore)
              ]
            }
          }
        }),
        new Chunks2json({
          outputDir: DIR_PATH_ABSOLUTE_BUILD_ASSETS_R4X,
          filename: EXTERNALS_CHUNKS_FILENAME,
        }),
      ]
    : undefined;

  return {
    context: DIR_PATH_ABSOLUTE_PROJECT, // Used as default for resolve.roots

    devtool: environmentObj.buildEnvString === 'production' ? undefined : 'source-map',

    entry,

    mode: environmentObj.buildEnvString,

    module: {
      rules: [
        {
          test: /\.((jt)sx?|(es6?))$/, // js, ts, jsx, tsx, es, es6
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              compact: environmentObj.buildEnvString === 'production',
              plugins: [
                '@babel/plugin-transform-arrow-functions',
                '@babel/plugin-proposal-object-rest-spread',
              ],
              presets: [
                '@babel/preset-typescript',
                //'@babel/preset-react', // Not certain we need this
                '@babel/preset-env'
              ]
            },
          },
        },
      ],
    }, // module

    output: {
      path: DIR_PATH_ABSOLUTE_BUILD_ASSETS_R4X, // <-- Sets the base url for plugins and other target dirs.
      filename: '[name].[contenthash].js',
      environment: {
        arrowFunction: false,
        bigIntLiteral: false,
        const: false,
        destructuring: false,
        dynamicImport: false,
        forOf: false,
        module: false,
      },
    }, // output

    plugins,

    resolve: {
      extensions: ['.ts', '.tsx', '.es6', '.es', '.jsx', '.js', '.json'],
      modules: [
        // Tell webpack what directories should be searched when resolving
        // modules.
        // Absolute and relative paths can both be used, but be aware that they
        // will behave a bit differently.
        // A relative path will be scanned similarly to how Node scans for
        // node_modules, by looking through the current directory as well as its
        // ancestors (i.e. ./node_modules, ../node_modules, and on).
        // With an absolute path, it will only search in the given directory.

        // To resolve node_modules installed under the app
        resolve(DIR_PATH_ABSOLUTE_PROJECT, 'node_modules'),

        // To resolve node_modules installed under the build system
        resolve(DIR_PATH_ABSOLUTE_BUILD_SYSTEM, 'node_modules'),
        //'node_modules'
      ],
      /*roots: [ // Works, but maybe modules is more specific
        // A list of directories where requests of server-relative URLs
        // (starting with '/') are resolved, defaults to context configuration
        // option. On non-Windows systems these requests are resolved as an
        // absolute path first.
        DIR_PATH_ABSOLUTE_PROJECT, // same as context
        DIR_PATH_ABSOLUTE_BUILD_SYSTEM
      ],*/
    }, // resolve

    stats: {
      colors: true,
      hash: false,
    	modules: false,
    	moduleTrace: false,
    	timings: false,
    	version: false
    }, // stats

  };
};
