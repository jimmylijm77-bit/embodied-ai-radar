import { readFileSync, writeFileSync } from 'node:fs';
const data = readFileSync('data/papers.json','utf8');
const css = readFileSync('styles.css','utf8');
const appjs = readFileSync('app.js','utf8');
let html = readFileSync('index.src.html','utf8');
html = html.replace('  <link rel="stylesheet" href="styles.css" />\n','');
html = html.replace('  <script src="app.js"></script>\n','');
// use function replacers so $ / $$ in content are NOT treated as replace patterns
html = html.replace('</head>', () => '  <style>\n'+css+'\n  </style>\n</head>');
const inline = '  <script>\nwindow.__RADAR_DATA__ = '+data.trim()+';\n  </script>\n  <script>\n'+appjs+'\n  </script>\n';
html = html.replace('</body>', () => inline+'</body>');
writeFileSync('index.html', html);
console.log('built index.html', html.length, 'bytes; fetch:', html.includes('fetch('), '; has $$:', html.includes('$$'));
