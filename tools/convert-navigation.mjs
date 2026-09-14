// Mechanical import migration: API URLs are deliberately untouched.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
const base=resolve('apps/web/src');
function scan(dir){for(const d of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,d.name);if(d.isDirectory())scan(p);else if(p.endsWith('.tsx')&&!p.endsWith('/components/Link.tsx')&&!p.endsWith('\\components\\Link.tsx')){
 let s=readFileSync(p,'utf8');let link=relative(dirname(p),resolve(base,'components/Link')).replaceAll('\\','/');let routing=relative(dirname(p),resolve(base,'routing')).replaceAll('\\','/');if(!link.startsWith('.'))link='./'+link;if(!routing.startsWith('.'))routing='./'+routing;
 s=s.replace(/import Link from ["']next\/link["'];/g,`import Link from '${link}';`).replace(/import \{ useRouter \} from ["']next\/navigation["'];/g,`import {useRouter} from '${routing}';`);writeFileSync(p,s);
}}}scan(base);
