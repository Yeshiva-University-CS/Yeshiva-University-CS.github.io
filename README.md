# YU CS Homepage
Welcome to the YU CS Homepage!

# Build
To build the project locally, run:
```
make build
```

# Structure
Broadly, the directory is made up of a few important directories/files:
- `_config.yml` &rarr; This file contains the key configuration for Jekyll
- `favicon.ico` &rarr; This is the favicon for the site. By some `Jekyll` magic, it's picked up and used automatically if it has that path top-level
- `_pages` &rarr; This directory contains pretty much all of the pages for the site. One key note is that by default, all files in this directory would be accessed at `<site>/pages/<page>`, unless there is a `permalink` attribute defined on the page itself.
- `_data` &rarr; This directory creates well-formatted page data, which is accessible on pages using `site.data`. If there's a file members.yml under the directory, then you can access contents of the file through site.data.members
- `_posts` &rarr; This contains blog posts. Still TODO, largely
- `assets` &rarr; This directory contains all of the image and CSS files

# Add Pages
To add a new page, make a post in the `_pages` directory with the heading:
```
---
layout: page
title: My Title
full-width: true # if we want it to be full-width
permalink: /my-link
---
```

If you want an example of specific tags you can use in a page, BeautifulJekyll markdown has an example [here](https://beautifuljekyll.com/2020-02-28-test-markdown/), with the code for it [here](https://raw.githubusercontent.com/daattali/beautiful-jekyll/master/_posts/2020-02-28-test-markdown.md)


TODO:
1. ~Make structure/clear: info in _data, words on page that are controlled there and in the md file~
2. ~Fix index so looks like [AttaliTech](https://attalitech.com) ([source code](https://github.com/daattali/attalitech))~
3. ~Connect YUCS logo to the CS front left, and don't have in circle~
4. ~Get favicon showing~
5. ~Fix Faculty links~
6. ~Make less narrow~
7. ~Make clear README with instructions on how to add a new jekyll page, or a new folder (like summer_2021)~
8.  ~Add blog posts~
9.  ~Publish to Github Pages (post about it after Succos)~
10. ~Add link to old summer~
11. ~Add selectable links to faqs~
13. ~Ensure Github Pages publishing works smoothly~
14. ~TOC on top of FAQ page (I think can do this with kramdown {:toc}, but have to experiment on Github Pages)~
15. Point to new URL
