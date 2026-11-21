import { load, sectionsFor } from './loadout.mjs';

const get = id => document.getElementById(id);
const dialog = get('inspector');
const goBack = get('close');
const stage = get('inspect-content');
const attachmentSlots = [
  ['muzzle','Ствол'], ['handguard','Цевьё'], ['tactical','Тактический модуль'], ['grip','Рукоять'],
  ['optic','Прицел'], ['charm','Украшение'], ['stock','Приклад'], ['magazine','Магазин'],
];
const cosmeticSlots = [['look','Облик'], ['motif','Мотив'], ['paint','Краска']];
let opener;

function node(tag, classes, text) {
  const element = document.createElement(tag);
  if (classes) element.className = classes;
  if (text !== undefined) element.textContent = text;
  return element;
}

function picture(sources, classes) {
  const box = node('span', `picture ${classes || ''}`);
  box.setAttribute('aria-hidden', 'true');
  const fallback = node('span', 'image-fallback', '◇');
  box.append(fallback);
  const urls = [...new Set(sources)].flatMap(source => {
    if (!source) return [];
    try {
      const url = new URL(source, document.baseURI);
      return /^(https?:)$/.test(url.protocol) ? [url.href] : [];
    } catch { return []; }
  });
  if (urls.length) {
    const img = node('img');
    img.alt = '';
    img.decoding = 'async';
    img.addEventListener('load', () => { box.classList.add('has-image'); });
    img.addEventListener('error', () => {
      box.classList.remove('has-image');
      if (urls.length) img.src = urls.shift();
      else img.remove();
    });
    box.append(img);
    img.src = urls.shift();
  }
  return box;
}

const upgradeTag = number => number === undefined ? '' : `+${number}`;

function card(item) {
  const li = node('li');
  const button = node('button', 'gear');
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'dialog');
  button.dataset.itemId = item.id;
  const artwork = node('span', 'gear-art');
  artwork.append(picture([item.image, item.preview], 'thumbnail'));
  if (item.upgrade !== undefined) artwork.append(node('span', 'upgrade', upgradeTag(item.upgrade)));
  const details = node('span', 'gear-info');
  const label = item.kind === 'container' && item.artifacts?.length ? `Артефакты: ${item.artifacts.length}` : item.slot;
  const text = node('span', 'gear-text');
  if (label) text.append(node('span', 'kicker', label));
  text.append(node('strong', 'gear-name', item.name));
  const chevron = node('span', 'chevron', '↗');
  chevron.setAttribute('aria-hidden', 'true');
  details.append(text, chevron);
  button.append(artwork, details);
  button.addEventListener('click', () => inspect(item, button));
  li.append(button);
  return li;
}

function inventorySection({kind, title, items}) {
  const section = node('section', 'category');
  const header = node('div', 'category-heading');
  const heading = node('h2', '', title);
  heading.id = `category-${kind}`;
  section.setAttribute('aria-labelledby', heading.id);
  header.append(heading, node('span', 'count', String(items.length)));
  const grid = node('ul', 'gear-grid');
  grid.setAttribute('role', 'list');
  grid.append(...items.map(card));
  section.append(header, grid);
  return section;
}

function panel(title, classes = '') {
  const section = node('section', `panel ${classes}`);
  section.append(node('h3', 'panel-title', title));
  return section;
}

function statsPanel(item) {
  const section = panel('Характеристики', 'stats');
  const stats = item.stats ?? [];
  if (!stats.length) section.append(node('p', 'panel-note', 'Не указаны'));
  else {
    const list = node('dl', 'stat-list');
    for (const {label,value} of stats) {
      const stat = node('div');
      stat.append(node('dt', '', label), node('dd', '', value));
      list.append(stat);
    }
    section.append(list);
  }
  return section;
}

// Built-in positions are optional; custom slots are listed after them.
function slotRows(defaults, metadata = []) {
  const combined = defaults.map(([id,label]) => ({label, item: metadata.find(entry => entry.slot === id)}));
  const known = new Set(defaults.map(([id]) => id));
  metadata.forEach(entry => { if (!known.has(entry.slot)) combined.push({label:entry.slot,item:entry}); });
  return combined;
}

