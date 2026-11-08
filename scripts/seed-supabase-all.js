const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvylhtbypldyttspkdal.supabase.co';
const supabaseKey = 'sb_publishable_Q4fHWUSyInCkrEMbqGlQDg_7kVRD-hB';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
  console.log('Seeding Supabase...');

  // 1. Programme Categories
  const categories = [
    { id: 'pcat-1', name: 'Promotion Programme', color: '#3b82f6', is_active: true, display_order: 1 },
    { id: 'pcat-2', name: 'Trend Programme', color: '#8b5cf6', is_active: true, display_order: 2 },
    { id: 'pcat-3', name: 'Special Programme', color: '#ec4899', is_active: true, display_order: 3 },
    { id: 'pcat-4', name: 'Other Programme', color: '#10b981', is_active: true, display_order: 4 },
  ];
  const { error: catErr } = await supabase.from('programme_categories').upsert(categories);
  if (catErr) console.error('Cat err:', catErr.message);
  else console.log('Programme categories seeded!');

  // 2. Programme Statuses
  const statuses = [
    { id: 'pstat-1', name: 'Pending', color: '#94a3b8', counts_as_progress: false, counts_as_completed: false, is_active: true, display_order: 1 },
    { id: 'pstat-2', name: 'Planned', color: '#38bdf8', counts_as_progress: true, counts_as_completed: false, is_active: true, display_order: 2 },
    { id: 'pstat-3', name: 'Progressed', color: '#6366f1', counts_as_progress: true, counts_as_completed: false, is_active: true, display_order: 3 },
    { id: 'pstat-4', name: 'Scheduled', color: '#f59e0b', counts_as_progress: true, counts_as_completed: false, is_active: true, display_order: 4 },
    { id: 'pstat-5', name: 'Completed', color: '#10b981', counts_as_progress: false, counts_as_completed: true, is_active: true, display_order: 5 },
  ];
  const { error: statErr } = await supabase.from('programme_statuses').upsert(statuses);
  if (statErr) console.error('Stat err:', statErr.message);
  else console.log('Programme statuses seeded!');

  // 3. Money Holdings
  const holdings = [
    { account_name: 'Bank Balance', account_type: 'bank', balance: 3655, custodian_name: 'Treasurer' },
    { account_name: 'Manager By Hand', account_type: 'cash_in_hand', balance: 1000, custodian_name: 'General Manager' },
    { account_name: 'Debt Account', account_type: 'debt', balance: 1000, custodian_name: 'Accounts Receivable' },
  ];
  const { error: holdErr } = await supabase.from('money_holdings').insert(holdings);
  if (holdErr) console.error('Hold err:', holdErr.message);
  else console.log('Money holdings seeded!');

  // 4. Ledger Entries
  const ledger = [
    { serial_no: 1, date: '03-06-2026', item: 'Party Fund', credit: 4950, debit: null, remark: 'Cash received', category: 'General', payment_mode: 'Cash' },
    { serial_no: 2, date: '06-07-2026', item: '250 Donation Fund', credit: 7320, debit: null, remark: 'Cash donation received', category: 'Student Donations', payment_mode: 'Cash' },
    { serial_no: 3, date: '07-07-2026', item: 'Ledger Purchase', credit: null, debit: 172, remark: 'Cash Paid', category: 'Stationery & Print', payment_mode: 'Cash' },
    { serial_no: null, date: '07-07-2026', item: 'Travel', credit: null, debit: 60, remark: 'Cash Paid', category: 'Travel & Conveyance', payment_mode: 'Cash' },
    { serial_no: 4, date: '09-07-2026', item: 'Seal Purchase', credit: null, debit: 400, remark: 'Cash Paid', category: 'Stationery & Print', payment_mode: 'Cash' },
    { serial_no: null, date: '09-07-2026', item: 'Travel', credit: null, debit: 60, remark: 'Cash Paid', category: 'Travel & Conveyance', payment_mode: 'Cash' },
    { serial_no: 5, date: '02-09-2026', item: 'A3 Print', credit: null, debit: 30, remark: 'Cash Paid', category: 'Stationery & Print', payment_mode: 'Cash' },
    { serial_no: 6, date: '07-09-2026', item: 'Drinks for Meeting (Tilo)', credit: null, debit: 400, remark: 'Cash Paid', category: 'Hospitality', payment_mode: 'Cash' },
    { serial_no: 7, date: '24-09-2026', item: 'Meta Ads Charge', credit: null, debit: 227, remark: 'By Fampay', category: 'Marketing & Ads', payment_mode: 'Fampay' },
    { serial_no: 8, date: '28-09-2026', item: 'Email Domain by GoDaddy', credit: null, debit: 175, remark: 'By Fampay', category: 'Subscriptions', payment_mode: 'Fampay' },
    { serial_no: 9, date: '01-10-2026', item: 'Author Payment (AU-Paid-001)', credit: null, debit: 200, remark: 'By Fampay', category: 'Author Honorarium', payment_mode: 'Fampay' },
    { serial_no: 10, date: '01-10-2026', item: 'Author Payment (AU-Paid-002)', credit: null, debit: 100, remark: 'By Fampay', category: 'Author Honorarium', payment_mode: 'Fampay' },
    { serial_no: 11, date: '06-11-2026', item: 'ChromaDiaries Godaddy Subscription (2026)', credit: null, debit: 1060.82, remark: 'Godaddy annual renewal', category: 'Subscriptions', payment_mode: 'Bank' },
    { serial_no: null, date: '06-11-2026', item: 'Jalal, faheem 100', credit: 300, debit: 4950, remark: 'Partial reconciliation', category: 'Student Donations', payment_mode: 'Cash' },
    { serial_no: null, date: '06-11-2026', item: '975,1028,1198,pc,1027', credit: 750, debit: null, remark: 'Batch student collections', category: 'Student Donations', payment_mode: 'Cash' },
    { serial_no: null, date: '06-11-2026', item: 'naseef book', credit: 200, debit: null, remark: 'Book purchase deposit', category: 'General', payment_mode: 'Cash' },
  ];
  const { error: ledErr } = await supabase.from('ledger_entries').insert(ledger);
  if (ledErr) console.error('Ledger err:', ledErr.message);
  else console.log('Ledger entries seeded!');

  // 5. Seed SS1 & SS2 Student Donations
  const rawSS1 = [
    { no: 1, ad: 1008, name: 'MUHAMMED MINHAJ.KT', amt: 250, paid: 250, status: 'Added' },
    { no: 2, ad: 1013, name: 'MOHAMMED SAHAD', amt: 250, paid: 250, status: 'Added' },
    { no: 3, ad: 1024, name: 'FADHIL KP', amt: 250, paid: 0, status: 'Added' },
    { no: 4, ad: 1040, name: 'MOHAMMED RIFAD.K', amt: 250, paid: 100, status: 'Added' },
    { no: 5, ad: 1050, name: 'MUHAMMED SINAN. PC', amt: 250, paid: 0, status: 'Added' },
    { no: 6, ad: 1051, name: 'MUHAMMED HISHAM T', amt: 250, paid: 0, status: 'Added' },
    { no: 7, ad: 1053, name: 'AMEEN T', amt: 250, paid: 250, status: 'Added' },
    { no: 8, ad: 1056, name: 'MUHAMMED SHADIN NM', amt: 250, paid: 250, status: 'Added' },
    { no: 9, ad: 1058, name: 'MUHAMMED JALAL .AT', amt: 250, paid: 200, status: 'Not Added' },
    { no: 10, ad: 1059, name: 'AFSAL', amt: 250, paid: 0, status: 'Added' },
    { no: 11, ad: 1063, name: 'MOHAMMED RISHADH.T', amt: 250, paid: 250, status: 'Added' },
    { no: 12, ad: 1064, name: 'MOHAMED SHAMIL.M', amt: 250, paid: 0, status: 'Added' },
    { no: 13, ad: 1066, name: 'HASHIM MOHAMED KP', amt: 250, paid: 250, status: 'Added' },
    { no: 14, ad: 1068, name: 'MUHAMMED UVAIS EK', amt: 250, paid: 0, status: 'Added' },
    { no: 15, ad: 1070, name: 'MUHAMMED MUZAMMIL .BK', amt: 250, paid: 250, status: 'Added' },
    { no: 16, ad: 1071, name: 'SAYYID ZUHAIR', amt: 250, paid: 0, status: 'Added' },
    { no: 17, ad: 1072, name: 'MOHAMMED SINAN TP', amt: 250, paid: 0, status: 'Added' },
    { no: 18, ad: 1073, name: 'MUHAMMED MUSTHAFA', amt: 250, paid: 0, status: 'Added' },
    { no: 19, ad: 1074, name: 'MUAD.M', amt: 250, paid: 0, status: 'Added' },
    { no: 20, ad: 1075, name: 'MUHAMMED HASHIM.P', amt: 250, paid: 0, status: 'Added' },
    { no: 21, ad: 1076, name: 'MUHAMMED MINHAJ KK', amt: 250, paid: 0, status: 'Added' },
    { no: 22, ad: 1078, name: 'MUHAMMED RABIEUE', amt: 250, paid: 250, status: 'Added' },
    { no: 23, ad: 1082, name: 'MOHAMED SANEEN P', amt: 250, paid: 250, status: 'Added' },
    { no: 24, ad: 1084, name: 'ASIM MOHAMED', amt: 250, paid: 250, status: 'Added' },
    { no: 25, ad: 1085, name: 'MUHAMMED NAFIH', amt: 250, paid: 0, status: 'Added' },
    { no: 26, ad: 1086, name: 'MOHAMMED NIDAL', amt: 250, paid: 0, status: 'Added' },
    { no: 27, ad: 1087, name: 'MUHAMMED SHAMIL.A', amt: 250, paid: 0, status: 'Added' },
    { no: 28, ad: 1088, name: 'MOHAMMED NAEEM K', amt: 250, paid: 250, status: 'Added' },
    { no: 29, ad: 1090, name: 'MUHAMMED BASSAM', amt: 250, paid: 250, status: 'Added' },
  ];

  const rawSS2 = [
    { no: 1, ad: 970, name: 'ABDUL BASIT PARAMBADEN', amt: 250, paid: 0, status: 'Added' },
    { no: 2, ad: 975, name: 'MUHAMMED SANIH EK', amt: 250, paid: 120, status: 'Added' },
    { no: 3, ad: 998, name: 'MUHAMMED RINSHAD P', amt: 250, paid: 0, status: 'Added' },
    { no: 4, ad: 1004, name: 'MUHAMMED VASIL CS', amt: 250, paid: 250, status: 'Added' },
    { no: 5, ad: 1005, name: 'MUHAMMED SINAN MK', amt: 250, paid: 250, status: 'Added' },
    { no: 6, ad: 1006, name: 'AFLAH AHAMMED C', amt: 250, paid: 0, status: 'Added' },
    { no: 7, ad: 1010, name: 'SHABEER ALI PV', amt: 250, paid: 250, status: 'Added' },
    { no: 8, ad: 1012, name: 'MOHAMMED RUBAIB OP', amt: 250, paid: 250, status: 'Added' },
    { no: 9, ad: 1016, name: 'ABDUL NAFIH KOTTAMBARA', amt: 250, paid: 0, status: 'Added' },
    { no: 10, ad: 1018, name: 'MUHAMMED AJUMAL', amt: 250, paid: 250, status: 'Added' },
    { no: 11, ad: 1019, name: 'MOHAMMED IHSAN C', amt: 250, paid: 0, status: 'Added' },
    { no: 12, ad: 1021, name: 'AHMED JURAIJ KT', amt: 250, paid: 0, status: 'Added' },
    { no: 13, ad: 1022, name: 'MUHAMMAD NASEEF K', amt: 250, paid: 100, status: 'Added' },
    { no: 14, ad: 1023, name: 'ABDUL BASITH KK', amt: 250, paid: 250, status: 'Added' },
    { no: 15, ad: 1025, name: 'MUHAMMED ASLAH PALASSERI', amt: 250, paid: 250, status: 'Added' },
    { no: 16, ad: 1026, name: 'MUHAMMED RABEEH T', amt: 250, paid: 0, status: 'Added' },
    { no: 17, ad: 1028, name: 'SHINAS MOHAMED', amt: 250, paid: 250, status: 'Added' },
    { no: 18, ad: 1030, name: 'NIHAL ABOOBACKER', amt: 250, paid: 250, status: 'Added' },
    { no: 19, ad: 1031, name: 'MUHAMMAD SAHAL N', amt: 250, paid: 250, status: 'Added' },
    { no: 20, ad: 1033, name: 'MUHAMMED SHAJEEH POOKODAN', amt: 250, paid: 0, status: 'Added' },
    { no: 21, ad: 1035, name: 'MUHAMMED SABEEH MK', amt: 250, paid: 250, status: 'Added' },
    { no: 22, ad: 1036, name: 'SABEEH AHMAD NK', amt: 250, paid: 250, status: 'Added' },
    { no: 23, ad: 1037, name: 'MUHAMMED SHIFIN M', amt: 250, paid: 250, status: 'Added' },
    { no: 24, ad: 1038, name: 'MUHAMMED SALIM KP', amt: 250, paid: 0, status: 'Added' },
    { no: 25, ad: 1039, name: 'SALMAN NASOOH NANATH', amt: 250, paid: 250, status: 'Added' },
    { no: 26, ad: 1041, name: 'MUHAMMED SHAMMAS', amt: 250, paid: 0, status: 'Added' },
    { no: 27, ad: 1168, name: 'MOHAMMED HITHBAN P', amt: 250, paid: 0, status: 'Added' },
    { no: 28, ad: 1211, name: 'MUHAMMED MUNAVVAR', amt: 250, paid: 250, status: 'Added' },
    { no: 29, ad: 1223, name: 'MUHAMMED FAHEEM THEKKAN', amt: 250, paid: 250, status: 'Added' },
  ];

  const studentRows = [
    ...rawSS1.map((d) => ({
      serial_no: d.no,
      admission_no: String(d.ad),
      student_name: d.name,
      student_id: `AD-${d.ad}`,
      sheet_name: 'SS1',
      batch_or_class: 'SS1 Batch',
      pledged_amount: d.amt,
      collected_amount: d.paid,
      balance: Math.max(0, d.amt - d.paid),
      addition_status: d.status,
      status: d.paid >= d.amt ? 'paid' : d.paid > 0 ? 'partial' : 'pending',
      payment_mode: d.paid > 0 ? 'Cash' : null,
      receipt_no: d.paid > 0 ? `REC-SS1-${d.ad}` : null,
      date: '2026-07-06',
      remarks: d.status === 'Not Added' ? 'Pending addition to ledger' : 'Verified donation record',
    })),
    ...rawSS2.map((d) => ({
      serial_no: d.no,
      admission_no: String(d.ad),
      student_name: d.name,
      student_id: `AD-${d.ad}`,
      sheet_name: 'SS2',
      batch_or_class: 'SS2 Batch',
      pledged_amount: d.amt,
      collected_amount: d.paid,
      balance: Math.max(0, d.amt - d.paid),
      addition_status: d.status,
      status: d.paid >= d.amt ? 'paid' : d.paid > 0 ? 'partial' : 'pending',
      payment_mode: d.paid > 0 ? 'Cash' : null,
      receipt_no: d.paid > 0 ? `REC-SS2-${d.ad}` : null,
      date: '2026-07-06',
      remarks: d.status === 'Not Added' ? 'Pending addition to ledger' : 'Verified donation record',
    })),
  ];

  const { error: stuErr } = await supabase.from('student_donations').insert(studentRows);
  if (stuErr) console.error('Student err:', stuErr.message);
  else console.log(`Seeded ${studentRows.length} student donations into Supabase!`);
}

runSeed();
