// services/compendium.js
export async function fetchItemFromUUID(uuid) {
  const doc = await fromUuid(uuid);
  if (!doc) throw new Error("UUID inválido.");
  return doc;
}
