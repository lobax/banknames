import * as fs from 'fs';
import * as https from 'https';
import { execSync } from 'child_process';
import * as readline from 'readline';

const BIC_PDF="https://www.iso9362.org/bicservice/public/v1/bicdata/_pdf";
const TMP_DIR='tmp/';
const BIC_PDF_FILE= TMP_DIR + "isobic.pdf";
const BIC_CSV_FILE= TMP_DIR +  "isobic.csv";
const TARGET_DIR = "banks/";

async function dowload(url, file_location) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(file_location)) {
            resolve();
            return;
        }
        const file = fs.createWriteStream(file_location);
        const request = https.get(url, response => {
            if (response.statusCode !== 200) {
                reject(new Error('Failed to get BIC data'));
                return;
            }
            response.pipe(file);

        })
        request.on('error', err => {
            fs.unlink(file_location, () => reject(err))
        });
        file.on('error', err => {
            fs.unlink(file_location, () => reject(err))
        });
        file.on('finish', () => resolve())
        request.end()
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

async function write_to_file(worldBanks) {
    if (!fs.existsSync(TARGET_DIR)) {
        fs.mkdirSync(TARGET_DIR);
    }
    for (const [country, banks] of worldBanks) {
        const file = TARGET_DIR + country + ".json";
        fs.writeFileSync(file, JSON.stringify(banks, null, "  "));
    }
}


async function setup() {
    if (!fs.existsSync(TMP_DIR)) {
        fs.mkdirSync(TMP_DIR);
    }
    console.log("Downloading ISO BIC Directory...")
    await dowload(BIC_PDF, BIC_PDF_FILE);
    console.log("Converting to CSV...");
    convert(BIC_PDF_FILE, BIC_CSV_FILE);
    console.log("Parsing data from CSV...");
    const banks = await processFile(BIC_CSV_FILE);
    console.log("Creating json...");
    await write_to_file(banks);
}

(async() => {
    await setup()
}
)()
