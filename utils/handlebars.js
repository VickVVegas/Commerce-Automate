// utils/handlebars.js
export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("json", (ctx) => JSON.stringify(ctx));
}
