import fs from "fs"
import { ExtractedPageData } from "./crawl"
import path from "path"

export function writeJSONReport( pageData: Record<string, ExtractedPageData>,filename = "report.json"): void{
    const sorted = Object.values(pageData).sort((a, b) => a.url.localeCompare(b.url))
    const stringified = JSON.stringify(sorted,null,2)
    try{
        fs.writeFileSync(path.resolve(filename), stringified)
        console.log(`Report written to ${filename}`)
    }catch(error){
        console.error("Error writing report to file:", error)
        process.exit(1)
    }
}