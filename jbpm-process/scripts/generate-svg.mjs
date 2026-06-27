/**
 * Generate jBPM-compatible process SVG from BPMN (see docs/jbpm-kalici-cozum-yol-haritasi.md).
 * Output: {processId}-svg.svg next to the BPMN file in src/main/resources.
 */
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const resourceDir = join(
  projectRoot,
  'src/main/resources/com/myspace/destrova_ticket_process',
);
const bpmnPath = join(resourceDir, 'TicketLifecycleProcess.bpmn');
const svgPath = join(resourceDir, 'destrova-ticket-process.TicketLifecycleProcess-svg.svg');

execFileSync('npx', ['bpmn-to-image', `${bpmnPath}:${svgPath}`], {
  cwd: projectRoot,
  stdio: 'inherit',
});

// jBPM Batik parser fails on SVG DOCTYPE nodes — strip them (BC-generated SVG has none).
let svg = readFileSync(svgPath, 'utf8');
svg = svg
  .replace(/<!DOCTYPE[^>]*>\s*/i, '')
  .replace(/<!-- created with bpmn-js[^>]*-->\s*/i, '');
writeFileSync(svgPath, svg);

console.log(`Generated ${svgPath}`);
