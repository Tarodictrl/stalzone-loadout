const kinds = { weapon: 'Оружие', armor: 'Броня', container: 'Контейнеры', other: 'Другое' };
const filled = value => typeof value === 'string' && value.trim().length > 0;
const optionalText = value => value === undefined || filled(value);
const optionalList = (value, check) => value === undefined || (Array.isArray(value) && value.every(check));
const visual = value => filled(value?.name) && optionalText(value.image);
const slotted = value => visual(value) && filled(value.slot);
const upgraded = value => value === undefined || (Number.isSafeInteger(value) && value >= 0);
const itemValid = item => filled(item?.id) && Object.hasOwn(kinds, item.kind) && filled(item.name) &&
  optionalText(item.slot) && optionalText(item.image) && optionalText(item.preview) && upgraded(item.upgrade) &&
  optionalList(item.stats, stat => filled(stat?.label) && filled(stat.value)) &&
  optionalList(item.attachments, slotted) && optionalList(item.cosmetics, slotted) &&
  optionalList(item.artifacts, artifact => visual(artifact) && upgraded(artifact.upgrade));

export function sectionsFor(items) {
  return Object.entries(kinds).map(([kind, title]) => ({kind, title, items: items.filter(item => item.kind === kind)})).filter(section => section.items.length);
}

export const showStats = kind => kind === 'weapon';

export function validate(data) {
  const date = data?.updated;
  const validDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date;
  if (!validDate || !filled(data.player) || typeof data.demo !== 'boolean' || !Array.isArray(data.items) || !data.items.every(itemValid) || new Set(data.items.map(item => item.id)).size !== data.items.length) throw new Error('Формат');
  return data;
}

export async function load(fetcher = fetch) {
  const response = await fetcher('./loadout.json', {cache:'no-cache'});
  if (!response.ok) throw new Error('HTTP');
  return validate(await response.json());
}
