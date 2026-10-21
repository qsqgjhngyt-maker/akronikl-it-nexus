import assert from 'node:assert/strict';
import {blogArticleMarkup,blogBodyMarkup,blogCardMarkup,coverFor} from '../core/blog-presentation.js';
import {BLOG_DRAFTS} from '../core/blog-seeds.js';
const attack='<img src=x onerror="globalThis.PWNED=1"><script>alert(1)</script>';
for(const markup of [blogBodyMarkup('## '+attack+'\n\n'+attack),blogArticleMarkup({slug:'javascript:alert(1)',title:attack,summary:attack,body:attack}),blogCardMarkup({slug:'x" onclick="alert(1)',title:attack,summary:attack})]){assert.ok(!markup.includes('<script>'));assert.ok(!markup.includes('<img src=x'));assert.ok(markup.includes('&lt;img'))}
assert.equal(coverFor('https://evil.invalid/cookie'),null);assert.equal(coverFor('__proto__'),null);
for(const p of BLOG_DRAFTS){assert.match(p.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert.ok(p.title.length<=160&&p.summary.length<=500&&p.body.length<=20000);assert.ok(coverFor(p.slug));const html=blogArticleMarkup(p);assert.ok(html.includes('blog-toc'));assert.ok(html.includes('blog-prose'));assert.ok(!html.includes('/api/'));assert.ok(!html.includes('https://evil'))}
assert.equal(new Set(BLOG_DRAFTS.map(p=>p.slug)).size,3);
console.log('PASS: article HTML injection, attribute/URL injection, unknown-cover denial, bounded publishable RU drafts, unique slugs');
