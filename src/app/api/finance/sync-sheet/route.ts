import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'pull', sheetUrl, csvUrl, webhookUrl, rows } = body;

    // 1. PUSH TO GOOGLE APPS SCRIPT WEBHOOK
    if (action === 'push') {
      const targetUrl = webhookUrl || sheetUrl;
      if (!targetUrl || !targetUrl.startsWith('http')) {
        return NextResponse.json({ success: false, error: 'A valid Google Apps Script Webhook URL is required to push data directly to Google Sheets.' }, { status: 400 });
      }

      try {
        const res = await fetch(targetUrl, {
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

    // 2. PULL FROM GOOGLE SHEET (VIA CSV EXPORT OR PUBLIC CSV URL)
    let fetchTargetUrl = csvUrl;

    if (!fetchTargetUrl && sheetUrl) {
      // Extract Google Sheet ID from standard URL: https://docs.google.com/spreadsheets/d/<ID>/edit
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        const sheetId = match[1];
        fetchTargetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      } else if (sheetUrl.startsWith('http')) {
        fetchTargetUrl = sheetUrl;
      }
    }

    if (!fetchTargetUrl) {
      return NextResponse.json({ success: false, error: 'Please provide a valid Google Sheet URL or published CSV link.' }, { status: 400 });
    }

    const response = await fetch(fetchTargetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept': 'text/csv,text/plain,*/*',
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Could not fetch Google Sheet. HTTP Status: ${response.status} (${response.statusText}). Make sure your sheet is shared with "Anyone with the link can view" or published via File > Share > Publish to web.`,
      }, { status: 400 });
    }

    const csvText = await response.text();
    if (!csvText || !csvText.trim()) {
      return NextResponse.json({ success: false, error: 'The retrieved Google Sheet is empty.' }, { status: 400 });
    }

    // Parse CSV into rows using xlsx
    const workbook = XLSX.read(csvText, { type: 'string' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ success: false, error: 'No data rows found in the sheet.' }, { status: 400 });
    }

    // Normalize keys:
    // N.o, Date, Item, Credit, Debit, Remark
    const parsedEntries = rawRows.map((row, idx) => {
      const normalized: Record<string, any> = {};
      Object.entries(row).forEach(([k, v]) => {
        const cleanKey = k.toLowerCase().replace(/[\s_\.\-]/g, '');
        normalized[cleanKey] = v;
      });

      const serialNoRaw = normalized['no'] || normalized['sno'] || normalized['serial'] || normalized['n'] || '';
      const serial_no = serialNoRaw ? parseInt(serialNoRaw, 10) || null : null;

      const dateRaw = (normalized['date'] || normalized['dated'] || normalized['datetime'] || '').toString().trim();
      
      const item = (normalized['item'] || normalized['description'] || normalized['particulars'] || normalized['title'] || `Entry #${idx + 1}`).toString().trim();

      const creditRaw = normalized['credit'] || normalized['income'] || normalized['in'] || '';
      const credit = creditRaw ? parseFloat(creditRaw.toString().replace(/[^0-9\.]/g, '')) || null : null;

      const debitRaw = normalized['debit'] || normalized['expense'] || normalized['out'] || '';
      const debit = debitRaw ? parseFloat(debitRaw.toString().replace(/[^0-9\.]/g, '')) || null : null;

      const remark = (normalized['remark'] || normalized['remarks'] || normalized['note'] || normalized['notes'] || normalized['mode'] || '').toString().trim();

      // Guess category
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
        id: `sheet-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        serial_no,
        date: dateRaw || new Date().toISOString().split('T')[0],
        item,
        credit,
        debit,
        remark: remark || null,
        category,
        payment_mode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }).filter(e => e.item && (e.credit !== null || e.debit !== null || e.item));

    return NextResponse.json({
      success: true,
      count: parsedEntries.length,
      rows: parsedEntries,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Server error syncing sheet: ' + err.message }, { status: 500 });
  }
}
