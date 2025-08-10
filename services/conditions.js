// services/conditions.js
// Condições suportadas (todas opcionais):
// { any: [cond...], all: [cond...], not: cond,
//   hasFlag: "module.flagPath",
//   pcPath: "system.attrib.cold", op: ">=", value: 2,
//   activeEffect: "Bleeding",
//   gmOnly: true
// }
export function checkConditions(cond, ctx) {
  if (!cond) return true;
  if (cond.gmOnly && !game.user.isGM) return false;

  if (cond.any) return cond.any.some((c) => checkConditions(c, ctx));
  if (cond.all) return cond.all.every((c) => checkConditions(c, ctx));
  if (cond.not) return !checkConditions(cond.not, ctx);

  if (cond.hasFlag) {
    const [mod, ...rest] = cond.hasFlag.split(".");
    const path = rest.join(".");
    const v = ctx.actorPC.getFlag(mod, path);
    return !!v;
  }

  if (cond.activeEffect) {
    return ctx.actorPC.effects?.some(
      (e) => (e.name || e.label) === cond.activeEffect
    );
  }

  if (cond.pcPath) {
    const val = foundry.utils.getProperty(ctx.actorPC, cond.pcPath);
    const a = Number(val);
    const b = Number(cond.value ?? 0);
    switch (cond.op) {
      case ">":
        return a > b;
      case ">=":
        return a >= b;
      case "<":
        return a < b;
      case "<=":
        return a <= b;
      case "==":
        return a == b; // eslint-disable-line eqeqeq
      case "===":
        return a === b;
      case "!=":
        return a != b; // eslint-disable-line eqeqeq
      default:
        return !!val;
    }
  }

  return true;
}
