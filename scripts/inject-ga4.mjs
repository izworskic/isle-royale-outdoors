#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'public');
const MEASUREMENT_ID = 'G-Y5D2V2W7HN';
const ADSENSE_PUBLISHER_ID = 'ca-pub-8222782620788075';
const GA4_TAG = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${MEASUREMENT_ID}');
</script>`;
const ADSENSE_TAG = `<meta name="google-adsense-account" content="${ADSENSE_PUBLISHER_ID}">`;

let scanned = 0;
let ga4Injected = 0;
let ga4AlreadyTagged = 0;
let adsenseInjected = 0;
let adsenseAlreadyTagged = 0;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.html')) continue;
    scanned += 1;
    let html = await readFile(fullPath, 'utf8');
    const isFerry = path.relative(ROOT, fullPath).split(path.sep).join('/') === 'isle-royale-ferry/index.html';
    if (isFerry) {
      // The canonical HTML is externally rewritten into chrisizworski.com.
      // Independently routed external CSS/JS was missing for mobile readers.
      // Bundle the critical presentation and engine together in the HTML.
      const criticalAssets = [
        ['<link rel="stylesheet" href="/assets/grand-portage-ferry-v2.css">', 'grand-portage-ferry-v2.css', 'style'],
        ['<script src="/assets/grand-portage-ferry.js" defer></script>', 'grand-portage-ferry.js', 'script'],
        ['<script src="/assets/grand-portage-ferry-v2.js" defer></script>', 'grand-portage-ferry-v2.js', 'script'],
      ];
      for (const [tag, asset, kind] of criticalAssets) {
        const marker = 'data-ferry-inline="' + asset + '"';
        if (html.includes(marker)) continue;
        if (!html.includes(tag)) throw new Error('Ferry cannot ship without source tag for ' + asset);
        const code = await readFile(path.join(ROOT, 'assets', asset), 'utf8');
        if (code.includes('</script>') || code.includes('</style>')) throw new Error('Unsafe HTML delimiter in ' + asset);
        const replacement = kind === 'style'
          ? '<style ' + marker + '>\n' + code + '\n</style>'
          : '<script ' + marker + '>\n' + code + '\n</script>';
        html = html.replace(tag, replacement);
      }
      // The screenshot shows an injected, first-screen-sized ad ahead of the tool.
      // Keep this first-party decision tool free of auto-placement for now.
      html = html.replace(/<script\b[^>]*src=["'][^"']*pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^"']*["'][^>]*><\/script>/gi, '');
    }
    const needsGa4 = !html.includes(MEASUREMENT_ID);
    const needsAdsense = !isFerry && !/<script\b[^>]*src=["'][^"']*pagead\/js\/adsbygoogle\.js\b/i.test(html);

    if (!needsGa4) ga4AlreadyTagged += 1;
    if (!needsAdsense) adsenseAlreadyTagged += 1;
    if (!needsGa4 && !needsAdsense) { if (isFerry) await writeFile(fullPath, html); continue; }

    if (!/<\/head>/i.test(html)) {
      throw new Error(`Cannot inject site tags: missing </head> in ${path.relative(ROOT, fullPath)}`);
    }

    const tags = [];
    if (needsGa4) {
      tags.push(GA4_TAG);
      ga4Injected += 1;
    }
    if (needsAdsense) {
      if (!html.includes('name="google-adsense-account"')) tags.push(ADSENSE_TAG);
      tags.push(`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}" crossorigin="anonymous"></script>`);
      adsenseInjected += 1;
    }

    await writeFile(fullPath, html.replace(/<\/head>/i, `${tags.join('\n')}\n</head>`));
  }
}

await walk(ROOT);
console.log(JSON.stringify({
  measurementId: MEASUREMENT_ID,
  adsensePublisherId: ADSENSE_PUBLISHER_ID,
  scanned,
  ga4Injected,
  ga4AlreadyTagged,
  adsenseInjected,
  adsenseAlreadyTagged,
  root: 'public',
}));
