import {load} from './loadout.mjs';
const get = id => document.getElementById(id);
function node(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function card({slot,name,image}, index) {
  const li = node('li','card');
  const art = node('div','art');
  const shapes = [/оружие/i,/броня/i,/шлем/i,/рюкзак/i];
  const paths = ['M3 10h12l5-3h9v4h-7l-5 4h-5l-2 7H6l2-7H3z','M10 4 5 8 3 15l4 4 3-3v12h12V16l3 3 4-4-2-7-5-4c0 7-12 7-12 0z','M5 22v-6a11 11 0 0 1 22 0v3H15l-3 5H5z','M11 8V4h10v4 M7 27V12a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v15z M11 16h10v7H11z'];
  const ns = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(ns,'svg');
  for (const [k,v] of Object.entries({viewBox:'0 0 32 32',fill:'none',stroke:'currentColor','stroke-width':'1.15','stroke-linejoin':'round','aria-hidden':'true'})) icon.setAttribute(k,v);
  const path = document.createElementNS(ns,'path');
  path.setAttribute('d',paths[shapes.findIndex(re=>re.test(slot))] ?? 'M16 3 28 9v14l-12 6-12-6V9Z M4 9l12 6 12-6 M16 15v14');
  icon.append(path); art.append(icon);
  if (image) {
    try {
      const url = new URL(image, document.baseURI);
      if (['http:','https:'].includes(url.protocol)) {
        const img = node('img','item-photo');
        img.alt = ''; img.style.opacity = '0'; img.loading = 'lazy'; img.decoding = 'async';
        img.addEventListener('load',()=>{icon.remove();img.style.opacity = '1';},{once:true});
        img.addEventListener('error',()=>img.remove(),{once:true});
        art.append(img); img.src = url.href;
      }
    } catch { /* Invalid URL: keep the slot icon. */ }
  }
  const num = node('span','num',String(index + 1).padStart(2,'0'));
  num.setAttribute('aria-hidden','true'); art.append(num);
  const body = node('div','card-body');
  body.append(node('p','label',slot),node('h3','name',name));
  li.append(art,body); return li;
}
try {
  const data = await load();
  get('date').dateTime = data.updated;
  get('date').textContent = new Intl.DateTimeFormat('ru-RU',{dateStyle:'long',timeZone:'UTC'}).format(new Date(data.updated));
  get('profile').hidden = false;
  get('demo').hidden = !data.demo;
  for(const [index,item] of data.items.entries()) get('items').append(card(item,index));
  get('status').textContent = data.items.length ? '' : 'В этом комплекте пока нет предметов.';
  get('status').hidden = data.items.length > 0;
} catch {
  get('status').textContent = 'Не удалось загрузить снаряжение. Попробуйте обновить страницу позже.';
}