function slotsList(rows, classes) {
  const list = node('ul', `slots ${classes}`);
  list.setAttribute('role', 'list');
  for (const {label,item} of rows) {
    const li = node('li', `slot ${item ? 'fitted' : 'unlisted'}`);
    const tile = picture([item?.image], 'tile');
    if (!item) tile.firstChild.textContent = '—';
    const info = node('span', 'slot-info');
    info.append(node('span', 'slot-label', label), node('strong', 'slot-value', item?.name ?? 'Не указано'));
    li.append(tile, info);
    list.append(li);
  }
  return list;
}

function artifactPanel(item) {
  const section = panel('Артефакты');
  if (item.artifacts?.length) {
    const list = node('ul', 'artifact-list');
    list.setAttribute('role', 'list');
    for (const entry of item.artifacts) {
      const li = node('li', 'artifact');
      li.append(picture([entry.image], 'tile'), node('span','',entry.name));
      if (entry.upgrade !== undefined) li.append(node('span','artifact-upgrade',upgradeTag(entry.upgrade)));
      list.append(li);
    }
    section.append(list);
  } else section.append(node('p','panel-note',item.artifacts ? 'Контейнер пуст' : 'Артефакты не указаны'));
  return section;
}

function inspect(item, button) {
  opener = button;
  get('inspect-title').textContent = item.upgrade === undefined ? item.name : `${item.name} | ${upgradeTag(item.upgrade)}`;
  get('inspect-type').textContent = item.slot ?? '';
  const layout = node('div', 'inspect-layout');
  const visual = panel('Осмотр', item.kind === 'weapon' ? 'visual weapon-visual' : 'visual');
  const diagram = node('div', 'diagram');
  const central = node('div', 'central');
  central.append(picture([item.preview,item.image], 'large-preview'));
  diagram.append(central);
  if (item.kind === 'weapon') {
    const slots = slotRows(attachmentSlots, item.attachments);
    diagram.append(slotsList(slots.slice(0,4), 'slots-left'), slotsList(slots.slice(4,8), 'slots-right'));
    if (slots.length > 8) visual.append(diagram, slotsList(slots.slice(8), 'slots-extra'));
    else visual.append(diagram);
  } else {
    visual.append(diagram);
    if (item.attachments?.length) visual.append(slotsList(slotRows([], item.attachments), 'slots-extra'));
  }
  layout.append(visual, statsPanel(item));
  stage.replaceChildren(layout);
  if (item.kind === 'weapon' || item.kind === 'armor' || item.cosmetics?.length) {
    const cosmetic = panel('Оформление', 'lower-panel');
    cosmetic.append(slotsList(slotRows(cosmeticSlots, item.cosmetics), 'cosmetic-slots'));
    stage.append(cosmetic);
  }
  if (item.kind === 'container') {
    const artifacts = artifactPanel(item);
    artifacts.classList.add('lower-panel');
    stage.append(artifacts);
  }
  dialog.showModal();
  dialog.scrollTop = 0;
  goBack.focus();
}

goBack.addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { opener?.focus({preventScroll:true}); opener = undefined; });

try {
  const data = await load();
  const date = get('date');
  date.dateTime = data.updated;
  date.textContent = new Intl.DateTimeFormat('ru-RU',{dateStyle:'long',timeZone:'UTC'}).format(new Date(data.updated));
  get('timestamp').hidden = false;
  get('demo').hidden = !data.demo;
  get('inventory').append(...sectionsFor(data.items).map(inventorySection));
  get('status').textContent = data.items.length ? '' : 'Экипировка пока не добавлена.';
  get('status').hidden = data.items.length > 0;
} catch (error) {
  get('status').textContent = 'Не удалось загрузить экипировку. Попробуйте обновить страницу.';
  console.error(error);
}
