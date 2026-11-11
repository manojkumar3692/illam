import test from 'node:test';
import assert from 'node:assert/strict';
import { amazonSearch, affiliateTag, filterShop, shopCategories, shopPicks } from '../lib/shop';
test('every catalogue item opens an Amazon India search with the owner affiliate tag', () => {
 for (const pick of shopPicks) {
  const url = new URL(amazonSearch(pick.query));
  assert.equal(url.origin, 'https://www.amazon.in');
  assert.equal(url.pathname, '/s');
  assert.equal(url.searchParams.get('tag'), affiliateTag);
  assert.equal(url.searchParams.get('k'), pick.query);
 }
});
test('categories have items and search combines with the selected category', () => {
 for (const category of shopCategories) assert.ok(filterShop(category, '').length);
 assert.equal(filterShop('Paint', '  tractor  ')[0]?.name, 'Asian Paints Tractor Emulsion');
 assert.equal(filterShop('CCTV', 'tractor').length, 0);
 assert.equal(filterShop('All', '').length, shopPicks.length);
});
