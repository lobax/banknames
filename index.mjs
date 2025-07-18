import * as fs from 'fs';
import { execSync } from 'child_process';
import * as readline from 'readline';
import { get as httpsGet } from 'https';

const BIC_PDF="https://www.iso9362.org/bicservice/public/v1/bicdata/_pdf";
const TMP_DIR='tmp/';
const BIC_PDF_FILE= TMP_DIR + "isobic.pdf";
const BIC_CSV_FILE= TMP_DIR +  "isobic.csv";
const TARGET_DIR = "banks/";

async function setup() {
    if (!fs.existsSync(TMP_DIR)) {
        fs.mkdirSync(TMP_DIR);
    }
    console.log("Downloading ISO BIC Directory...")
    await download(BIC_PDF, BIC_PDF_FILE);
    console.log("Converting to CSV...");
    convert(BIC_PDF_FILE, BIC_CSV_FILE);
    console.log("Parsing data from CSV...");
    const banks = await processFile(BIC_CSV_FILE);
    console.log("Creating json...");
    await writeToFile(banks);
}

async function download(url, file_location) {
    if (fs.existsSync(file_location)) {
        console.log("File already exists");
        return;
    }
    const writer = fs.createWriteStream(file_location);
    // The request times out unless we have browser-like request headers
    // This includes the compressed encoding headers, despite the response not being compressed
    const headers = {
        'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br, zstd', 
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    };
    return new Promise((resolve, reject) => {
        const req = httpsGet(
            url,
            {
                headers,
                timeout: 60000,
            },
            (res) => {
                if (res.statusCode !== 200) {
                    fs.unlink(file_location, () => {});
                    return reject(new Error(`Failed to get '${url}' (status: ${res.statusCode})`));
                }
                res.pipe(writer);
            }
        );
        req.on('timeout', () => {
            req.destroy();
            fs.unlink(file_location, () => {});
            reject(new Error('Request timed out'));
        });
        req.on('error', (err) => {
            fs.unlink(file_location, () => reject(err));
        });
        writer.on('finish', () => {
            writer.close();
            resolve();
        });
        writer.on('error', (err) => {
            fs.unlink(file_location, () => reject(err));
        });
    });
}

function convert(pdfFile, csvFile) {
    if (!fs.existsSync(csvFile)) {
        execSync(`java -jar deps/tabula.jar ${pdfFile} -o ${csvFile} -p all -l`);
    }
    execSync(`sed -i -e 's/\r/ /g' ${csvFile}`)
}

async function processFile(csvFile) {
    const fileStream = fs.createReadStream(csvFile);
    const rl = readline.createInterface({
        input: fileStream
    });
    const banks = new Map();
    for await (const line of rl) {
        if (!line.includes("Record Creation Date")) {
            const arr = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const bic = arr[2];
            const name = arr[4];
            const bank = bic.substring(0,4);
            const country = bic.substring(4,6);
            if (!banks.has(country)) {
                banks.set(country, {});
            }
            if (!banks.get(country)[bank]) {
                banks.get(country)[bank] = name.replaceAll('\"', '');
            }
        }
    }
    return banks;
}

async function writeToFile(worldBanks) {
    if (!fs.existsSync(TARGET_DIR)) {
        fs.mkdirSync(TARGET_DIR);
    }
    for (const [country, banks] of worldBanks) {
        const file = TARGET_DIR + country + ".json";
        fs.writeFileSync(file, JSON.stringify(banks, null, "  "));
    }
}

(async () => {
    try {
        await setup();
    } catch (err) {
        console.error("Failed to build banknames:", err.message);
    }
})();
