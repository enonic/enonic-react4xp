import {writeFileSync} from 'fs';

import {isObject} from '../util/isObject';
import {isString} from '../util/isString';
//import {toStr} from '../util/toStr';


// First autogenerates an externals temporary sourcefile,
// and then lets webpack have its filename in order to transpile it. Returns null if somethings off.
export function generateTempES6SourceAndGetFilename(
  externals :string|object,
  outputFileName :string
) {
  //console.debug('generateTempES6SourceAndGetFilename() externals', toStr(externals));
  //console.debug('generateTempES6SourceAndGetFilename() outputFileName', toStr(outputFileName));
  if (
    typeof outputFileName !== "string" ||
    (outputFileName || "").trim() === ""
  ) {
    console.warn(`${__filename} - Skipping generation of the externals chunk:
        \tThe outputFileName parameter must be a non-empty string: ${JSON.stringify(
          outputFileName,
          null,
          2
        )}`);
    return null;
  }

  let externalsObj :object;

  if (isString(externals)) {
    externalsObj = JSON.parse(externals);
  } else if(isObject(externals)) {
    externalsObj = JSON.parse(JSON.stringify(externals)); // deref
  }

  //console.debug('generateTempES6SourceAndGetFilename() externalsObj', toStr(externalsObj));
  if (
    !externalsObj ||
    !isObject(externalsObj) ||
    //Array.isArray(externalsObj) ||
    Object.keys(externalsObj).length < 1
  ) {
    console.warn(`${__filename} - Skipping generation of the externals chunk:
        \tThe externals parameter must be an object (or JSON-string object) with at least one entry: ${JSON.stringify(
          externalsObj,
          null,
          2
        )}`);
    return null;
  }

  let externalsImports = "";
  let externalsExports = "";

  Object.keys(externalsObj).forEach((key) => {
    externalsImports += `import ${externalsObj[key]} from '${key}';\n`;
  });

  Object.keys(externalsObj).forEach((key) => {
    externalsExports += `\twindow.${externalsObj[key]} = ${externalsObj[key]};\n`;
  });

  const externalsES6 = `// AUTO-GENERATED by ${__filename}\n\n${externalsImports}\n(function(window) {\n${externalsExports}} )(typeof window !== 'undefined' ? window : global);\n`;

  writeFileSync(outputFileName, externalsES6);

  return outputFileName;
}
