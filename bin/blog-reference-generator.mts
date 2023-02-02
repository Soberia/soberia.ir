import {resolve} from 'path';
import {fileURLToPath} from 'url';
import {createReadStream} from 'fs';
import {access, lstat, mkdir, readdir, writeFile} from 'fs/promises';
import {createInterface} from 'readline/promises';

const ROOT_PATH = resolve(fileURLToPath(import.meta.url), '../../');
const BLOG_PATH = resolve(ROOT_PATH, 'public', 'blog');
const POST_PATH = resolve(BLOG_PATH, 'post');
const MEMO_PATH = resolve(BLOG_PATH, 'memo');
const references: {[key: string]: any}[] = [];

/** Converts the given value to number if possible. */
function normalizeType(value: string) {
  return !isNaN(value as any) && !isNaN(parseFloat(value))
    ? Number(value)
    : value;
}

for (const [path, category] of [
  [POST_PATH, 'post'],
  [MEMO_PATH, 'memo']
]) {
  try {
    await access(path);
  } catch {
    continue;
  }

  for (const name of await readdir(path)) {
    let dirname: string | undefined;
    let filename: string | undefined;
    let markdown = resolve(path, name);
    if ((await lstat(markdown)).isDirectory()) {
      dirname = name;
      filename = 'main.md';
      markdown = resolve(markdown, filename);
    } else if (name.endsWith('.md')) {
      filename = name;
    }

    if (filename) {
      try {
        await access(markdown);
      } catch {
        // Can't access the file
        continue;
      }

      // Parsing the markdown's `YAML` formatted metadata.
      // It's just a very basic parser and only supports
      // unquoted strings, numbers, lists and dates.
      // For anything beyond, an external library would be required.
      const stream = createReadStream(markdown, 'utf8');
      const metadata = {};
      let entered = false;
      let lastProperty: string;
      let lastValue: any;
      for await (const line of createInterface({input: stream})) {
        if (!entered) {
          if (line.startsWith('---')) {
            entered = true;
            continue;
          }
          stream.destroy();
          break;
        } else if (line.startsWith('...')) {
          stream.destroy();
          break;
        } else if (!line.trim()) {
          // Empty line
          continue;
        }

        const splitted = line.split(/:\s?/);
        const property = splitted[0].trim();
        if (splitted.length === 1) {
          // It's a multiline value
          const value = property;
          if (value.startsWith('- ')) {
            // It's a list item
            if (!Array.isArray(lastValue)) {
              lastValue = [];
            }
            lastValue.push(normalizeType(value.replace('-', '').trimStart()));
          } else {
            // It's a string
            lastValue = `${lastValue || ''} ${value}`.trimStart();
          }
          metadata[lastProperty!] = lastValue;
          continue;
        }

        const value = splitted.slice(1).join(':').trim();
        lastProperty = property;
        metadata[property] = lastValue = normalizeType(value) || undefined;
      }

      if (Object.keys(metadata).length) {
        references.push({filename, dirname, category, ...metadata});
      }
    }
  }
}

// Sorting the articles by date in descending order
references.sort((x, y) => {
  if (new Date(x.date) < new Date(y.date)) return 1;
  if (new Date(x.date) > new Date(y.date)) return -1;
  return 0;
});

// Storing the result as a `JSON` file
try {
  await access(BLOG_PATH);
} catch {
  await mkdir(BLOG_PATH, {recursive: true});
}
await writeFile(
  resolve(BLOG_PATH, 'reference.json'),
  JSON.stringify(references)
);

console.log(`>> All the blog articles references generated successfully`);
