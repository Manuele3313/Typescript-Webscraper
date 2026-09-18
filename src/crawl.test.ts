import { expect, test } from 'vitest'
import { getFirstParagraphFromHTML, getHeadingFromHTML, getURLsFromHTML, normalizeURL, getImagesFromHTML, extractPageData } from './crawl'

test('normalizes a URL', () => {
  expect(normalizeURL('http://example.com')).toBe('example.com')
})

test('normalizes a URL 2', () => {
  expect(normalizeURL('https://www.boot.dev/blog/path/')).toBe('www.boot.dev/blog/path')
})

test('normalizes a URL 4', () => {
  expect(normalizeURL('http://www.boot.dev/blog/path/')).toBe('www.boot.dev/blog/path')
})

test('Already Normalized', () => {
  expect(normalizeURL('www.boot.dev/blog/path')).toBe('www.boot.dev/blog/path')
})

test('Wrong Input', () => {
  expect(normalizeURL('adjklbjksdjf')).toBe('adjklbjksdjf')
})

test("getHeadingFromHTML basic", () => {
  const inputBody = `<html><body><h1>Test Title</h1></body></html>`;
  const actual = getHeadingFromHTML(inputBody);
  const expected = "Test Title";
  expect(actual).toEqual(expected);
});

test("getFirstParagraphFromHTML main priority", () => {
  const inputBody = `
    <html><body>
      <p>Outside paragraph.</p>
      <main>
        <p>Main paragraph.</p>
      </main>
    </body></html>
  `;
  const actual = getFirstParagraphFromHTML(inputBody);
  const expected = "Main paragraph.";
  expect(actual).toEqual(expected);
});


test("getImagesFromHTML relative", () => {
  const inputURL = "https://crawler-test.com";
  const inputBody = `<html><body><img src="/logo.png" alt="Logo"></body></html>`;

  const actual = getImagesFromHTML(inputBody, inputURL);
  const expected = ["https://crawler-test.com/logo.png"];

  expect(actual).toEqual(expected);
});

test("getURLsFromHTML absolute", () => {
  const inputURL = "https://crawler-test.com";
  const inputBody = `<html><body><a href="/path/one"><span>Boot.dev</span></a></body></html>`;

  const actual = getURLsFromHTML(inputBody, inputURL);
  const expected = ["https://crawler-test.com/path/one"];

  expect(actual).toEqual(expected);
});

test("extractPageData basic", () => {
  const inputURL = "https://crawler-test.com";
  const inputBody = `
    <html><body>
      <h1>Test Title</h1>
      <p>This is the first paragraph.</p>
      <a href="/link1">Link 1</a>
      <img src="/image1.jpg" alt="Image 1">
    </body></html>
  `;

  const actual = extractPageData(inputBody, inputURL);
  const expected = {
    url: "https://crawler-test.com",
    heading: "Test Title",
    firstParagraph: "This is the first paragraph.",
    outgoingLinks: ["https://crawler-test.com/link1"],
    imageUrls: ["https://crawler-test.com/image1.jpg"],
  };

  expect(actual).toEqual(expected);
});