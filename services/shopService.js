// services/shopService.js
import { getNumberByPath, setNumberByPath } from "../utils/currency.js";
import { fetchItemFromUUID } from "./compendium.js";

export async function buyItem({
  actorNPC,
  actorPC,
  itemRef,
  qty,
  playerPath,
  npcPath,
  priceFinal,
}) {
  const playerMoney = getNumberByPath(actorPC, playerPath) ?? 0;
  if (playerMoney < priceFinal) throw new Error("Moeda insuficiente.");

  // dinheiro
  await actorPC.update(
    setNumberByPath(actorPC, playerPath, playerMoney - priceFinal)
  );
  const npcMoney = getNumberByPath(actorNPC, npcPath) ?? 0;
  await actorNPC.update(
    setNumberByPath(actorNPC, npcPath, npcMoney + priceFinal)
  );

  // item: se inventory usa UUID de compêndio, resolve
  let itemData;
  if (itemRef.uuid) {
    const item = await fetchItemFromUUID(itemRef.uuid);
    itemData = item.toObject();
    itemData.system = foundry.utils.mergeObject(itemData.system ?? {}, {
      quantity: qty,
    });
  } else {
    itemData = {
      name: itemRef.name,
      type: itemRef.type || "loot",
      system: foundry.utils.mergeObject(itemRef.system ?? {}, {
        quantity: qty,
      }),
    };
  }
  await actorPC.createEmbeddedDocuments("Item", [itemData]);
}

export async function moveStock({ flagsRoot, itemId, qty }) {
  const inv = flagsRoot.shop?.inventory ?? [];
  const it = inv.find((i) => i.id === itemId);
  if (!it) throw new Error("Item não encontrado.");
  if (it.qty < qty) throw new Error("Estoque insuficiente.");
  it.qty -= qty;
  return inv;
}

export function calcPriceDisplay(basePrice, { markupRate = 1.0 }) {
  basePrice = Number(basePrice || 0);
  return Math.max(0, Math.round(basePrice * markupRate));
}

export function calcSellValue(basePrice, qty, { sellRate = 0.5 }) {
  basePrice = Number(basePrice || 0);
  return Math.max(0, Math.floor(basePrice * qty * sellRate));
}
