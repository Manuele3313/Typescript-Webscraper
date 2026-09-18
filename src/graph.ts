import { readFile } from "node:fs/promises";

const INPUT_FILE = "./data.json";

export interface Sample {
  timestamp: string;
  value: number;
}

const WIDTH = 100;
const HEIGHT = 20;

async function main() {
  const contents = await readFile(INPUT_FILE, "utf8");
  const samples: Sample[] = JSON.parse(contents);

  if (!Array.isArray(samples) || samples.length === 0) {
    console.log("No data collected yet.");
    return;
  }

  const allSamples = samples;
  const values = allSamples.map((sample) => sample.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max === min ? 1 : max - min;
  const points = resample(allSamples, WIDTH);

  console.log(
    `\n${formatDate(allSamples[0].timestamp)} → ${formatDate(allSamples.at(-1)!.timestamp)}`,
  );
  console.log(`min: ${min}   max: ${max}\n`);

  for (let row = 0; row < HEIGHT; row++) {
    const threshold = max - (row / (HEIGHT - 1)) * range;
    let line = "";

    for (const sample of points) {
      const normalized = (sample.value - min) / range;
      const sampleRow = HEIGHT - 1 - Math.round(normalized * (HEIGHT - 1));
      line += sampleRow === row ? "●" : " ";
    }

    const label = threshold.toFixed(2).padStart(10);
    console.log(`${label} │${line}`);
  }

  console.log(`${"".padStart(10)} └${"─".repeat(points.length)}`);

  console.log(
    `${"".padStart(11)}${formatTime(points[0].timestamp)}${" ".repeat(
      Math.max(0, points.length - 20),
    )}${formatTime(points.at(-1)!.timestamp)}`,
  );

  console.log(`\nSamples: ${allSamples.length}`);
}

function resample(samples: Sample[], width: number): Sample[] {
  if (samples.length <= width) {
    return samples;
  }

  const result: Sample[] = [];

  for (let i = 0; i < width; i++) {
    const index = Math.round((i / (width - 1)) * (samples.length - 1));
    result.push(samples[index]);
  }

  return result;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

await main();
