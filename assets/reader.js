// Enhance the existing reader without changing routes, evidence or source nodes.
const chapterSlug = text => String(text).normalize('NFKC').toLowerCase()
 .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'chapter';

function makeContents(document, chapters, location) {
 const nav = document.createElement('nav');
 nav.setAttribute('aria-label', '章节目录');
 if (location === 'rail') {
  nav.className = 'reader-toc rail-panel';
  const heading = document.createElement('h3');
  heading.textContent = '本页目录';
  nav.append(heading);
 }
 const list = document.createElement('ol');
 for (const {id, title} of chapters) {
  const item = document.createElement('li'), button = document.createElement('button');
  button.type = 'button';
  button.textContent = title;
  button.setAttribute('data-reading-section', id);
  button.setAttribute('data-reading-origin', location);
  button.setAttribute('aria-controls', id);
  item.append(button);
  list.append(item);
 }
 nav.append(list);
 return nav;
}

export function enhanceReader(container) {
 const document = container?.ownerDocument || globalThis.document;
 if (!container?.querySelector || !container?.querySelectorAll || !document?.createElement) return;
 const main = container.querySelector('.reading-main');
 if (!main?.querySelectorAll || main.hasAttribute('data-reader-enhanced')) return;

 // Research and application paths precede the detailed appointment audit.
 // Move complete sections so all dates, caveats and duplicate source links survive.
 const profile = main.querySelector('.advisor-profile');
 const references = main.querySelector('.profile-references');
 if (profile && references?.parentElement === main) {
  for (const section of profile.querySelectorAll('.appointment-review,.profile-homepages')) {
   main.insertBefore(section, references);
  }
 }

 const chapters = [], usedIds = new Set();
 for (const section of main.querySelectorAll('.detail-section')) {
  const heading = section.querySelector('h3');
  const title = heading?.textContent?.trim();
  if (!title || heading.closest('.detail-section') !== section) continue;
  const base = section.id || `reader-section-${chapterSlug(title)}`;
  let id = base, suffix = 2;
  while (usedIds.has(id) || (document.getElementById?.(id) && document.getElementById(id) !== section)) id = `${base}-${suffix++}`;
  usedIds.add(id);
  section.id = id;
  section.classList.add('reader-section');
  section.setAttribute('tabindex', '-1');
  chapters.push({id, title});
 }
 if (!chapters.length) return;

 const rail = container.querySelector('.reading-rail');
 if (rail) rail.prepend(makeContents(document, chapters, 'rail'));
 const compact = document.createElement('details');
 compact.className = 'reader-mobile-toc';
 const summary = document.createElement('summary');
 summary.id = 'reader-mobile-toc-toggle';
 summary.textContent = '本页目录';
 compact.append(summary, makeContents(document, chapters, 'compact'));
 let firstSection = main.querySelector('.advisor-profile,.detail-section');
 while (firstSection?.parentElement && firstSection.parentElement !== main) firstSection = firstSection.parentElement;
 main.insertBefore(compact, firstSection || null);
 main.setAttribute('data-reader-enhanced', 'true');
}
