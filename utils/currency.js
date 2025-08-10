// utils/currency.js
import { MODULE_ID } from "../main.js";

export function getNumberByPath(doc, path) {
  return foundry.utils.getProperty(doc, path);
}
export function setNumberByPath(doc, path, value) {
  const update = {};
  foundry.utils.setProperty(update, path, value);
  return update;
}
export function getCurrencyPaths() {
  return {
    player: game.settings.get(MODULE_ID, "playerCurrencyPath"),
    npc: game.settings.get(MODULE_ID, "npcCurrencyPath"),
    sellRate: game.settings.get(MODULE_ID, "sellRate"),
    markupRate: game.settings.get(MODULE_ID, "markupRate"),
  };
}
