const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk(srcDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace single line en-IN
  content = content.replace(/\.toLocaleDateString\('en-IN',\s*\{\s*day:\s*'2-digit',\s*month:\s*'short',\s*year:\s*'numeric'\s*\}\)/g, ".toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })");

  // Replace multiline en-IN
  const regexMultiline = /\.toLocaleDateString\('en-IN',\s*\{\s*day:\s*'2-digit',\s*month:\s*'short',\s*year:\s*'numeric'\s*\}\)/g;
  // Actually regex with \s* handles newlines too in JS if we just use /.../g or if we explicitly match newlines.
  // Let's use a simpler approach: match `.toLocaleDateString('en-IN',` and capture until `})`
  content = content.replace(/\.toLocaleDateString\('en-IN',\s*\{[^}]+\}\)/g, ".toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })");

  // Replace empty toLocaleDateString() to en-GB
  // Need to be careful not to replace it if it's already 'en-GB'
  content = content.replace(/\.toLocaleDateString\(\)/g, ".toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })");

  // ManageDisciplinary.jsx uses toLocaleString() for Date & Time
  if (file.includes('ManageDisciplinary.jsx')) {
    content = content.replace(/\.toLocaleString\(\)/g, ".toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })");
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
