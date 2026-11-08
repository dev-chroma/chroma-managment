import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzFLHRck8uno6AyP9EKg7ej_8un_tZz22_lh0I1IFD0a76ubiPV1XrMYsqbyfefxCpj/exec';
const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1YtLXElTsedWX3kFPqoE4iJn84ige3-U1ftojhmfcxxM/edit?gid=0#gid=0';

function formatSheetDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  const str = String(val).trim();
  if (str.includes('T') && !isNaN(Date.parse(str))) {
    const d = new Date(str);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return str;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      action = 'pull',
      sheetUrl = DEFAULT_SHEET_URL,
      webhookUrl = DEFAULT_WEBHOOK_URL,
      rows = [],
    } = body;

    const targetWebhook = webhookUrl || DEFAULT_WEBHOOK_URL;

    // 1. PUSH TO GOOGLE APPS SCRIPT WEBHOOK
    if (action === 'push') {
      if (!targetWebhook) {
        return NextResponse.json({ success: false, error: 'No Google Apps Script Webhook URL configured.' }, { status: 400 });
      }

      try {
        const res = await fetch(targetWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync_all', rows }),
        });

        const resText = await res.text();
        return NextResponse.json({ success: true, message: 'Data pushed to Google Sheets successfully.', details: resText });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: 'Failed to push to Webhook: ' + err.message }, { status: 500 });
      }
    }

    if (action === 'push_student') {
      try {
        const res = await fetch(targetWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'push_student',
            sheet: body.sheet || 'SS1',
            student: body.student,
          }),
        });
        const resText = await res.text();
        return NextResponse.json({ success: true, message: 'Student pushed to Google Sheet successfully.', details: resText });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: 'Failed to push student: ' + err.message }, { status: 500 });
      }
    }

    // 2. PULL FROM GOOGLE SHEET VIA WEBHOOK (DIRECT 2D ARRAY FROM SPREADSHEET)
    if (targetWebhook) {
      try {
        const webhookRes = await fetch(targetWebhook, {
          method: 'GET',
          headers: { Accept: 'application/json,text/plain,*/*' },
          redirect: 'follow',
        });

        if (webhookRes.ok) {
          const rawData = await webhookRes.json();
          if (Array.isArray(rawData) && rawData.length > 1) {
            // First row is headers: ["N.o", "Date", "Item", "Credit", "Debit", "Remark"]
            const headerRow = (rawData[0] as any[]).map(h => String(h).toLowerCase().replace(/[\s_\.\-]/g, ''));
            const dataRows = rawData.slice(1);

            const parsed = dataRows.map((rowArr: any[], idx: number) => {
              const rowMap: Record<string, any> = {};
              headerRow.forEach((key, colIdx) => {
                rowMap[key] = rowArr[colIdx] !== undefined ? rowArr[colIdx] : '';
              });

              const serialNoRaw = rowMap['no'] || rowMap['sno'] || rowMap['serial'] || rowMap['n'] || '';
              const serial_no = serialNoRaw ? parseInt(String(serialNoRaw), 10) || null : null;

              const date = formatSheetDate(rowMap['date'] || rowMap['dated']);
              const item = String(rowMap['item'] || rowMap['particulars'] || rowMap['description'] || `Entry #${idx + 1}`).trim();

              const creditRaw = rowMap['credit'] || rowMap['income'] || '';
              const credit = creditRaw ? parseFloat(String(creditRaw).replace(/[^0-9\.]/g, '')) || null : null;

              const debitRaw = rowMap['debit'] || rowMap['expense'] || '';
              const debit = debitRaw ? parseFloat(String(debitRaw).replace(/[^0-9\.]/g, '')) || null : null;

              const remark = String(rowMap['remark'] || rowMap['remarks'] || rowMap['note'] || '').trim();

              let category = 'General';
              const itemLower = item.toLowerCase();
              if (itemLower.includes('fund') || itemLower.includes('donation')) category = 'Student Donations';
              else if (itemLower.includes('print') || itemLower.includes('ledger') || itemLower.includes('seal')) category = 'Stationery & Print';
              else if (itemLower.includes('ads') || itemLower.includes('meta')) category = 'Marketing & Ads';
              else if (itemLower.includes('godaddy') || itemLower.includes('domain') || itemLower.includes('subscription')) category = 'Subscriptions';
              else if (itemLower.includes('author') || itemLower.includes('payment')) category = 'Author Honorarium';
              else if (itemLower.includes('travel')) category = 'Travel & Conveyance';
              else if (itemLower.includes('drink') || itemLower.includes('meeting')) category = 'Hospitality';

              let payment_mode: 'Cash' | 'Fampay' | 'Bank' | 'UPI' | 'Other' = 'Cash';
              const remarkLower = remark.toLowerCase();
              if (remarkLower.includes('fampay')) payment_mode = 'Fampay';
              else if (remarkLower.includes('upi') || remarkLower.includes('gpay')) payment_mode = 'UPI';
              else if (remarkLower.includes('bank') || remarkLower.includes('transfer')) payment_mode = 'Bank';
              else if (remarkLower.includes('cash')) payment_mode = 'Cash';

              return {
                id: `sheet-${idx + 1}-${Math.random().toString(36).substring(2, 7)}`,
                serial_no,
                date,
                item,
                credit,
                debit,
                remark: remark || null,
                category,
                payment_mode,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
            }).filter((e: any) => e.item && (e.credit !== null || e.debit !== null || e.item));

            if (parsed.length > 0) {
              return NextResponse.json({
                success: true,
                count: parsed.length,
                rows: parsed,
                syncedAt: new Date().toISOString(),
                source: 'apps_script_webhook',
              });
            }
          }
        }
      } catch (webhookErr) {
        console.warn('Webhook GET failed, trying CSV export fallback:', webhookErr);
      }
    }

    // 3. FALLBACK TO CSV EXPORT ENDPOINT
    const targetSheetUrl = sheetUrl || DEFAULT_SHEET_URL;
    let fetchTargetUrl = targetSheetUrl;
    const match = targetSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      fetchTargetUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }

    const response = await fetch(fetchTargetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        Accept: 'text/csv,text/plain,*/*',
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Could not fetch Google Sheet. HTTP Status: ${response.status} (${response.statusText}).`,
      }, { status: 400 });
    }

    const csvText = await response.text();
    const workbook = XLSX.read(csvText, { type: 'string' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    const parsedEntries = rawRows.map((row, idx) => {
      const normalized: Record<string, any> = {};
      Object.entries(row).forEach(([k, v]) => {
        const cleanKey = k.toLowerCase().replace(/[\s_\.\-]/g, '');
        normalized[cleanKey] = v;
      });

      const serialNoRaw = normalized['no'] || normalized['sno'] || normalized['serial'] || normalized['n'] || '';
      const serial_no = serialNoRaw ? parseInt(String(serialNoRaw), 10) || null : null;
      const date = formatSheetDate(normalized['date'] || normalized['dated']);
      const item = String(normalized['item'] || normalized['particulars'] || normalized['description'] || `Entry #${idx + 1}`).trim();
      const creditRaw = normalized['credit'] || normalized['income'] || '';
      const credit = creditRaw ? parseFloat(String(creditRaw).replace(/[^0-9\.]/g, '')) || null : null;
      const debitRaw = normalized['debit'] || normalized['expense'] || '';
      const debit = debitRaw ? parseFloat(String(debitRaw).replace(/[^0-9\.]/g, '')) || null : null;
      const remark = String(normalized['remark'] || normalized['remarks'] || '').trim();

      return {
        id: `csv-${idx + 1}-${Math.random().toString(36).substring(2, 7)}`,
        serial_no,
        date,
        item,
        credit,
        debit,
        remark: remark || null,
        category: 'General',
        payment_mode: 'Cash' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }).filter(e => e.item);

    return NextResponse.json({
      success: true,
      count: parsedEntries.length,
      rows: parsedEntries,
      syncedAt: new Date().toISOString(),
      source: 'csv_export',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Server error syncing sheet: ' + err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sheet = searchParams.get('sheet') || 'Main';
  return NextResponse.json({
    success: true,
    sheet,
    students: [],
    message: `Sheet ${sheet} query ready.`,
  });
}
