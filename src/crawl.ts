import { JSDOM } from 'jsdom'
import pLimit from 'p-limit'

export function normalizeURL(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/\/$/, '') // Remove trailing slash
    .replace(/^https?:\/\//, '') // Remove http:// or https://
}

export function getHeadingFromHTML(html: string): string{
  const dom = new JSDOM(html)
  const headingText = dom.window.document.querySelector('h1')?.textContent
  const h2Text = dom.window.document.querySelector('h2')?.textContent
  return headingText ? headingText : h2Text ? h2Text : ""
}

export function getFirstParagraphFromHTML(html: string): string{
  const dom = new JSDOM(html)
  const paragraph = dom.window.document.querySelector('p')?.textContent
  const mainParagraph = dom.window.document.querySelector('main p')?.textContent
  return mainParagraph ? mainParagraph : paragraph ? paragraph : ""
}

export function getURLsFromHTML(html: string, baseURL: string): string[]{
    const dom = new JSDOM(html)
    const links = dom.window.document.querySelectorAll('a')
    const urls: string[] = []
    for (const link of links) {
        if (link.href) {
            try{
                const url = new URL(link.href, baseURL)
                urls.push(url.href)
            }catch(error){
                // Invalid URL
                console.log("Invalid URL, skipping: " + link.href)
                continue
            }
        }
    }
    return urls
}

export function getImagesFromHTML(html: string, baseURL: string): string[]{
    const dom = new JSDOM(html)
    const images = dom.window.document.querySelectorAll('img')
    const imageUrls: string[] = []
    for (const image of images) {
        if (image.src) {
            // Handle relative URLs
            const url = new URL(image.src, baseURL)
            imageUrls.push(url.href)
        }
    }
    return imageUrls
}

export type ExtractedPageData = {
    url: string,
    heading: string,
    firstParagraph: string,
    outgoingLinks: string[],
    imageUrls: string[]
}

export function extractPageData(html: string, pageURL: string): ExtractedPageData{
    return {
        url: pageURL,
        heading: getHeadingFromHTML(html),
        firstParagraph: getFirstParagraphFromHTML(html),
        outgoingLinks: getURLsFromHTML(html, pageURL),
        imageUrls: getImagesFromHTML(html, pageURL)
    }
}



export class ConcurrentCrawler {
    limit: <T>(fn: () => Promise<T>) => Promise<T>;
    pages: Record<string, ExtractedPageData>;
    baseURL: string;
    maxPages: number;
    shouldStop: boolean;
    allTasks: Set<Promise<void>>;
    visited: Set<string>;

    constructor(
        baseURL: string, pages: Record<string, ExtractedPageData>, limit: number,
         maxPages: number, shouldStop: boolean, 
         allTasks: Set<Promise<void>>, visited: Set<string>
        ) {
        this.limit = pLimit(limit);
        this.pages = pages;
        this.baseURL = baseURL;
        this.maxPages = maxPages;
        this.shouldStop = shouldStop;
        this.allTasks = allTasks;
        this.visited = visited;
    }

    private async getHTML(url: string){
        return await this.limit(async () =>{
            const response = await fetch(url, {
                headers:{"User-Agent": "BootCrawler/1.0"}
            });

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            } else if (response.status === 404) {
                throw new Error(`Page not found: ${url}`);
            }
            const contentType: string = response.headers.get("content-type") ?? ""
            if (contentType && !contentType.includes("text/html")) {
                throw new Error(`Content type is not text/html: ${contentType}`);
            }
            
            const html = await response.text();
            return html;
        })
    }

    private async crawlPage(currentURL: string): Promise<void> {
        if (this.shouldStop) {
            return
        }

        const baseUrlObj = new URL(this.baseURL)
        const currUrlObj = new URL(currentURL)

        // Only crawl pages on the same host
        if (baseUrlObj.hostname !== currUrlObj.hostname) {
            return
        }

        const normalizedCurrentURL = normalizeURL(currentURL)
        if(this.visited.has(normalizedCurrentURL)){
            return 
        }

        this.visited.add(normalizedCurrentURL)

        if(this.visited.size >= this.maxPages){
            this.shouldStop = true
        }

        let html: string = ""
        try {
            html = await this.getHTML(currentURL)
        } catch (err) {
            console.log(`${(err as Error).message}`)
            return
        }
        console.log("Crawled page: " + currentURL)

        const data: ExtractedPageData = extractPageData(html, currentURL)
        this.pages[normalizedCurrentURL] = data
        const childPromises: Promise<void>[] = []

        for (const url of data.outgoingLinks) {
            if (this.shouldStop) break
            const p = this.crawlPage(url)
            // Track spawned tasks in allTasks and ensure they're removed when finished
            this.allTasks.add(p)
            p.finally(() => this.allTasks.delete(p))
            childPromises.push(p)
        }

        await Promise.all(childPromises)
    }

    async crawl(): Promise<Record<string, ExtractedPageData>> {
        // Start the root crawl task and track it. Use the same promise reference in finally().
        const root = this.crawlPage(this.baseURL)
        this.allTasks.add(root)
        root.finally(() => this.allTasks.delete(root))

        // Wait until all tracked tasks have completed. Promise.race lets us wait for
        // the next task to finish and then re-check the set until it's empty.
        while (this.allTasks.size > 0) {
            // Array.from(...) is safe because we only call race when size > 0
            await Promise.race(Array.from(this.allTasks))
        }

        return this.pages
    }
}

export async function crawlSiteAsync(baseURL: string, limit: number = 5, maxPages:number): Promise<Record<string, ExtractedPageData>> {
    const pages: Record<string, ExtractedPageData> = {};
    const crawler = new ConcurrentCrawler(baseURL, pages, limit, maxPages, false, new Set(), new Set());
    await crawler.crawl();
    return pages;
}