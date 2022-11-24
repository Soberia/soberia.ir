# 📋 **Create a Blog Article**

Blog articles could be from one of the following categories:

- `post`: The articles that contain a long content
- `memo`: The articles that contain a short content (e.g. `Docker` cheat sheet)

Articles should be provided as `Markdown` format. This file must include the required `YAML` formatted metadata wrapped in the `"---"` and `"..."` block at the top of the file. The metadata could contain the following properties:

```yaml
---
id: !!int # Article's ID, must be unique for each article in an individual category
date: !!timestamp # Date of publish
dateEdited: !!timestamp # Date of modification (optional)
title: !!str # Article's title
description: !!str # Article's description (optional)
banner: !!str # Article's banner image filename (optional)
tags: !!seq # Article's tags (optional)
...
```

The articles should be placed in dedicated category in `/public/blog/{category}` directory.
If the article has media file assets (e.g. banner image, videos, audios, ...), for better organization, the markdown and all the assets files can be placed in a sub directory of its category with an arbitrary name. However, the markdown file must be renamed to `main.md` after that.

```
project
│  README.md
└──public
│  │  index.html
│  └──blog
│     └──category
│        └──what-typescript-has-to-offer
│            │  main.md
│            │  banner.webp
└──src
```

## Fenced code block options

All the options should be placed after the code block syntax name and separated with `,` character.

- `filename`: The name of the file which this code is belongs to.
- `line`: The starting line number.
- `highlight`: The line number(s) to be highlighted in comma separated values or ranges.

````markdown
```python,filename="hello_world.py",line="3",highlight="4,6-7"
print('hello world @ line 3')
# This line will be highlighted

# This line will be highlighted
# This line will be highlighted
```
````

## Playing `GIF` videos in the article

The `data-gif` attribute should be added to the `video` element:

```markdown
<video data-gif>
  <source src="cat.mp4">
</video>
```

# 🖥️ **Run on Local Machine**

The NPM package registry token for one of the dependency packages should be taken from [here](https://github.com/Soberia/matchmoji#-installation) and set as an environment variable:

```bash
export NPM_TOKEN="..."
```

Installation can be done after that:

```bash
git clone https://github.com/Soberia/soberia.ir.git
npm install --prefix soberia.ir
npm start --prefix soberia.ir
```

# 🔨 **Development**

The utility tools are also available as [VSCode](https://github.com/microsoft/vscode) Tasks via opening the workspace file `.vscode/matchmoji.code-workspace`.

### **Compress the images**

This will convert project images to the `WebP` format:

```bash
bin/main.sh --image-converter
```

More information about the parameters:

```bash
bin/main.sh --help
```
