// utils/flags.js
import { MODULE_ID } from "../main.js";

export function getNPCFlags(actor) {
  return actor.getFlag(MODULE_ID, "") ?? {};
}

export async function setNPCFlags(actor, updates) {
  const current = foundry.utils.duplicate(getNPCFlags(actor));
  const merged = foundry.utils.mergeObject(
    current,
    foundry.utils.expandObject(updates),
    { inplace: false, overwrite: true, insertKeys: true }
  );
  return actor.update({ [`flags.${MODULE_ID}`]: merged });
}

export async function ensureNPCFlags(actor) {
  const f = getNPCFlags(actor);
  if (f && Object.keys(f).length) return;
  const base = {
    dialogue: {
      startNode: "root",
      nodes: [
        {
          id: "root",
          text: 'O homem ergue o olhar. "Busca respostas… ou mercadorias?"',
          options: [
            { label: "Ver mercadorias", next: null },
            { label: "Quem é você?", next: "who" },
          ],
        },
        {
          id: "who",
          text: "Nomes são véus. O que você deseja?",
          options: [{ label: "Voltar", next: "root" }],
        },
      ],
    },
    shop: {
      inventory: [
        {
          id: randomID(),
          name: "Relicário enferrujado",
          price: 15,
          qty: 1,
          type: "loot",
          system: { description: "Cheira a incenso velho." },
        },
      ],
    },
  };
  await actor.update({ [`flags.${MODULE_ID}`]: base });
}
