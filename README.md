# moss_deno



Deno client for Stanford's MOSS plagiarism detection system.

http://theory.stanford.edu/~aiken/moss/



## Usage

``` typescript
import { Moss } from './mod.ts'

const moss_id = 42
const language = 'python'

const moss = new Moss(moss_id, language);

try {
    await moss.addBaseFile('./test_files/basefile.py');
    await moss.addFile('./test_files/test1.py');
    await moss.addFile('./test_files/test2.py');

    const url = await moss.submit()
    console.log(`Results: ${url}`);
} catch (err) {
    console.log(err);
}
```