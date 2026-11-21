const filled = s => typeof s === 'string' && s.trim().length > 0;
export async function load(fetcher = fetch) {
  const response = await fetcher('./loadout.json', {cache:'no-cache'});
  if (!response.ok) throw new Error('HTTP');
  const data = await response.json();
  const date = data?.updated;
  const valid = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date;
  if (!valid || !filled(data.player) || typeof data.demo !== 'boolean' || !Array.isArray(data.items) || !data.items.every(i => filled(i?.slot) && filled(i?.name) && (i.image === undefined || filled(i.image)))) throw new Error('Формат');
  return data;
}