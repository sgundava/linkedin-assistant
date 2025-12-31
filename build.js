const esbuild = require('esbuild');

// Bundle content script
esbuild.buildSync({
  entryPoints: ['src/content/content.js'],
  bundle: true,
  outfile: 'dist/content.js',
  format: 'iife',
  target: 'chrome90',
});

// Bundle popup script
esbuild.buildSync({
  entryPoints: ['src/popup/popup.js'],
  bundle: true,
  outfile: 'dist/popup.js',
  format: 'iife',
  target: 'chrome90',
});

console.log('Build complete!');
