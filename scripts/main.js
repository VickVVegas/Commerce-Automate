// scripts/main.js
import { NPCInteractApp } from "./apps/NPCInteractApp.js";
import { DialogueEditorApp } from "./apps/DialogueEditorApp.js";
import { ensureNPCFlags } from "./utils/flags.js";
import { registerHandlebarsHelpers } from "./utils/handlebars.js";

export const MODULE_ID = "kult-npc-automation";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | init v13`);
  registerHandlebarsHelpers();

  // SETTINGS
  game.settings.register(MODULE_ID, "playerCurrencyPath", {
    name: "Caminho de moeda do Jogador",
    hint: "Ex.: system.resources.credit (ajuste ao sistema Kult que estiver usando)",
    scope: "world",
    config: true,
    type: String,
    default: "system.resources.credit",
  });
  game.settings.register(MODULE_ID, "npcCurrencyPath", {
    name: "Caminho de moeda do NPC",
    scope: "world",
    config: true,
    type: String,
    default: "system.resources.credit",
  });
  game.settings.register(MODULE_ID, "sellRate", {
    name: "Percentual de venda do jogador",
    hint: "0.5 = 50% do preço base quando o jogador vende para o NPC",
    scope: "world",
    config: true,
    type: Number,
    default: 0.5,
  });
  game.settings.register(MODULE_ID, "markupRate", {
    name: "Ágio do vendedor",
    hint: "1.0 = preço base, 1.2 = +20% (aplicado ao preço exibido ao jogador)",
    scope: "world",
    config: true,
    type: Number,
    default: 1.0,
  });
  game.settings.register(MODULE_ID, "openOnDoubleClick", {
    name: "Abrir interação com duplo clique no token",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });
  game.settings.register(MODULE_ID, "shopCompendium", {
    name: "Compêndio de Itens (opcional)",
    hint: "Ex.: world.itens-do-mundo ou <scope>.<packId>. Permite puxar por UUID.",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | ready`);
});

// Botão no Token HUD (v13)
Hooks.on("renderTokenHUD", (hud, html) => {
  const token = canvas.tokens?.get(hud.object.document.id);
  const actor = token?.actor;
  if (!actor || actor.type !== "npc") return;

  const controls = html.find(".col.right");
  const btn = $(
    `<div class="control-icon" data-action="kult-interact" title="Interagir (Kult)">
      <i class="fas fa-comments"></i>
    </div>`
  );
  btn.on("click", async () => {
    await ensureNPCFlags(actor);
    new NPCInteractApp(actor, token.document).render(true);
  });
  controls.append(btn);

  if (game.user.isGM) {
    const btnEdit = $(
      `<div class="control-icon" data-action="kult-dialogue-editor" title="Editor de Diálogo (GM)">
        <i class="fas fa-project-diagram"></i>
      </div>`
    );
    btnEdit.on("click", async () => {
      await ensureNPCFlags(actor);
      new DialogueEditorApp(actor).render(true);
    });
    controls.append(btnEdit);
  }
});

// Duplo clique opcional
Hooks.on("dblclickToken", (tokenDoc) => {
  try {
    if (!game.settings.get(MODULE_ID, "openOnDoubleClick")) return;
    const actor = tokenDoc.actor;
    if (!actor || actor.type !== "npc") return;
    new NPCInteractApp(actor, tokenDoc).render(true);
  } catch (e) {
    console.error(`${MODULE_ID} | dblclickToken`, e);
  }
});

// Acesso global útil em macros
globalThis.KultNPCAuto = {
  openForSelected: () => {
    const token = canvas.tokens?.controlled?.[0]?.document;
    if (!token) return ui.notifications.warn("Selecione um token de NPC.");
    if (token.actor?.type !== "npc") return ui.notifications.warn("Não é NPC.");
    new NPCInteractApp(token.actor, token).render(true);
  },
  openEditorForSelected: () => {
    const token = canvas.tokens?.controlled?.[0]?.document;
    if (!token) return ui.notifications.warn("Selecione um token de NPC (GM).");
    if (!game.user.isGM) return ui.notifications.warn("Apenas GM.");
    new DialogueEditorApp(token.actor).render(true);
  },
};
