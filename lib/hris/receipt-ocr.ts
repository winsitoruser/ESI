/**
 * Receipt OCR — extract amount, date, merchant from receipt images.
 * Rule-based extraction with optional LLM vision hook.
 */
import { getSumopodConfig } from './sumopod-config';

export interface ReceiptOCRResult {
  amount: number | null;
  date: string | null;
  merchant: string | null;
  category: 'medical' | 'transport' | 'meal' | 'travel' | 'other';
  description: string;
  confidence: number;
  rawText?: string;
  source: 'rules' | 'llm' | 'hybrid';
}

const AMOUNT_PATTERNS = [
  /(?:total|jumlah|grand\s*total|bayar|amount|rp\.?)\s*:?\s*rp?\s*([\d.,]+)/gi,
  /rp\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi,
  /([\d]{1,3}(?:\.\d{3})+(?:,\d{2})?)\s*(?:idr|rp)?/gi,
];

const DATE_PATTERNS = [
  /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
  /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
];

const CATEGORY_KEYWORDS: Record<ReceiptOCRResult['category'], string[]> = {
  medical: ['apotek', 'klinik', 'rumah sakit', 'rs ', 'dokter', 'farmasi', 'medika', 'health'],
  transport: ['grab', 'gojek', 'taxi', 'taksi', 'tol', 'bensin', 'pertamina', 'shell', 'parkir', 'ojol'],
  meal: ['restoran', 'cafe', 'kopi', 'makan', 'food', 'bakery', 'warung', 'mcd', 'kfc'],
  travel: ['hotel', 'tiket', 'travel', 'pesawat', 'kereta', 'booking'],
  other: [],
};

function parseAmount(text: string): number | null {
  const amounts: number[] = [];
  for (const pattern of AMOUNT_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m;
    while ((m = re.exec(text)) !== null) {
      const raw = m[1].replace(/\./g, '').replace(',', '.');
      const val = parseFloat(raw);
      if (!isNaN(val) && val > 0 && val < 100_000_000) amounts.push(val);
    }
  }
  return amounts.length ? Math.max(...amounts) : null;
}

function parseDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const m = text.match(pattern);
    if (!m) continue;
    let y: number, mo: number, d: number;
    if (m[1].length === 4) {
      y = parseInt(m[1], 10); mo = parseInt(m[2], 10); d = parseInt(m[3], 10);
    } else {
      d = parseInt(m[1], 10); mo = parseInt(m[2], 10);
      y = parseInt(m[3], 10); if (y < 100) y += 2000;
    }
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return null;
}

function detectCategory(text: string): ReceiptOCRResult['category'] {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === 'other') continue;
    if (keywords.some(k => lower.includes(k))) return cat as ReceiptOCRResult['category'];
  }
  return 'other';
}

function detectMerchant(text: string): string | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const skip = /^(total|jumlah|sub|tax|pajak|tanggal|date|no\.|invoice|kwitansi|struk)/i;
  for (const line of lines.slice(0, 5)) {
    if (line.length > 3 && line.length < 60 && !skip.test(line) && !/^rp/i.test(line) && !/^\d+$/.test(line)) {
      return line.slice(0, 50);
    }
  }
  return null;
}

/** Rule-based OCR from text (filename or extracted text) */
export function extractReceiptFromText(text: string, filename?: string): ReceiptOCRResult {
  const combined = `${filename || ''} ${text}`.trim();
  const amount = parseAmount(combined);
  const date = parseDate(combined);
  const merchant = detectMerchant(combined);
  const category = detectCategory(combined);
  const description = merchant
    ? `Klaim ${merchant}${amount ? ` — Rp ${amount.toLocaleString('id-ID')}` : ''}`
    : filename?.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') || 'Klaim reimbursement';

  let confidence = 40;
  if (amount) confidence += 30;
  if (date) confidence += 15;
  if (merchant) confidence += 15;

  return {
    amount,
    date,
    merchant,
    category,
    description,
    confidence: Math.min(95, confidence),
    rawText: text.slice(0, 500),
    source: 'rules',
  };
}

/** Optional LLM vision OCR via SumoPod */
export async function extractReceiptWithLLM(imageBase64: string, mimeType = 'image/jpeg'): Promise<ReceiptOCRResult | null> {
  const cfg = getSumopodConfig();
  if (!cfg.llmEnabled) return null;

  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.visionModel,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Ekstrak dari struk/kwitansi ini dalam format JSON: {"amount": number, "date": "YYYY-MM-DD", "merchant": string, "category": "medical|transport|meal|travel|other", "description": string}. Hanya JSON, tanpa markdown.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64.replace(/^data:[^;]+;base64,/, '')}` } },
          ],
        }],
        max_tokens: 300,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    const parsed = JSON.parse(content.replace(/```json?\n?/g, '').replace(/```/g, ''));
    return {
      amount: parsed.amount ? Number(parsed.amount) : null,
      date: parsed.date || null,
      merchant: parsed.merchant || null,
      category: parsed.category || 'other',
      description: parsed.description || 'Klaim dari struk',
      confidence: 85,
      source: 'llm',
    };
  } catch {
    return null;
  }
}

export async function processReceiptOCR(opts: {
  text?: string;
  filename?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<ReceiptOCRResult> {
  if (opts.imageBase64) {
    const llm = await extractReceiptWithLLM(opts.imageBase64, opts.mimeType);
    if (llm) return llm;
  }
  return extractReceiptFromText(opts.text || opts.filename || '', opts.filename);
}
