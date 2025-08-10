// services/dialogueEngine.js
import { checkConditions } from "./conditions.js";

/**
 * Filtra as opções de um nó baseado em condições e visibilidade por jogador.
 * @param {object} node
 * @param {object} ctx { actorNPC, actorPC, user, flagsRoot }
 */
export function getAvailableOptions(node, ctx) {
  const options = node?.options ?? [];
  return options.filter((opt) => {
    // Visibilidade por usuário (IDs de jogadores permitidos)
    if (Array.isArray(opt.visibleForUsers) && opt.visibleForUsers.length) {
      if (!opt.visibleForUsers.includes(ctx.user?.id)) return false;
    }
    // Condições (expressões simples ou checagens por caminho)
    if (opt.conditions && !checkConditions(opt.conditions, ctx)) return false;
    return true;
  });
}
