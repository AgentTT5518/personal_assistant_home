/**
 * Local Ollama Model Evaluation Script
 *
 * Evaluates multiple local Ollama models for financial document extraction.
 * ALL processing runs locally — no data is sent to cloud APIs.
 *
 * Usage:
 *   npx tsx scripts/eval-models.ts                        # run all models
 *   npx tsx scripts/eval-models.ts --model qwen2.5:32b    # run one model
 *   npx tsx scripts/eval-models.ts --chunked              # enable PDF text chunking
 *   npx tsx scripts/eval-models.ts --model qwen2.5-coder:14b --chunked
 */

import fs from 'fs/promises';
import path from 'path';
import { Ollama } from 'ollama';
import { extractTextFromPdf } from '../src/server/lib/pdf/extractor.js';
import { getPromptForDocType } from '../src/server/features/document-processor/prompts/index.js';
import { repairJson } from '../src/server/features/document-processor/json-repair.js';
import { extractionResultSchema } from '../src/shared/types/validation.js';
import type { DocumentType, Message } from '../src/shared/types/index.js';

// ── Config ──────────────────────────────────────────────────────────────────

const ALL_MODELS = ['qwen2.5:32b', 'qwen2.5-coder:14b', 'deepseek-r1:14b', 'llama3:8b'];
const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const PDF_DIR = path.resolve(SCRIPT_DIR, '../docs/private');
const RAW_RESPONSES_DIR = path.resolve(PDF_DIR, 'eval-raw-responses');
const RESULTS_PATH = path.resolve(PDF_DIR, 'eval-results.json');
const REPORT_PATH = path.resolve(PDF_DIR, 'eval-report.md');
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Text-based chunking config
const CHUNK_TEXT_THRESHOLD = 6000; // chars — docs above this get chunked
const CHUNK_TARGET_SIZE = 5000; // target chars per chunk
const CHUNK_OVERLAP = 200; // overlap chars between chunks to avoid splitting transactions

const ollama = new Ollama({
  host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
});

// ── Types ───────────────────────────────────────────────────────────────────

interface EvalResult {
  filename: string;
  docType: DocumentType;
  model: string;
  pdfTextLength: number;
  pdfPages: number;
  chunked: boolean;
  chunkCount: number;
  jsonParseSuccess: boolean;
  jsonParseError?: string;
  schemaValidationSuccess: boolean;
  schemaValidationErrors?: string[];
  jsonRepairs?: string[];
  transactionCount: number;
  hasAccountSummary: boolean;
  hasMetadata: boolean;
  responseTimeMs: number;
  promptTokens: number;
  completionTokens: number;
  rawResponseLength: number;
  error?: string;
}

interface TextChunk {
  text: string;
  chunkIndex: number;
}

