const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvylhtbypldyttspkdal.supabase.co';
const supabaseKey = 'sb_publishable_Q4fHWUSyInCkrEMbqGlQDg_7kVRD-hB';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
  console.log('Seeding Programmes and Todos...');

  const programmes = [
    {
      id: 'b0000001-0000-0000-0000-000000000001',
      unique_code: 'CD-PRG-001',
      title: 'ChromaDiaries Youth Literature Fest 2026',
      description: 'Annual flagship youth festival: poetry recitation, author panel, and ChromaDiaries print edition release ceremony.',
      category: 'Special Programme',
      status: 'Planned',
      deadline: '2026-11-20',
      assigned_to: 'a5555555-0000-0000-0000-000000000005',
      created_by: 'a0000000-0000-0000-0000-000000000001',
      venue: 'Main Campus Auditorium & YouTube Live',
      is_paused: false,
      is_archived: false,
    },
    {
      id: 'b0000001-0000-0000-0000-000000000002',
      unique_code: 'CD-PRG-002',
      title: 'English Creative Writing & Poetry Masterclass',
      description: 'Interactive session with literary mentors on English prose, poetic meter, and magazine story editing.',
      category: 'Promotion Programme',
      status: 'Progressed',
      deadline: '2026-11-16',
      assigned_to: 'a6666666-0000-0000-0000-000000000006',
      created_by: 'a5555555-0000-0000-0000-000000000005',
      venue: 'Seminar Hall B',
      is_paused: false,
      is_archived: false,
    },
    {
      id: 'b0000001-0000-0000-0000-000000000003',
      unique_code: 'CD-PRG-003',
      title: 'Viral Literary Reel & Micro-Story Trend Series',
      description: 'Social media reel challenge highlighting youth flash fiction, reader reactions, and trending audio narratives.',
      category: 'Trend Programme',
      status: 'Scheduled',
      deadline: '2026-11-25',
      assigned_to: 'a6666666-0000-0000-0000-000000000006',
      created_by: 'a0000000-0000-0000-0000-000000000001',
      venue: 'Instagram & YouTube Shorts Studio',
      is_paused: false,
      is_archived: false,
    },
    {
      id: 'b0000001-0000-0000-0000-000000000004',
      unique_code: 'CD-PRG-004',
      title: 'Chroma Youth Outreach & Inter-School Book Drive',
      description: 'Connecting literary clubs and book donors across 12 institutions for student library book contributions.',
      category: 'Promotion Programme',
      status: 'Completed',
      deadline: '2026-11-05',
      assigned_to: 'a5555555-0000-0000-0000-000000000005',
      created_by: 'a0000000-0000-0000-0000-000000000001',
      venue: 'District High Schools Network',
      is_paused: false,
      is_archived: false,
    },
    {
      id: 'b0000001-0000-0000-0000-000000000005',
      unique_code: 'CD-PRG-005',
      title: 'Winter Annual Editorial Symposium & Writers Gala',
      description: 'Gathering of magazine writers, columnists, and reviewers to plan next year’s publication roadmaps.',
      category: 'Other Programme',
      status: 'Pending',
      deadline: '2026-12-15',
      assigned_to: 'a5555555-0000-0000-0000-000000000005',
      created_by: 'a0000000-0000-0000-0000-000000000001',
      venue: 'ChromaDiaries Conference Suite',
      is_paused: false,
      is_archived: false,
    },
  ];

  const { error: prgErr } = await supabase.from('programmes').upsert(programmes);
  if (prgErr) console.error('Prg Err:', prgErr.message);
  else console.log('Programmes seeded!');

  // Tasks
  const programmeTasks = [
    {
      id: 'b1000001-0000-0000-0000-000000000001',
      programme_id: 'b0000001-0000-0000-0000-000000000001',
      title: 'Confirm auditorium booking & AV stage lights',
      description: 'Finalize auditorium permit with administration and test acoustic speakers & stage mics.',
      assigned_to: 'a5555555-0000-0000-0000-000000000005',
      priority: 'Urgent',
      deadline: '2026-11-12',
      status: 'Completed',
    },
    {
      id: 'b1000001-0000-0000-0000-000000000002',
      programme_id: 'b0000001-0000-0000-0000-000000000001',
      title: 'Send formal invitation letters to 4 guest authors',
      description: 'Draft official invitation emails with docket schedule, honorarium details, and travel allowance.',
      assigned_to: 'a5555555-0000-0000-0000-000000000005',
      priority: 'High',
      deadline: '2026-11-14',
      status: 'Completed',
    },
    {
      id: 'b1000001-0000-0000-0000-000000000003',
      programme_id: 'b0000001-0000-0000-0000-000000000001',
      title: 'Print magazine commemorative edition copies',
      description: 'Coordinate with print press for 250 deluxe copies of the literary edition.',
      assigned_to: 'a6666666-0000-0000-0000-000000000006',
      priority: 'High',
      deadline: '2026-11-18',
      status: 'In Progress',
    },
    {
      id: 'b1000001-0000-0000-0000-000000000004',
      programme_id: 'b0000001-0000-0000-0000-000000000001',
      title: 'Assign student volunteer anchors and stage hosts',
      description: 'Brief the master of ceremonies, reception greeting squad, and timekeepers.',
      assigned_to: 'a6666666-0000-0000-0000-000000000006',
      priority: 'Medium',
      deadline: '2026-11-19',
      status: 'Pending',
    },
  ];

  const { error: ptskErr } = await supabase.from('programme_tasks').upsert(programmeTasks);
  if (ptskErr) console.error('Ptsk Err:', ptskErr.message);
  else console.log('Programme tasks seeded!');

  // Notes
  const programmeNotes = [
    {
      id: 'b2000001-0000-0000-0000-000000000001',
      programme_id: 'b0000001-0000-0000-0000-000000000001',
      title: 'Executive Concept & Stage Run-of-Show',
      content: '# ChromaDiaries Youth Literature Fest 2026\n## Concept & Objectives\nTo celebrate student creative writing, honour magazine contributors, and launch our printed commemorative edition.',
      author_id: 'a5555555-0000-0000-0000-000000000005',
      author_name: 'Program Coordinator Admin',
    },
  ];

  const { error: pnoteErr } = await supabase.from('programme_notes').upsert(programmeNotes);
  if (pnoteErr) console.error('Pnote Err:', pnoteErr.message);
  else console.log('Programme notes seeded!');

  // Guests
  const programmeGuests = [
    {
      id: 'b3000001-0000-0000-0000-000000000001',
      programme_id: 'b0000001-0000-0000-0000-000000000001',
      full_name: 'Dr. Tariq Al-Hashimi',
      designation: 'Renowned Author & Literary Critic',
      organization: 'Kerala Sahitya Akademi Advisory Board',
      phone: '+91 94471 22334',
      email: 'tariq.hashimi@litfest.org',
      category: 'Chief Guest',
      invitation_status: 'Confirmed',
      confirmation_status: 'Confirmed',
      special_requirements: 'Needs projector display for visual reading and translation headset',
      notes: 'Keynote lecture on Contemporary Youth Voices',
    },
  ];

  const { error: pguestErr } = await supabase.from('programme_guests').upsert(programmeGuests);
  if (pguestErr) console.error('Pguest Err:', pguestErr.message);
  else console.log('Programme guests seeded!');

  // Candidates
  const programmeCandidates = [
    {
      id: 'b4000001-0000-0000-0000-000000000001',
      programme_id: 'b0000001-0000-0000-0000-000000000001',
      full_name: 'Fatima Zahra K.',
      phone: '+91 98950 11223',
      email: 'fatima.zahra@collegemail.edu',
      institution: 'Farook College (Autonomous)',
      category: 'Poetry Recitation & Slam Contest',
      selection_status: 'Selected',
      remarks: 'Shortlisted with first rank in collegiate preliminary round',
    },
  ];

  const { error: pcandErr } = await supabase.from('programme_candidates').upsert(programmeCandidates);
  if (pcandErr) console.error('Pcand Err:', pcandErr.message);
  else console.log('Programme candidates seeded!');

  // Participants
  const programmeParticipants = [
    {
      id: 'b5000001-0000-0000-0000-000000000001',
      programme_id: 'b0000001-0000-0000-0000-000000000001',
      full_name: 'Nabil Mohammed',
      phone: '+91 97450 33445',
      institution_or_class: 'SS2 Literature Batch A',
      registration_id: 'REG-2026-088',
      attendance_status: 'Confirmed',
      notes: 'Registered for both afternoon writing clinic and evening gala',
    },
  ];

  const { error: ppartErr } = await supabase.from('programme_participants').upsert(programmeParticipants);
  if (ppartErr) console.error('Ppart Err:', ppartErr.message);
  else console.log('Programme participants seeded!');

  // Activities
  const programmeActivities = [
    {
      id: 'b6000001-0000-0000-0000-000000000001',
      programme_id: 'b0000001-0000-0000-0000-000000000001',
      action: 'Programme Created',
      user_name: 'Admin',
      details: 'Programme "ChromaDiaries Youth Literature Fest 2026" (CD-PRG-001) was initiated.',
    },
  ];

  const { error: pactErr } = await supabase.from('programme_activities').upsert(programmeActivities);
  if (pactErr) console.error('Pact Err:', pactErr.message);
  else console.log('Programme activities seeded!');

  // Workspace Todos
  const todos = [
    {
      id: 'c0000001-0000-0000-0000-000000000001',
      title: 'Review submitted literature entries for upcoming issue',
      description: 'Check prose, poem, and review submissions against style guide and typography standards.',
      assigned_to: 'a1111111-0000-0000-0000-000000000001',
      assigned_by: 'a0000000-0000-0000-0000-000000000001',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      priority: 'high',
      status: 'pending',
      due_date: '2026-11-14',
    },
    {
      id: 'c0000001-0000-0000-0000-000000000002',
      title: 'Finalize English Programe schedule and speaker list',
      description: 'Coordinate with literary club mentors for dates and topic confirmations.',
      assigned_to: 'a5555555-0000-0000-0000-000000000005',
      assigned_by: 'a0000000-0000-0000-0000-000000000001',
      department_id: 'd5555555-5555-5555-5555-555555555555',
      priority: 'high',
      status: 'pending',
      due_date: '2026-11-15',
    },
    {
      id: 'c0000001-0000-0000-0000-000000000003',
      title: 'Follow up on pending donation collections for SS1 & SS2',
      description: 'Check receipt status for students with partial or pending balances.',
      assigned_to: 'a7777777-0000-0000-0000-000000000007',
      assigned_by: 'a0000000-0000-0000-0000-000000000001',
      department_id: 'd6666666-6666-6666-6666-666666666666',
      priority: 'medium',
      status: 'completed',
      due_date: '2026-11-10',
    },
  ];

  const { error: todoErr } = await supabase.from('workspace_todos').upsert(todos);
  if (todoErr) console.error('Todo Err:', todoErr.message);
  else console.log('Workspace todos seeded!');

  console.log('Seeding complete!');
}

runSeed();
