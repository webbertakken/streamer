const css = require('fs').readFileSync('dist/assets/index-CtAqz_Yo.css', 'utf-8');
const results = [];
let i = 0;
while (i < css.length) {
  const idx = css.indexOf('color:', i);
  if (idx === -1) break;
  const before = css.slice(Math.max(0, idx - 25), idx);
  const prefixes = [
    'background-', 'border-', 'accent-', 'ring-', 'shadow-', 'outline-',
    'text-decoration-', 'drop-shadow-', 'inset-ring-', 'inset-shadow-',
    'ring-offset-', 'gradient-from-', 'gradient-via-', 'gradient-to-',
  ];
  const hasPrefix = prefixes.some(p => before.endsWith(p));
  if (!hasPrefix) {
    const start = Math.max(0, idx - 120);
    const end = Math.min(css.length, idx + 80);
    results.push(css.slice(start, end));
  }
  i = idx + 6;
}
console.log(`Found ${results.length} standalone color: declarations\n`);
results.forEach((r, i) => {
  console.log(`--- ${i + 1} ---`);
  console.log(r);
  console.log();
});
