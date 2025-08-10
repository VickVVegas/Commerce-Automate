// apps/DialogueEditorApp.js
import { MODULE_ID } from "../main.js";
import { getNPCFlags, setNPCFlags } from "../utils/flags.js";

export class DialogueEditorApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "kult-dialogue-editor",
      title: "Editor de Diálogo (Kult)",
      template: `modules/${MODULE_ID}/templates/dialogue-editor.hbs`,
      width: 900,
      height: 600,
      resizable: true,
      classes: ["kult-app", "kult-theme", "kult-editor"],
    });
  }

  constructor(actor) {
    super();
    this.actor = actor;
    this.flags = getNPCFlags(actor);
    this.selectedNode = this.flags.dialogue?.startNode ?? null;
  }

  getData() {
    const dlg = this.flags.dialogue ?? { startNode: null, nodes: [] };
    const nodes = dlg.nodes ?? [];
    const current = nodes.find((n) => n.id === this.selectedNode) ?? null;
    return {
      actorName: this.actor.name,
      dialogue: dlg,
      nodes,
      current,
      isGM: game.user.isGM,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Seleção de nó
    html.find("[data-action='select-node']").on("click", (ev) => {
      this.selectedNode = ev.currentTarget.dataset.id;
      this.render(false);
    });

    // Adicionar/remover nós
    html.find("[data-action='add-node']").on("click", async () => {
      const id = randomID();
      const nodes = foundry.utils.duplicate(this.flags.dialogue?.nodes ?? []);
      nodes.push({ id, text: "Novo nó.", options: [] });
      await setNPCFlags(this.actor, { "dialogue.nodes": nodes });
      this.flags = getNPCFlags(this.actor);
      this.selectedNode = id;
      this.render(false);
    });

    html.find("[data-action='remove-node']").on("click", async () => {
      if (!this.selectedNode) return;
      let nodes = foundry.utils.duplicate(this.flags.dialogue?.nodes ?? []);
      nodes = nodes.filter((n) => n.id !== this.selectedNode);
      await setNPCFlags(this.actor, { "dialogue.nodes": nodes });
      this.flags = getNPCFlags(this.actor);
      this.selectedNode =
        this.flags.dialogue?.startNode ?? nodes[0]?.id ?? null;
      this.render(false);
    });

    // Editar StartNode
    html.find("[name='startNode']").on("change", async (ev) => {
      const v = ev.currentTarget.value;
      await setNPCFlags(this.actor, { "dialogue.startNode": v });
      this.flags = getNPCFlags(this.actor);
      this.render(false);
    });

    // Salvar texto do nó
    html.find("[data-action='save-node']").on("click", async (ev) => {
      const txt = html.find("textarea[name='nodeText']").val();
      const nodes = foundry.utils.duplicate(this.flags.dialogue?.nodes ?? []);
      const idx = nodes.findIndex((n) => n.id === this.selectedNode);
      if (idx >= 0) nodes[idx].text = txt;
      await setNPCFlags(this.actor, { "dialogue.nodes": nodes });
      this.flags = getNPCFlags(this.actor);
      ui.notifications.info("Texto do nó salvo.");
    });

    // Gerenciar opções
    html.find("[data-action='add-option']").on("click", async () => {
      const nodes = foundry.utils.duplicate(this.flags.dialogue?.nodes ?? []);
      const idx = nodes.findIndex((n) => n.id === this.selectedNode);
      if (idx < 0) return;
      nodes[idx].options = nodes[idx].options || [];
      nodes[idx].options.push({
        label: "Nova opção",
        next: "",
        conditions: null,
        visibleForUsers: [],
      });
      await setNPCFlags(this.actor, { "dialogue.nodes": nodes });
      this.flags = getNPCFlags(this.actor);
      this.render(false);
    });

    html.find("[data-action='remove-option']").on("click", async (ev) => {
      const i = Number(ev.currentTarget.dataset.index);
      const nodes = foundry.utils.duplicate(this.flags.dialogue?.nodes ?? []);
      const idx = nodes.findIndex((n) => n.id === this.selectedNode);
      nodes[idx].options.splice(i, 1);
      await setNPCFlags(this.actor, { "dialogue.nodes": nodes });
      this.flags = getNPCFlags(this.actor);
      this.render(false);
    });

    // Salvar opção (label/next/visibilidade/condições)
    html.find("[data-action='save-option']").on("click", async (ev) => {
      const i = Number(ev.currentTarget.dataset.index);
      const root = $(ev.currentTarget).closest("[data-option-row]");
      const label = root.find("[name='optLabel']").val();
      const next = root.find("[name='optNext']").val();
      const visible =
        root
          .find("[name='optVisible']")
          .val()
          ?.split(",")
          .map((s) => s.trim())
          .filter(Boolean) ?? [];

      let conditions = null;
      try {
        const raw = root.find("[name='optCond']").val();
        conditions = raw ? JSON.parse(raw) : null;
      } catch (e) {
        return ui.notifications.error("JSON de condições inválido.");
      }

      const nodes = foundry.utils.duplicate(this.flags.dialogue?.nodes ?? []);
      const idx = nodes.findIndex((n) => n.id === this.selectedNode);
      const opt = nodes[idx].options[i];
      nodes[idx].options[i] = {
        ...opt,
        label,
        next,
        visibleForUsers: visible,
        conditions,
      };
      await setNPCFlags(this.actor, { "dialogue.nodes": nodes });
      this.flags = getNPCFlags(this.actor);
      ui.notifications.info("Opção salva.");
    });
  }
}
