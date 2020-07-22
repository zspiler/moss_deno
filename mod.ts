import { fromFileUrl } from "http://deno.land/std@v0.52.0/path/mod.ts";
import { exists } from "https://deno.land/std/fs/mod.ts";

interface options {
    l: string;
    m: number;
    d: number;
    x: 0 | 1;
    c: string;
    n: number;
}

interface file {
    path: string,
    size: number,
    displayName: string
}

export class Moss {
    static readonly server = "moss.stanford.edu";
    static readonly port = 7690;
    static readonly languages = [
        "c",
        "cc",
        "java",
        "ml",
        "pascal",
        "ada",
        "lisp",
        "scheme",
        "haskell",
        "fortran",
        "ascii",
        "vhdl",
        "verilog",
        "perl",
        "matlab",
        "python",
        "mips",
        "prolog",
        "spice",
        "vb",
        "csharp",
        "modula2",
        "a8086",
        "javascript",
        "plsql",
    ];
    userID: number;
    options: options;
    baseFiles: file[];
    files: file[];

    constructor(userID: number, language: string) {
        this.userID = userID;
        this.options = {
            l: language, // language
            m: 10, // ignore limit
            d: 0, // directory
            x: 0, // experimental server
            c: "", // comment string
            n: 250, // matching files
        };
        if (!Moss.languages.includes(language)) {
            throw new Error(`Language not supported. Supported languages: ${Moss.languages} `)
        }
        this.baseFiles = [];
        this.files = [];
    }

    async addBaseFile(path: string, displayName?: string): Promise<any> {
        const realpath = fromFileUrl(new URL(path, import.meta.url))

        await exists(realpath).then(result => {

            // Check file exists and is not empty
            if (!result) throw new Error(`File ${path} does not exist.`)

            const size = Deno.statSync(realpath).size || 0
            if (size == 0) throw new Error(`File ${path} is empty.`)

            this.baseFiles.push({
                path,
                size,
                displayName: (displayName || path).replace(/ /g, '_')
            })
        });
    }

    async addFile(path: string, displayName?: string): Promise<any> {
        const realpath = fromFileUrl(new URL(path, import.meta.url))

        await exists(realpath).then(result => {

            // Check file exists and is not empty
            if (!result) throw new Error(`File ${path} does not exist.`)

            const size = Deno.statSync(realpath).size || 0
            if (size == 0) throw new Error(`File ${path} is empty.`)

            this.files.push({
                path,
                size,
                displayName: (displayName || path).replace(/ /g, '_')
            })
        });
    }

    async submit() {
        const conn = await Deno.connect({ hostname: Moss.server, port: Moss.port })
        console.log('Connected to Moss server');

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        await conn.write(encoder.encode(`moss ${this.userID}\n`));
        await conn.write(encoder.encode(`directory ${this.options.d}\n`));
        await conn.write(encoder.encode(`X ${this.options.x}\n`));
        await conn.write(encoder.encode(`maxmatches ${this.options.m}\n`));
        await conn.write(encoder.encode(`show ${this.options.n}\n`));
        await conn.write(encoder.encode(`language ${this.options.l}\n`));

        // Check response
        let buf = new Uint8Array(1024);
        await conn.read(buf)
        if (decoder.decode(buf).match(/no/gi)) throw new Error('Unrecognized language.')

        // Upload base-files
        this.baseFiles.forEach(({ path, displayName, size }) => {
            console.log(`Uploading file ${displayName}..`);
            conn.write(encoder.encode(`file 0 ${this.options.l} ${size} ${displayName}\n`));
            conn.write(Deno.readFileSync(path))
        });

        // Upload files
        let id = 1
        this.files.forEach(({ path, displayName, size }) => {
            console.log(`Uploading file ${displayName}..`);
            conn.write(encoder.encode(`file ${id++} ${this.options.l} ${size} ${displayName}\n`))
            conn.write(Deno.readFileSync(path))
        });

        await conn.write(encoder.encode(`query 0 ${this.options.c}\n`));
        console.log('Query submitted.  Waiting for response...');

        // Read results
        buf = new Uint8Array(1024);
        await conn.read(buf);

        return decoder.decode(buf) ? decoder.decode(buf) : 'Connection closed by Moss before sending response.'
    }

}