interface PdfCache {
  text: string;
  pages: number;
  filename: string;
  docType: DocumentType;
  buffer: Buffer;
  chunks?: TextChunk[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function detectDocType(filename: string): DocumentType {
  if (/credit/i.test(filename)) return 'credit_card';
  return 'bank_statement';
}

function safeModelName(model: string): string {
  return model.replace(/[/:]/g, '_');
}

async function saveRawResponse(model: string, filename: string, content: string): Promise<void> {
  await fs.mkdir(RAW_RESPONSES_DIR, { recursive: true });
  const safeName = `${safeModelName(model)}_${filename.replace('.pdf', '')}.txt`;
  await fs.writeFile(path.join(RAW_RESPONSES_DIR, safeName), content, 'utf-8');
}

function parseArgs(): { models: string[]; chunked: boolean } {
  const args = process.argv.slice(2);
  const chunked = args.includes('--chunked');
  const modelIdx = args.indexOf('--model');
  if (modelIdx !== -1 && args[modelIdx + 1]) {
    const model = args[modelIdx + 1];
    if (!ALL_MODELS.includes(model)) {
      console.error(`Unknown model: ${model}`);
      console.error(`Available: ${ALL_MODELS.join(', ')}`);
      process.exit(1);
    }
    return { models: [model], chunked };
  }
  return { models: ALL_MODELS, chunked };
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── Text-Based Chunking ─────────────────────────────────────────────────────

/**
 * Split already-extracted text into overlapping chunks.
 *
 * Splits at newline boundaries near the target size to avoid cutting
 * transactions mid-line. Adds overlap so transactions near boundaries
 * appear in both chunks (dedup removes duplicates later).
 *
 * This avoids the page-based approach which loses text layers on
 * certain encrypted/complex PDFs (e.g. OCBC, DBS statements).
 */
function splitTextIntoChunks(text: string): TextChunk[] {
  if (text.length <= CHUNK_TEXT_THRESHOLD) {
    return []; // No need to chunk
  }

  const chunks: TextChunk[] = [];
  let offset = 0;

  while (offset < text.length) {
    let end = Math.min(offset + CHUNK_TARGET_SIZE, text.length);

    // Try to split at a newline boundary to avoid cutting a transaction mid-line
    if (end < text.length) {
      const newlineIdx = text.lastIndexOf('\n', end);
      if (newlineIdx > offset + CHUNK_TARGET_SIZE * 0.5) {
        end = newlineIdx + 1; // Include the newline
      }
    }

    chunks.push({
      text: text.slice(offset, end),
      chunkIndex: chunks.length,
    });

    // If we reached the end, stop
    if (end >= text.length) break;

    // Move forward by (chunk size - overlap) to create overlap region
    const advance = end - offset - CHUNK_OVERLAP;
    if (advance <= 0) break; // Safety: prevent infinite loop
    offset += advance;
  }

  return chunks;
}

// ── PDF Extraction (cached) ─────────────────────────────────────────────────

async function loadAllPdfs(chunked: boolean): Promise<PdfCache[]> {
  const files = await fs.readdir(PDF_DIR);
  const pdfs = files.filter((f) => f.toLowerCase().endsWith('.pdf')).sort();

  console.log(`\nExtracting PDF text${chunked ? ' (chunking enabled)' : ''}...`);
  const cache: PdfCache[] = [];

  for (let i = 0; i < pdfs.length; i++) {
    const filename = pdfs[i];
    const filepath = path.join(PDF_DIR, filename);
    const buffer = await fs.readFile(filepath);
    const result = await extractTextFromPdf(buffer);
    const docType = detectDocType(filename);

    const entry: PdfCache = {
      text: result.text,
      pages: result.pages,
      filename,
      docType,
      buffer,
    };

    // If chunking enabled and text exceeds threshold, split the extracted text
    if (chunked && result.text.length > CHUNK_TEXT_THRESHOLD) {
      const chunks = splitTextIntoChunks(result.text);
      if (chunks.length > 1) {
        entry.chunks = chunks;
        const chunkSizes = chunks.map((c) => c.text.length).join(', ');
        console.log(`  [${i + 1}/${pdfs.length}] ${filename} (${result.pages} pages, ${result.text.length} chars) → ${chunks.length} chunks [${chunkSizes}]`);
      } else {
        console.log(`  [${i + 1}/${pdfs.length}] ${filename} (${result.pages} pages, ${result.text.length} chars) OK`);
      }
    } else {
      console.log(`  [${i + 1}/${pdfs.length}] ${filename} (${result.pages} pages, ${result.text.length} chars) OK`);
    }

    cache.push(entry);
  }

  return cache;
}

// ── Model Warm-up ───────────────────────────────────────────────────────────

async function warmUpModel(model: string): Promise<boolean> {
  try {
    await ollama.chat({
      model,
      messages: [{ role: 'user', content: 'Respond with OK' }],
      options: { temperature: 0 },
    });
    return true;
  } catch (error) {
    console.error(`  Failed to warm up ${model}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// ── Single AI Call ───────────────────────────────────────────────────────────

interface AiCallResult {
  content: string;
  responseTimeMs: number;
  promptTokens: number;
  completionTokens: number;
}

async function callOllama(model: string, messages: Message[]): Promise<AiCallResult> {
  const start = performance.now();

  const response = await Promise.race([
    ollama.chat({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      options: { temperature: 0 },
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: exceeded 5 minutes')), REQUEST_TIMEOUT_MS),
    ),
  ]);

  return {
    content: response.message.content,
    responseTimeMs: performance.now() - start,
    promptTokens: response.prompt_eval_count ?? 0,
    completionTokens: response.eval_count ?? 0,
  };
}

// ── Single Evaluation ───────────────────────────────────────────────────────

async function evaluateOne(model: string, pdf: PdfCache): Promise<EvalResult> {
  const isChunked = !!pdf.chunks && pdf.chunks.length > 1;

  const result: EvalResult = {
    filename: pdf.filename,
    docType: pdf.docType,
    model,
    pdfTextLength: pdf.text.length,
    pdfPages: pdf.pages,
    chunked: isChunked,
    chunkCount: isChunked ? pdf.chunks!.length : 1,
    jsonParseSuccess: false,
    schemaValidationSuccess: false,
    transactionCount: 0,
    hasAccountSummary: false,
    hasMetadata: false,
    responseTimeMs: 0,
    promptTokens: 0,
    completionTokens: 0,
    rawResponseLength: 0,
  };

  try {
    if (isChunked) {
      // ── Chunked evaluation: call AI per chunk, merge results ──
      const allTransactions: Array<{ date: string; description: string; amount: number; type: 'debit' | 'credit'; merchant?: string; isRecurring?: boolean }> = [];
      let lastAccountSummary: unknown = undefined;
      let lastMetadata: unknown = undefined;
      const allRepairs: string[] = [];
      let allRawResponses = '';

      for (let ci = 0; ci < pdf.chunks!.length; ci++) {
        const chunk = pdf.chunks![ci];
        const messages: Message[] = getPromptForDocType(pdf.docType, chunk.text);

        try {
          const aiResult = await callOllama(model, messages);
          result.responseTimeMs += aiResult.responseTimeMs;
          result.promptTokens += aiResult.promptTokens;
          result.completionTokens += aiResult.completionTokens;
          result.rawResponseLength += aiResult.content.length;

          allRawResponses += `\n--- CHUNK ${ci + 1}/${pdf.chunks!.length} (${chunk.text.length} chars) ---\n${aiResult.content}\n`;

          const { repaired, repairs } = repairJson(aiResult.content);
          allRepairs.push(...repairs);

          const parsed = JSON.parse(repaired) as Record<string, unknown>;

          // Validate chunk individually
          const validation = extractionResultSchema.safeParse(parsed);
          if (validation.success) {
            allTransactions.push(...validation.data.transactions);
            if (validation.data.accountSummary) lastAccountSummary = validation.data.accountSummary;
            if (validation.data.metadata) lastMetadata = validation.data.metadata;
          } else {
            // Even if schema fails, try to extract transactions array
            if (Array.isArray(parsed.transactions)) {
              for (const t of parsed.transactions) {
                const txValidation = extractionResultSchema.shape.transactions.element.safeParse(t);
                if (txValidation.success) {
                  allTransactions.push(txValidation.data);
                }
              }
            }
          }
        } catch (chunkErr) {
          // One chunk failed — continue with others
          const msg = chunkErr instanceof Error ? chunkErr.message : String(chunkErr);
          allRawResponses += `\n--- CHUNK ${ci + 1}/${pdf.chunks!.length} ERROR: ${msg.substring(0, 80)} ---\n`;
        }
      }

      // Save all raw responses
      await saveRawResponse(model, pdf.filename, allRawResponses);

      if (allRepairs.length > 0) {
        result.jsonRepairs = allRepairs;
      }

      // Deduplicate transactions across chunks (same date+description+amount = duplicate)
      const seen = new Set<string>();
      const dedupedTransactions = allTransactions.filter((t) => {
        const key = `${t.date}|${t.description}|${t.amount.toFixed(2)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // If we got any transactions, count it as success
      if (dedupedTransactions.length > 0 || lastAccountSummary) {
        result.jsonParseSuccess = true;
        result.schemaValidationSuccess = true;
        result.transactionCount = dedupedTransactions.length;
        result.hasAccountSummary = !!lastAccountSummary;
        result.hasMetadata = !!lastMetadata;
      } else {
        result.jsonParseError = 'All chunks failed to produce valid transactions';
      }
    } else {
      // ── Non-chunked evaluation: single AI call (original logic) ──
      const messages: Message[] = getPromptForDocType(pdf.docType, pdf.text);
      const aiResult = await callOllama(model, messages);

      result.responseTimeMs = aiResult.responseTimeMs;
      result.rawResponseLength = aiResult.content.length;
      result.promptTokens = aiResult.promptTokens;
      result.completionTokens = aiResult.completionTokens;

      // Save raw response for inspection
      await saveRawResponse(model, pdf.filename, aiResult.content);

      // Repair + parse JSON
      try {
        const { repaired, repairs } = repairJson(aiResult.content);
        if (repairs.length > 0) {
          result.jsonRepairs = repairs;
        }

        const parsed = JSON.parse(repaired);
        result.jsonParseSuccess = true;

        // Validate schema
        const validation = extractionResultSchema.safeParse(parsed);
        if (validation.success) {
          result.schemaValidationSuccess = true;
          result.transactionCount = validation.data.transactions.length;
          result.hasAccountSummary = !!validation.data.accountSummary;
          result.hasMetadata = !!validation.data.metadata;
        } else {
          result.schemaValidationErrors = validation.error.issues.map(
            (i) => `${i.path.join('.')}: ${i.message}`,
          );
        }
      } catch (parseErr) {
        result.jsonParseError = parseErr instanceof Error ? parseErr.message : String(parseErr);
      }
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

// ── Report Generation ───────────────────────────────────────────────────────

function generateReport(results: EvalResult[], models: string[]): string {
  const lines: string[] = [];

  lines.push('# Ollama Model Evaluation Report');
  lines.push(`\nGenerated: ${new Date().toISOString()}`);
  lines.push(`PDFs evaluated: ${new Set(results.map((r) => r.filename)).size}`);
  lines.push(`Models tested: ${models.join(', ')}`);
  lines.push('');

  // ── Summary Table ──
  lines.push('## Summary');
  lines.push('');
  lines.push('| Model | JSON Parse | Schema Valid | Avg Txns | Avg Time | Avg Prompt Tokens | Avg Completion Tokens | Docs |');
  lines.push('|-------|-----------|-------------|----------|----------|-------------------|----------------------|------|');

  for (const model of models) {
    const modelResults = results.filter((r) => r.model === model);
    const total = modelResults.length;
    if (total === 0) continue;

    const jsonOk = modelResults.filter((r) => r.jsonParseSuccess).length;
    const schemaOk = modelResults.filter((r) => r.schemaValidationSuccess).length;
    const avgTxns = modelResults.reduce((s, r) => s + r.transactionCount, 0) / total;
    const avgTime = modelResults.reduce((s, r) => s + r.responseTimeMs, 0) / total;
    const avgPrompt = modelResults.reduce((s, r) => s + r.promptTokens, 0) / total;
    const avgCompletion = modelResults.reduce((s, r) => s + r.completionTokens, 0) / total;

    lines.push(
      `| ${model} | ${jsonOk}/${total} (${((jsonOk / total) * 100).toFixed(0)}%) | ${schemaOk}/${total} (${((schemaOk / total) * 100).toFixed(0)}%) | ${avgTxns.toFixed(1)} | ${formatTime(avgTime)} | ${avgPrompt.toFixed(0)} | ${avgCompletion.toFixed(0)} | ${total} |`,
    );
  }

  // ── Per-Document Comparison ──
  lines.push('');
  lines.push('## Per-Document Comparison');

  const filenames = [...new Set(results.map((r) => r.filename))].sort();
  for (const filename of filenames) {
    const docResults = results.filter((r) => r.filename === filename);
    const docType = docResults[0]?.docType ?? 'unknown';

    lines.push('');
    lines.push(`### ${filename}`);
    lines.push(`Type: \`${docType}\` | Text: ${docResults[0]?.pdfTextLength ?? 0} chars | Pages: ${docResults[0]?.pdfPages ?? 0}`);
    lines.push('');
    lines.push('| Model | Parse | Valid | Txns | Summary | Time | Errors |');
    lines.push('|-------|-------|-------|------|---------|------|--------|');

    for (const r of docResults) {
      const errors = r.error
        ? r.error.substring(0, 80)
        : r.jsonParseError
          ? r.jsonParseError.substring(0, 80)
          : r.schemaValidationErrors
            ? r.schemaValidationErrors.slice(0, 2).join('; ').substring(0, 80)
            : '-';

      lines.push(
        `| ${r.model} | ${r.jsonParseSuccess ? 'OK' : 'FAIL'} | ${r.schemaValidationSuccess ? 'OK' : 'FAIL'} | ${r.transactionCount} | ${r.hasAccountSummary ? 'Yes' : 'No'} | ${formatTime(r.responseTimeMs)} | ${errors} |`,
      );
    }
  }

  // ── Error Analysis ──
  const failures = results.filter((r) => !r.schemaValidationSuccess);
  if (failures.length > 0) {
    lines.push('');
    lines.push('## Error Analysis');

    for (const model of models) {
      const modelFails = failures.filter((r) => r.model === model);
      if (modelFails.length === 0) continue;

      lines.push('');
      lines.push(`### ${model} (${modelFails.length} failures)`);
      for (const f of modelFails) {
        lines.push(`- **${f.filename}**: ${f.error || f.jsonParseError || f.schemaValidationErrors?.join('; ') || 'Unknown'}`);
      }
    }
  }

  // ── Recommendation ──
  lines.push('');
  lines.push('## Recommendation');
  lines.push('');

  const modelStats = models.map((model) => {
    const mr = results.filter((r) => r.model === model);
    const total = mr.length;
    if (total === 0) return { model, schemaRate: 0, avgTime: Infinity, avgTxns: 0 };
    return {
      model,
      schemaRate: mr.filter((r) => r.schemaValidationSuccess).length / total,
      avgTime: mr.reduce((s, r) => s + r.responseTimeMs, 0) / total,
      avgTxns: mr.reduce((s, r) => s + r.transactionCount, 0) / total,
    };
  });

  const bestAccuracy = [...modelStats].sort((a, b) => b.schemaRate - a.schemaRate || b.avgTxns - a.avgTxns)[0];
  const bestSpeed = [...modelStats].sort((a, b) => a.avgTime - b.avgTime)[0];

  lines.push(`- **Best accuracy:** \`${bestAccuracy.model}\` — ${(bestAccuracy.schemaRate * 100).toFixed(0)}% schema pass rate, avg ${bestAccuracy.avgTxns.toFixed(1)} transactions`);
  lines.push(`- **Best speed:** \`${bestSpeed.model}\` — avg ${formatTime(bestSpeed.avgTime)} per document`);

  if (bestAccuracy.model !== bestSpeed.model) {
    // Find best balance (highest accuracy among those within 2x of fastest)
    const speedThreshold = bestSpeed.avgTime * 2;
    const balanced = modelStats
      .filter((m) => m.avgTime <= speedThreshold)
      .sort((a, b) => b.schemaRate - a.schemaRate || b.avgTxns - a.avgTxns)[0];
    if (balanced) {
      lines.push(`- **Best balance:** \`${balanced.model}\` — ${(balanced.schemaRate * 100).toFixed(0)}% accuracy at ${formatTime(balanced.avgTime)} avg`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { models, chunked } = parseArgs();

  console.log('Ollama Model Evaluation');
  console.log('========================');
  console.log('SAFETY: All processing runs locally via Ollama. No cloud APIs are called.');
  if (chunked) {
    console.log(`CHUNKING: Enabled (threshold: ${CHUNK_TEXT_THRESHOLD} chars, target ${CHUNK_TARGET_SIZE} chars/chunk, overlap ${CHUNK_OVERLAP})`);
  }
  console.log('');

  // Verify Ollama is running
  try {
    await ollama.list();
  } catch {
    console.error('ERROR: Ollama is not running. Start it with: ollama serve');
    process.exit(1);
  }

  // Load PDFs
  const pdfCache = await loadAllPdfs(chunked);
  const bankCount = pdfCache.filter((p) => p.docType === 'bank_statement').length;
  const creditCount = pdfCache.filter((p) => p.docType === 'credit_card').length;

  console.log(`\nPDFs found: ${pdfCache.length} (${bankCount} bank statements, ${creditCount} credit cards)`);
  console.log(`Models: ${models.join(', ')}`);
  console.log('');

  // Load any existing results (for incremental runs)
  let allResults: EvalResult[] = [];
  try {
    const existing = await fs.readFile(RESULTS_PATH, 'utf-8');
    allResults = JSON.parse(existing);
    // Remove results for models we're about to re-run
    allResults = allResults.filter((r) => !models.includes(r.model));
  } catch {
    // No existing results — start fresh
  }

  // Evaluate each model
  for (let mi = 0; mi < models.length; mi++) {
    const model = models[mi];
    console.log(`=== Model ${mi + 1}/${models.length}: ${model} ===`);

    // Warm up
    console.log(`  Warming up (loading model into memory)...`);
    const ready = await warmUpModel(model);
    if (!ready) {
      console.log(`  SKIPPING ${model} — failed to load`);
      continue;
    }
    console.log(`  Model ready.`);

    const modelResults: EvalResult[] = [];

    for (let pi = 0; pi < pdfCache.length; pi++) {
      const pdf = pdfCache[pi];
      process.stdout.write(`  [${pi + 1}/${pdfCache.length}] ${pdf.filename} ... `);

      const result = await evaluateOne(model, pdf);
      modelResults.push(result);

      const repairNote = result.jsonRepairs?.length ? ` [${result.jsonRepairs.length} repairs]` : '';
      const chunkNote = result.chunked ? ` (${result.chunkCount} chunks)` : '';
      if (result.error) {
        console.log(`ERROR: ${result.error.substring(0, 60)}`);
      } else if (!result.jsonParseSuccess) {
        console.log(`JSON FAIL${repairNote}${chunkNote}: ${result.jsonParseError?.substring(0, 60)}`);
      } else if (!result.schemaValidationSuccess) {
        console.log(`SCHEMA FAIL (${result.schemaValidationErrors?.length} errors)${repairNote}${chunkNote}, ${formatTime(result.responseTimeMs)}`);
      } else {
        console.log(`${result.transactionCount} txns, ${formatTime(result.responseTimeMs)}${repairNote}${chunkNote}, VALID`);
      }
    }

    allResults.push(...modelResults);

    // Save intermediate results after each model
    await fs.writeFile(RESULTS_PATH, JSON.stringify(allResults, null, 2));
    console.log(`  Intermediate results saved.\n`);

    const valid = modelResults.filter((r) => r.schemaValidationSuccess).length;
    const avgTime = modelResults.reduce((s, r) => s + r.responseTimeMs, 0) / modelResults.length;
    console.log(`  Model summary: ${valid}/${modelResults.length} valid, avg ${formatTime(avgTime)}`);
    console.log('');
  }

  // Generate report
  const report = generateReport(allResults, models);
  await fs.writeFile(REPORT_PATH, report);
  console.log(`Report written to ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
