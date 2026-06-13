const fs = require('fs');
const path = require('path');

const dir = '/home/malay/Data/Data/keyking/apps/web/src/app/docs/pro';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // 1. Fix <pre> tags to always include overflow-x-auto
  content = content.replace(/<pre\s+className="([^"]*?)"/g, (match, classes) => {
    if (!classes.includes('overflow-x-auto')) {
      return `<pre className="${classes} overflow-x-auto"`;
    }
    return match;
  });

  // 2. Wrap <table> elements in overflow-x-auto if not already wrapped
  if (content.includes('<table') && !content.includes('<div className="overflow-x-auto w-full"><table')) {
    content = content.replace(/(<table[\s\S]*?<\/table>)/g, (match) => {
      // Just a naive wrap, assuming it's not already wrapped.
      return `<div className="overflow-x-auto w-full">${match}</div>`;
    });
  }

  // 3. Fix large components and flex layouts
  // Look for className containing border-[3px] or similar, and flex items-center
  content = content.replace(/className="([^"]*?)"/g, (match, classes) => {
    let newClasses = classes;
    
    // a) flex containers that need to stack
    if (newClasses.includes('flex') && newClasses.includes('items-center') && newClasses.includes('gap-')) {
      if (!newClasses.includes('flex-col') && !newClasses.includes('flex-wrap') && !newClasses.includes('md:flex-row') && !newClasses.includes('sm:flex-col')) {
        if (newClasses.includes('p-4') || newClasses.includes('p-6') || newClasses.includes('p-8') || newClasses.includes('border-[3px]')) {
           newClasses = newClasses.replace(/\bflex\b/, 'flex flex-col md:flex-row');
        }
      }
    }

    // b) Add overflow-x-auto to very large non-flex blocks (like tables inside divs, or just large border blocks without overflow)
    // Actually, if it's a large container, maybe add overflow-hidden or overflow-x-auto
    // It's safer to add overflow-x-auto to any border-[3px] that isn't flex-col
    if (newClasses.includes('border-[3px]') && !newClasses.includes('overflow-')) {
        // Only if it seems like a big block
        if (newClasses.includes('p-4') || newClasses.includes('p-6')) {
            // let's add overflow-x-auto to prevent inner content from breaking
            // newClasses += ' overflow-x-auto';
            // Wait, overflow-x-auto might hide tooltips or box shadows if not careful.
            // But Neo-Brutalist shadow-[4px_4px...] won't break if padding is large enough?
            // Actually it might clip the shadow if the shadow is outside. Let's just adjust paddings.
        }
    }

    // c) Adjust paddings for mobile: e.g. p-6 -> p-4 md:p-6
    if (newClasses.includes('border-[3px]') || newClasses.includes('border-[4px]')) {
      if (newClasses.includes('p-6') && !newClasses.includes('md:p-6') && !newClasses.includes('sm:p-4')) {
        newClasses = newClasses.replace(/\bp-6\b/g, 'p-4 md:p-6');
      }
      if (newClasses.includes('p-8') && !newClasses.includes('md:p-8')) {
        newClasses = newClasses.replace(/\bp-8\b/g, 'p-4 md:p-8');
      }
    }
    
    // d) adjust text sizing for headings
    if (newClasses.includes('text-4xl') && !newClasses.includes('md:text-4xl') && !newClasses.includes('sm:text-3xl')) {
       newClasses = newClasses.replace(/\btext-4xl\b/g, 'text-3xl md:text-4xl');
    }
    if (newClasses.includes('text-5xl') && !newClasses.includes('md:text-5xl')) {
       newClasses = newClasses.replace(/\btext-5xl\b/g, 'text-4xl md:text-5xl');
    }
    if (newClasses.includes('text-2xl') && !newClasses.includes('md:text-2xl') && newClasses.includes('font-black')) {
       newClasses = newClasses.replace(/\btext-2xl\b/g, 'text-xl md:text-2xl');
    }

    if (newClasses !== classes) {
      return `className="${newClasses}"`;
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(currentPath) {
  const files = fs.readdirSync(currentPath);
  for (const file of files) {
    const fullPath = path.join(currentPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

walkDir(dir);
