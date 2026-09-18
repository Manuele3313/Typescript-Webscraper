import { argv } from "process";
import { crawlSiteAsync } from "./crawl";
import { writeJSONReport } from "./report";
import fs from "fs"

async function main() {
    if(argv.length <= 2) {
        console.log("No arguments provided.");
        process.exit(1);
    } else if(argv.length >= 6){
        console.log("Too many arguments.")
        process.exit(1)
    } 
    const baseUrl: string = argv[2]
    const maxConcurrency: number = Number(argv[3] ?? 4) 
    const maxPages: number = Number(argv[4] ?? 1000) 

    console.log("Starting to crawl " + baseUrl)

    try {
        const pages = await crawlSiteAsync(baseUrl, maxConcurrency, maxPages);
        console.log("Finished crawling.");
        const firstPage = Object.values(pages)[0];
        if (firstPage) {
        console.log(
            `First page record: ${firstPage["url"]} - ${firstPage["heading"]}`,
        );
}

        writeJSONReport(pages, "report.json");
        // Verify report.jon is created
        if (!fs.existsSync("report.json")) {
            console.error("Error: report.json was not created.");
            process.exit(1);
        }
        // Check if report.json contains valid JSON
        try {
            const reportData = fs.readFileSync("report.json", "utf-8");
            JSON.parse(reportData);
        } catch (error) {
            console.error("Error: report.json contains invalid JSON.");
            process.exit(1);
        }
        process.exit(0)
    }catch (error) {
        console.error("Error occurred while crawling:", error);
        process.exit(1);
    }
}

main();