import test from 'node:test';
import assert from 'node:assert/strict';
import {enhanceReader} from '../assets/reader.js';

// A small DOM tree exercises node identity and ordering, not browser layout.
function fixture() {
 const document = {createElement: tag => new Element(tag)};
 class Element {
  constructor(tag) { this.tagName = tag; this.ownerDocument = document; this.children = []; this.attributes = {}; this.textContent = ''; this.className = ''; this.id = ''; this.parentElement = null; this.classList = {add: value => { this.className += ' ' + value; }}; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
  matches(selector) { return selector.split(',').some(part => part.startsWith('.') ? this.className.split(' ').includes(part.slice(1)) : this.tagName === part); }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
  querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  insertBefore(node, reference) {
   if (node.parentElement) node.parentElement.children.splice(node.parentElement.children.indexOf(node), 1);
   const index = reference ? this.children.indexOf(reference) : this.children.length;
   assert(index >= 0, 'reference belongs to the target parent');
   this.children.splice(index, 0, node); node.parentElement = this;
  }
  append(...nodes) { nodes.forEach(node => this.insertBefore(node, null)); }
  prepend(node) { this.insertBefore(node, this.children[0] || null); }
 }
 const node = (tag, classes = '', text = '') => { const value = document.createElement(tag); value.className = classes; value.textContent = text; return value; };
 const root = node('div'), main = node('article', 'reading-main'), rail = node('aside', 'reading-rail');
 root.append(main, rail);
 document.getElementById = id => [root, ...root.querySelectorAll('section')].find(element => element.id === id) || null;
 const section = (title, classes = '') => { const value = node('section', 'detail-section ' + classes); value.append(node('h3', '', title)); return value; };
 return {root, main, rail, node, section};
}

test('research and opportunities precede appointment evidence without recreating source links', () => {
 const {root, main, node, section} = fixture();
 const profile = node('div', 'advisor-profile'), overview = section('个人职业概况');
 const appointment = section('任职时间 · 本校教研首次任职', 'appointment-review');
 const links = section('个人主页、实验室与相关链接', 'profile-homepages');
 const research = section('实验室与研究资源'), works = section('近期代表成果');
 const opportunities = section('申请路径与条件'), references = section('简介参考与待确认信息', 'profile-references');
 const sourceA = node('a', 'source-link'), sourceB = node('a', 'source-link');
 sourceA.setAttribute('href', 'https://example.edu/appointment'); sourceB.setAttribute('href', 'https://example.edu/appointment');
 appointment.append(sourceA, sourceB);
 profile.append(overview, appointment, links, research, works); main.append(profile, opportunities, references);
 enhanceReader(root);
 assert.deepEqual(main.querySelectorAll('.detail-section'), [overview, research, works, opportunities, appointment, links, references]);
 assert.deepEqual(appointment.querySelectorAll('a'), [sourceA, sourceB]);
 assert.equal(sourceA.getAttribute('href'), 'https://example.edu/appointment');
 assert.equal(sourceB.parentElement, appointment);
});

test('TOC targets are unique and focusable; duplicate chapter titles remain independently reachable', () => {
 const {root, main, rail, section} = fixture();
 main.append(section('研究方向'), section('研究方向'), section('申请 / 条件'));
 enhanceReader(root);
 const sections = main.querySelectorAll('.detail-section'), ids = sections.map(section => section.id);
 assert.equal(new Set(ids).size, 3);
 assert(sections.every(section => section.getAttribute('tabindex') === '-1' && section.matches('.reader-section')));
 for (const [region, origin] of [[rail, 'rail'], [main.querySelector('.reader-mobile-toc'), 'compact']]) {
  const buttons = region.querySelectorAll('button');
  assert.deepEqual(buttons.map(button => button.getAttribute('data-reading-section')), ids);
  assert(buttons.every(button => button.type === 'button' && button.getAttribute('data-reading-origin') === origin));
  assert.equal(region.querySelectorAll('a').length, 0, 'chapter buttons cannot navigate the hash');
 }
 const before = rail.querySelectorAll('button'); enhanceReader(root);
 assert.deepEqual(rail.querySelectorAll('button'), before, 'repeated enhancement retains existing controls');
 assert.equal(main.querySelectorAll('.reader-mobile-toc').length, 1);
});

test('chapter IDs stay stable when supplementary sections are inserted earlier', () => {
 const first = fixture(); first.main.append(first.section('申请路径与条件'), first.section('证据来源')); enhanceReader(first.root);
 const ids = first.main.querySelectorAll('.detail-section').map(section => section.id);
 const next = fixture(); next.main.append(next.section('个人职业概况'), next.section('申请路径与条件'), next.section('证据来源')); enhanceReader(next.root);
 assert.deepEqual(next.main.querySelectorAll('.detail-section').slice(1).map(section => section.id), ids);
});

test('missing records and minimal app-test DOMs stay usable without enhancement', () => {
 for (const container of [null, {}, {querySelector() {}}, {querySelector() {}, querySelectorAll() {}, ownerDocument:{}}]) assert.doesNotThrow(() => enhanceReader(container));
 const {root, main, node} = fixture(); main.append(node('h2', 'detail-title', '未找到记录')); enhanceReader(root);
 assert.equal(root.querySelectorAll('button').length, 0);
 assert.equal(main.querySelector('h2').textContent, '未找到记录');
});
