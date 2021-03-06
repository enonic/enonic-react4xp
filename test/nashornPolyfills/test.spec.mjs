import { expect } from 'chai';
import { existsSync } from 'fs';
import {join} from 'path';


const DIR_NAME = join(process.env.PWD, 'test', 'nashornPolyfills');
//console.log('DIR_NAME:', JSON.stringify(DIR_NAME, null, 2));

const BUILD_RESOURCES_MAIN = join(DIR_NAME, 'build', 'resources', 'main');

describe('nashornPolyfills', ()=>{
  it('make a file', ()=>{
    const exists = existsSync(join(BUILD_RESOURCES_MAIN, 'assets/react4xp/nashornPolyfills.userAdded.js'));
    expect(exists).to.be.true;
  });
});
