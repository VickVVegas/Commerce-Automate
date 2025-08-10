// apps/InventoryPickerApp.js
import { MODULE_ID } from "../main.js";
import { getCurrencyPaths } from "../utils/currency.js";
import { calcSellValue } from "../services/shopService.js";
import { getNPCFlags, setNPCFlags } from "../utils/flags.js";

export class InventoryPickerApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "kult-inventory-picker",
      title: "Vender Itens",
      template: `modules/${MODULE_ID}/templates/inventory-picker.hbs`,
      width: 620,
      height: 480,
      resizable: true,
      classes: ["kult-app", "kult-theme"],
    });
  }

  constructor(actorPC, actorNPC, callback) {
    super();
    this.actorPC = actorPC;
    this.actorNPC = actorNPC;
    this.callback = callback;
  }

  getData() {
    const items = this.actorPC.items.map((i) => ({
      id: i.id,
      name: i.name,
      type: i.type,
      qty: Number(i.system?.quantity ?? 1),
      price: Number(i.system?.price ?? 0),
    }));
    const money = getCurrencyPaths();
    const npcCurrency =
      foundry.utils.getProperty(this.actorNPC, money.npc) ?? 0;
    return { items, npcCurrency, sellRate: money.sellRate };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='sell-item']").on("click", (ev) => this._sell(ev));
  }

  async _sell(ev) {
    try {
      const row = ev.currentTarget.closest("tr");
      const id = row?.dataset?.id;
      const qty = Number(row.querySelector("input[name='qty']").value ?? 1);
      const item = this.actorPC.items.get(id);
      if (!item) return;

      const basePrice = Number(item.system?.price ?? 0);
      const sellRate = game.settings.get("kult-npc-automation", "sellRate");
      const value = calcSellValue(basePrice, qty, { sellRate });

      const playerPath = game.settings.get(
        "kult-npc-automation",
        "playerCurrencyPath"
      );
      const npcPath = game.settings.get(
        "kult-npc-automation",
        "npcCurrencyPath"
      );

      const npcMoney = foundry.utils.getProperty(this.actorNPC, npcPath) ?? 0;
      if (npcMoney < value)
        return ui.notifications.warn("Vendedor sem moedas suficientes.");

      // dinheiro
      const playerMoney =
        foundry.utils.getProperty(this.actorPC, playerPath) ?? 0;
      await this.actorPC.update({ [playerPath]: playerMoney + value });
      await this.actorNPC.update({ [npcPath]: npcMoney - value });

      // mover item p/ estoque do NPC
      const flags = getNPCFlags(this.actorNPC);
      const inv = flags.shop?.inventory ?? [];
      const idx = inv.findIndex((i) => i.name === item.name);
      if (idx >= 0) inv[idx].qty += qty;
      else
        inv.push({
          id: randomID(),
          name: item.name,
          qty,
          price: basePrice || 1,
          type: item.type,
          system: item.system,
        });

      await setNPCFlags(this.actorNPC, { "shop.inventory": inv });

      // reduzir/remover do jogador
      const curQty = Number(item.system?.quantity ?? 1);
      if (curQty > qty) await item.update({ "system.quantity": curQty - qty });
      else await item.delete();

      ui.notifications.info(`Vendeu ${qty}x ${item.name} por ${value}.`);
      if (this.callback) this.callback({ sold: true });
      this.render(false);
    } catch (e) {
      console.error(e);
      ui.notifications.error(e.message || "Erro ao vender.");
    }
  }
}
