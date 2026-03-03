import fs from 'node:fs';

const stdin = fs.readFileSync(0, 'utf8');
const red = (text) => `\x1b[31m${text}\x1b[0m`;

let filename = '';
for (const line of stdin.split('\n')) {
  if (line.startsWith('SF:')) filename = line.slice(3).trim();
  if (line.endsWith(',0')) {
    const lineNumber = line.slice(3).split(',')[0];
    console.log(`Change in ${red(filename)} (line ${red(lineNumber)}) is not covered by the tests.`);
    console.log(red('Please add/update tests to cover this change.'));
    process.exit(1);
  }
  if (line.endsWith('empty diff')) {
    console.log('OK no changes in src/ -- no new test needed')
    process.exit(0);
  }
}
console.log('OK patch is covered');
