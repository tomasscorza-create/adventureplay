import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const distDirectory = join(process.cwd(), "dist");
const indexHtml = await readFile(join(distDirectory, "index.html"), "utf8");
const errors = [];

const entryMatch = indexHtml.match(/src="\/(assets\/index-[^"]+\.js)"/);
if (!entryMatch) {
  errors.push("No se encontro el chunk de entrada en dist/index.html.");
} else {
  const entryStats = await stat(join(distDirectory, entryMatch[1]));
  const entryLimitBytes = 455 * 1024;
  if (entryStats.size > entryLimitBytes) {
    errors.push(`El chunk inicial pesa ${entryStats.size} bytes y supera el limite de ${entryLimitBytes}.`);
  }
}

if (/modulepreload[^>]+phaser-/i.test(indexHtml)) {
  errors.push("Phaser se esta precargando antes de autenticar al jugador.");
}

const headers = await readFile(join(distDirectory, "_headers"), "utf8");
for (const requiredHeader of [
  "Content-Security-Policy:",
  "Permissions-Policy:",
  "Strict-Transport-Security:",
  "X-Content-Type-Options:",
  "X-Frame-Options:",
]) {
  if (!headers.includes(requiredHeader)) {
    errors.push(`Falta ${requiredHeader} en los encabezados de produccion.`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Auditoria superada: entrada liviana, Phaser diferido y encabezados de produccion presentes.");
}
