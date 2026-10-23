import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {bindBlogMedia} from '../core/blog-layout.js';

test('Повторно проверенное фото снимает aria-busy без сетевого запроса', async () => {
  const bytes = Buffer.from('NEXUS verified public image fixture');
  const id = createHash('sha256').update(bytes).digest('hex');
  const src = 'data:image/jpeg;base64,' + bytes.toString('base64');
  const attrs = new Map([['aria-busy', 'true']]);
  const image = {
    dataset: {blogMedia: id}, isConnected: true, src: '', alt: 'Фото', parentElement: null,
    classList: {add() {}, remove() {}, contains() { return false; }},
    setAttribute(key, value) { attrs.set(key, value); },
    removeAttribute(key) { attrs.delete(key); },
    closest() { return null; }
  };
  const root = {isConnected: true, querySelectorAll() { return [image]; }};
  let requests = 0;
  await bindBlogMedia(root, {
    localImages: new Map([[id, src]]),
    async fetchImpl() { requests++; throw Error('Повторный запрос запрещён'); }
  });
  assert.equal(requests, 0);
  assert.equal(image.src, src);
  assert.equal(attrs.has('aria-busy'), false);
});
