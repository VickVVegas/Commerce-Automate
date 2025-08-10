// apps/NPCInteractApp.js
import { MODULE_ID } from "../main.js";
import { getNPCFlags, setNPCFlags } from "../utils/flags.js";
import { getCurrencyPaths } from "../utils/currency.js";
import { getAvailableOptions } from "../services/dialogueEngine.js";
import { buyItem, moveStock, calcPriceDisplay, calcSellValue } from "../services/shopService.js";
import { InventoryPickerApp } from "./InventoryPickerApp.js";

export class NPCInteractApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "kult-npc-interact",
      title: "Interagir",
      template: `modules/${MODULE_ID}/templates/npc-app.hbs`,
      width: 640,
      height: "auto",
      resizable: true,
      classes: ["kult-app", "kult-theme"]
    });
  }

  constructor(actor, tokenDoc) {
    super();
    this.actor = actor;
    this.tokenDoc = tokenDoc;
    this.flags = getNPCFlags(actor);
    this.activeTab = "dialogue";
    this.currentNodeId = this.flags.dialogue?.startNode ?? null;
  }

  getData() {
    const player = game.user?.character ?? game.actors.filter(a => a.hasPlayerOwner)[0];
    const moneyPaths = getCurrencyPaths();
    const playerCurrency = player ? (foundry.utils.getProperty(player, moneyPaths.player) ?? 0) : 0;
    const npcCurrency = foundry.utils.getProperty(this.actor, moneyPaths.npc) ?? 0;

    const inventory = (this.flags.shop?.inventory ?? []).filter(i => (i.qty ?? 0) > 0);
    const rawNode = this.flags.dialogue?.nodes?.find(n => n.id === this.currentNodeId) ?? null;

    // monta contexto p/ filtrar opções
    const ctx = { actorNPC: this.actor, actorPC: player, user: game.user, flagsRoot: this.flags };
    const node = rawNode ? { ...rawNode, options: getAvailableOptions(rawNode, ctx) } : null;

    // aplicação de ágio de exibição
    const viewInventory = inventory.map(it => {
      const priceView = calcPriceDisplay(it.price, { markupRate: moneyPaths.markupRate });
      return { ...it, priceView };
    });

    return {
      isGM: game.user.isGM,
      actorName: this.actor.name,
      activeTab: this.activeTab,
      dialogue: { node, nodes: this.flags.dialogue?.nodes ?? [] },
      shop: { inventory: viewInventory },
      money: { playerCurrency, npcCurrency, moneyPaths },
      tokenName: this.tokenDoc?.name ?? ""
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-tab]").on("click", ev => {
      this.activeTab = ev.currentTarget.dataset.tab;
      this.render(false);
    });

    html.find("[data-action='choose-option']").on("click", ev => {
      const nextId = ev.currentTarget.dataset.next;
      this.currentNodeId = nextId || this.currentNodeId;
      this.render(false);
    });

    html.find("[data-action='buy']").on("click", ev => this._buy(ev));
    html.find("[data-action='sell-open']").on("click", () => this._openSell());

    if (game.user.isGM) {
      html.find("[data-action='open-editor']").on("click", () => {
        new (await import("./DialogueEditorApp.js")).DialogueEditorApp(this.actor).render(true);
      });
    }
  }

  async _buy(ev) {
    try {
      const li = ev.currentTarget.closest("li");
      const itemId = li?.dataset?.id;
      const qty = Number(li?.querySelector("input[name='qty']")?.value ?? 1);
      const inv = this.flags.shop?.inventory ?? [];
      const item = inv.find(i => i.id === itemId);
      if (!item) return;

      const { moneyPaths } = this.getData().money;
      const priceView = calcPriceDisplay(item.price, { markupRate: moneyPaths.markupRate });
      const priceFinal = priceView * qty;

      const player = game.user?.character ?? game.actors.filter(a => a.hasPlayerOwner)[0];
      if (!player) return ui.notifications.warn("Nenhum personagem de jogador.");

      // move estoque e grava
      const newInv = await moveStock({ flagsRoot: this.flags, itemId, qty });
      await setNPCFlags(this.actor, { "shop.inventory": newInv });

      // efetiva compra
      await buyItem({
        actorNPC: this.actor,
        actorPC: player,
        itemRef: item,
        qty,
        playerPath: moneyPaths.player,
        npcPath: moneyPaths.npc,
        priceFinal
      });

      ui.notifications.info(`Comprou ${qty}x ${item.name} por ${priceFinal}.`);
      this.flags = getNPCFlags(this.actor);
      this.render(false);
    } catch (e) {
      console.error(e);
      ui.notifications.error(e.message || "Erro na compra.");
    }
  }

  _openSell() {
    const player = game.user?.character ?? game.actors.filter(a => a.hasPlayerOwner)[0];
    if (!player) return ui.notifications.warn("Nenhum personagem de jogador.");
    new InventoryPickerApp(player, this.actor, (result) => {
      // callback após venda
      if (result?.sold) this.render(false);
    }).render(true);
  }
}
