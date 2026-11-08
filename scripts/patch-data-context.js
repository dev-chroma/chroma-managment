const fs = require('fs');

let file = fs.readFileSync('src/lib/context/data-context.tsx', 'utf8');

// Patch syncStudentDonationsFromSheet to write to Supabase
const targetSyncDonations = `      if (data.students && Array.isArray(data.students) && data.students.length > 0) {
        setStudentDonations((prev) => {
          const otherStudents = prev.filter((s) => s.sheet_name !== sheetName);
          const updated = [...otherStudents, ...data.students];
          if (typeof window !== 'undefined') {
            localStorage.setItem('chromadiaries_student_donations', JSON.stringify(updated));
          }
          return updated;
        });
        return { success: true, count: data.students.length };
      }`;

const replaceSyncDonations = `      if (data.students && Array.isArray(data.students) && data.students.length > 0) {
        setStudentDonations((prev) => {
          const otherStudents = prev.filter((s) => s.sheet_name !== sheetName);
          const updated = [...otherStudents, ...data.students];
          if (typeof window !== 'undefined') {
            localStorage.setItem('chromadiaries_student_donations', JSON.stringify(updated));
          }
          return updated;
        });

        if (isSupabaseConfigured()) {
          const supabase = createClient();
          if (supabase) {
            supabase.from('student_donations').delete().eq('sheet_name', sheetName).then(() => {
              supabase.from('student_donations').insert(data.students).then(({ error }) => {
                if (error) console.error('Supabase student_donations sync error:', error);
              });
            });
          }
        }

        return { success: true, count: data.students.length };
      }`;

if (file.includes(targetSyncDonations)) {
  file = file.replace(targetSyncDonations, replaceSyncDonations);
  console.log('Patched syncStudentDonationsFromSheet');
} else {
  console.warn('Could not find targetSyncDonations');
}

// Patch addTodo
const targetAddTodo = `    setTodos((prev) => {
      const updated = [newTodo, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_workspace_todos', JSON.stringify(updated));
      }
      return updated;
    });
    return newTodo;`;

const replaceAddTodo = `    setTodos((prev) => {
      const updated = [newTodo, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_workspace_todos', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { assignee: _a, creator: _c, ...dbPayload } = newTodo;
        supabase.from('workspace_todos').insert([dbPayload]).then(({ error }) => {
          if (error) console.error('Supabase addTodo error:', error);
        });
      }
    }

    return newTodo;`;

if (file.includes(targetAddTodo)) {
  file = file.replace(targetAddTodo, replaceAddTodo);
  console.log('Patched addTodo');
}

// Patch updateTodo
const targetUpdateTodo = `  const updateTodo = async (id: string, updates: Partial<WorkspaceTodo>): Promise<boolean> => {
    setTodos((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_workspace_todos', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };`;

const replaceUpdateTodo = `  const updateTodo = async (id: string, updates: Partial<WorkspaceTodo>): Promise<boolean> => {
    setTodos((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_workspace_todos', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { assignee: _a, creator: _c, ...dbPayload } = updates as any;
        supabase.from('workspace_todos').update({ ...dbPayload, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateTodo error:', error);
        });
      }
    }

    return true;
  };`;

if (file.includes(targetUpdateTodo)) {
  file = file.replace(targetUpdateTodo, replaceUpdateTodo);
  console.log('Patched updateTodo');
}

// Patch deleteTodo
const targetDeleteTodo = `  const deleteTodo = async (id: string): Promise<boolean> => {
    setTodos((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_workspace_todos', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };`;

const replaceDeleteTodo = `  const deleteTodo = async (id: string): Promise<boolean> => {
    setTodos((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_workspace_todos', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('workspace_todos').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteTodo error:', error);
        });
      }
    }

    return true;
  };`;

if (file.includes(targetDeleteTodo)) {
  file = file.replace(targetDeleteTodo, replaceDeleteTodo);
  console.log('Patched deleteTodo');
}

// Patch toggleTodoStatus
const targetToggleTodo = `  const toggleTodoStatus = async (id: string): Promise<boolean> => {
    setTodos((prev) => {
      const updated: WorkspaceTodo[] = prev.map((t) => {
        if (t.id === id) {
          const nextStatus: 'pending' | 'completed' = t.status === 'completed' ? 'pending' : 'completed';
          return { ...t, status: nextStatus, updated_at: new Date().toISOString() };
        }
        return t;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_workspace_todos', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };`;

const replaceToggleTodo = `  const toggleTodoStatus = async (id: string): Promise<boolean> => {
    let nextStatus: 'pending' | 'completed' = 'completed';
    setTodos((prev) => {
      const updated: WorkspaceTodo[] = prev.map((t) => {
        if (t.id === id) {
          nextStatus = t.status === 'completed' ? 'pending' : 'completed';
          return { ...t, status: nextStatus, updated_at: new Date().toISOString() };
        }
        return t;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_workspace_todos', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('workspace_todos').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase toggleTodoStatus error:', error);
        });
      }
    }

    return true;
  };`;

if (file.includes(targetToggleTodo)) {
  file = file.replace(targetToggleTodo, replaceToggleTodo);
  console.log('Patched toggleTodoStatus');
}

// Patch addProgramme
const targetAddPrg = `    addProgrammeActivity({
      programme_id: newProgramme.id,
      action: 'Programme Created',
      user_name: user?.full_name || 'Admin',
      details: \`Programme "\${newProgramme.title}" (\${newProgramme.unique_code}) was initiated.\`,
    });

    return newProgramme;`;

const replaceAddPrg = `    addProgrammeActivity({
      programme_id: newProgramme.id,
      action: 'Programme Created',
      user_name: user?.full_name || 'Admin',
      details: \`Programme "\${newProgramme.title}" (\${newProgramme.unique_code}) was initiated.\`,
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { assignee: _a, creator: _c, ...dbPayload } = newProgramme;
        supabase.from('programmes').insert([dbPayload]).then(({ error }) => {
          if (error) console.error('Supabase addProgramme error:', error);
        });
      }
    }

    return newProgramme;`;

if (file.includes(targetAddPrg)) {
  file = file.replace(targetAddPrg, replaceAddPrg);
  console.log('Patched addProgramme');
}

// Patch updateProgramme
const targetUpdatePrg = `    if (updates.status) {
      addProgrammeActivity({
        programme_id: id,
        action: 'Status Changed',
        user_name: user?.full_name || 'Admin',
        details: \`Status transitioned to "\${updates.status}".\`,
      });
    }

    return true;`;

const replaceUpdatePrg = `    if (updates.status) {
      addProgrammeActivity({
        programme_id: id,
        action: 'Status Changed',
        user_name: user?.full_name || 'Admin',
        details: \`Status transitioned to "\${updates.status}".\`,
      });
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { assignee: _a, creator: _c, ...dbPayload } = updates as any;
        supabase.from('programmes').update({ ...dbPayload, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateProgramme error:', error);
        });
      }
    }

    return true;`;

if (file.includes(targetUpdatePrg)) {
  file = file.replace(targetUpdatePrg, replaceUpdatePrg);
  console.log('Patched updateProgramme');
}

// Patch deleteProgramme
const targetDeletePrg = `  const deleteProgramme = async (id: string): Promise<boolean> => {
    setProgrammes((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programmes', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };`;

const replaceDeletePrg = `  const deleteProgramme = async (id: string): Promise<boolean> => {
    setProgrammes((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programmes', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programmes').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteProgramme error:', error);
        });
      }
    }

    return true;
  };`;

if (file.includes(targetDeletePrg)) {
  file = file.replace(targetDeletePrg, replaceDeletePrg);
  console.log('Patched deleteProgramme');
}

// Patch toggleProgrammePause
const targetPausePrg = `    addProgrammeActivity({
      programme_id: id,
      action: newPaused ? 'Programme Paused' : 'Programme Resumed',
      user_name: user?.full_name || 'Admin',
      details: newPaused ? 'Programme was placed on temporary hold.' : 'Programme was resumed.',
    });

    return true;`;

const replacePausePrg = `    addProgrammeActivity({
      programme_id: id,
      action: newPaused ? 'Programme Paused' : 'Programme Resumed',
      user_name: user?.full_name || 'Admin',
      details: newPaused ? 'Programme was placed on temporary hold.' : 'Programme was resumed.',
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programmes').update({ is_paused: newPaused, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase toggleProgrammePause error:', error);
        });
      }
    }

    return true;`;

if (file.includes(targetPausePrg)) {
  file = file.replace(targetPausePrg, replacePausePrg);
  console.log('Patched toggleProgrammePause');
}

// Patch addProgrammeTask, updateProgrammeTask, deleteProgrammeTask, toggleProgrammeTaskStatus
const targetTasks = `  const addProgrammeTask = async (taskData: Omit<ProgrammeTask, 'id' | 'created_at'>): Promise<ProgrammeTask> => {
    const newTask: ProgrammeTask = {
      ...taskData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setProgrammeTasks((prev) => {
      const updated = [...prev, newTask];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_tasks', JSON.stringify(updated));
      }
      return updated;
    });
    addProgrammeActivity({
      programme_id: newTask.programme_id,
      action: 'Task Added',
      user_name: user?.full_name || 'Admin',
      details: \`New task "\${newTask.title}" added with \${newTask.priority} priority.\`,
    });
    return newTask;
  };

  const updateProgrammeTask = async (id: string, updates: Partial<ProgrammeTask>): Promise<boolean> => {
    setProgrammeTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_tasks', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };

  const deleteProgrammeTask = async (id: string): Promise<boolean> => {
    setProgrammeTasks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_tasks', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };

  const toggleProgrammeTaskStatus = async (id: string): Promise<boolean> => {
    let pId = '';
    let newStatus: 'Pending' | 'In Progress' | 'Completed' = 'Completed';
    setProgrammeTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id === id) {
          pId = t.programme_id;
          newStatus = t.status === 'Completed' ? 'Pending' : 'Completed';
          return { ...t, status: newStatus, updated_at: new Date().toISOString() };
        }
        return t;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_tasks', JSON.stringify(updated));
      }
      return updated;
    });
    if (pId) {
      addProgrammeActivity({
        programme_id: pId,
        action: 'Task Status Updated',
        user_name: user?.full_name || 'Admin',
        details: \`Task status changed to \${newStatus}.\`,
      });
    }
    return true;
  };`;

const replaceTasks = `  const addProgrammeTask = async (taskData: Omit<ProgrammeTask, 'id' | 'created_at'>): Promise<ProgrammeTask> => {
    const newTask: ProgrammeTask = {
      ...taskData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setProgrammeTasks((prev) => {
      const updated = [...prev, newTask];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_tasks', JSON.stringify(updated));
      }
      return updated;
    });
    addProgrammeActivity({
      programme_id: newTask.programme_id,
      action: 'Task Added',
      user_name: user?.full_name || 'Admin',
      details: \`New task "\${newTask.title}" added with \${newTask.priority} priority.\`,
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { assignee: _a, ...dbPayload } = newTask;
        supabase.from('programme_tasks').insert([dbPayload]).then(({ error }) => {
          if (error) console.error('Supabase addProgrammeTask error:', error);
        });
      }
    }

    return newTask;
  };

  const updateProgrammeTask = async (id: string, updates: Partial<ProgrammeTask>): Promise<boolean> => {
    setProgrammeTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_tasks', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { assignee: _a, ...dbPayload } = updates as any;
        supabase.from('programme_tasks').update({ ...dbPayload, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateProgrammeTask error:', error);
        });
      }
    }

    return true;
  };

  const deleteProgrammeTask = async (id: string): Promise<boolean> => {
    setProgrammeTasks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_tasks', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_tasks').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteProgrammeTask error:', error);
        });
      }
    }

    return true;
  };

  const toggleProgrammeTaskStatus = async (id: string): Promise<boolean> => {
    let pId = '';
    let newStatus: 'Pending' | 'In Progress' | 'Completed' = 'Completed';
    setProgrammeTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id === id) {
          pId = t.programme_id;
          newStatus = t.status === 'Completed' ? 'Pending' : 'Completed';
          return { ...t, status: newStatus, updated_at: new Date().toISOString() };
        }
        return t;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_tasks', JSON.stringify(updated));
      }
      return updated;
    });
    if (pId) {
      addProgrammeActivity({
        programme_id: pId,
        action: 'Task Status Updated',
        user_name: user?.full_name || 'Admin',
        details: \`Task status changed to \${newStatus}.\`,
      });
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase toggleProgrammeTaskStatus error:', error);
        });
      }
    }

    return true;
  };`;

if (file.includes(targetTasks)) {
  file = file.replace(targetTasks, replaceTasks);
  console.log('Patched Programme tasks');
}

// Patch Notes
const targetNotes = `  const addProgrammeNote = async (noteData: Omit<ProgrammeNote, 'id' | 'created_at' | 'updated_at'>): Promise<ProgrammeNote> => {
    const newNote: ProgrammeNote = {
      ...noteData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProgrammeNotes((prev) => {
      const updated = [newNote, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_notes', JSON.stringify(updated));
      }
      return updated;
    });
    addProgrammeActivity({
      programme_id: newNote.programme_id,
      action: 'Planning Note Added',
      user_name: user?.full_name || 'Admin',
      details: \`Created document "\${newNote.title}".\`,
    });
    return newNote;
  };

  const updateProgrammeNote = async (id: string, updates: Partial<ProgrammeNote>): Promise<boolean> => {
    setProgrammeNotes((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_notes', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };

  const deleteProgrammeNote = async (id: string): Promise<boolean> => {
    setProgrammeNotes((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_notes', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };`;

const replaceNotes = `  const addProgrammeNote = async (noteData: Omit<ProgrammeNote, 'id' | 'created_at' | 'updated_at'>): Promise<ProgrammeNote> => {
    const newNote: ProgrammeNote = {
      ...noteData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProgrammeNotes((prev) => {
      const updated = [newNote, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_notes', JSON.stringify(updated));
      }
      return updated;
    });
    addProgrammeActivity({
      programme_id: newNote.programme_id,
      action: 'Planning Note Added',
      user_name: user?.full_name || 'Admin',
      details: \`Created document "\${newNote.title}".\`,
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_notes').insert([newNote]).then(({ error }) => {
          if (error) console.error('Supabase addProgrammeNote error:', error);
        });
      }
    }

    return newNote;
  };

  const updateProgrammeNote = async (id: string, updates: Partial<ProgrammeNote>): Promise<boolean> => {
    setProgrammeNotes((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_notes', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_notes').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateProgrammeNote error:', error);
        });
      }
    }

    return true;
  };

  const deleteProgrammeNote = async (id: string): Promise<boolean> => {
    setProgrammeNotes((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_notes', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_notes').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteProgrammeNote error:', error);
        });
      }
    }

    return true;
  };`;

if (file.includes(targetNotes)) {
  file = file.replace(targetNotes, replaceNotes);
  console.log('Patched Programme notes');
}

// Patch Guests, Candidates, Participants, Activities, Control Settings
const targetRest = `  const addProgrammeGuest = async (guestData: Omit<ProgrammeGuest, 'id' | 'created_at' | 'updated_at'>): Promise<ProgrammeGuest> => {
    const newGuest: ProgrammeGuest = {
      ...guestData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProgrammeGuests((prev) => {
      const updated = [...prev, newGuest];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_guests', JSON.stringify(updated));
      }
      return updated;
    });
    addProgrammeActivity({
      programme_id: newGuest.programme_id,
      action: 'Guest Added',
      user_name: user?.full_name || 'Admin',
      details: \`Added \${newGuest.full_name} (\${newGuest.category || 'Guest'}).\`,
    });
    return newGuest;
  };

  const updateProgrammeGuest = async (id: string, updates: Partial<ProgrammeGuest>): Promise<boolean> => {
    setProgrammeGuests((prev) => {
      const updated = prev.map((g) => (g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_guests', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };

  const deleteProgrammeGuest = async (id: string): Promise<boolean> => {
    setProgrammeGuests((prev) => {
      const updated = prev.filter((g) => g.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_guests', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };

  const addProgrammeCandidate = async (candidateData: Omit<ProgrammeCandidate, 'id' | 'created_at' | 'updated_at'>): Promise<ProgrammeCandidate> => {
    const newCandidate: ProgrammeCandidate = {
      ...candidateData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProgrammeCandidates((prev) => {
      const updated = [...prev, newCandidate];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_candidates', JSON.stringify(updated));
      }
      return updated;
    });
    addProgrammeActivity({
      programme_id: newCandidate.programme_id,
      action: 'Candidate Added',
      user_name: user?.full_name || 'Admin',
      details: \`Added candidate "\${newCandidate.full_name}".\`,
    });
    return newCandidate;
  };

  const updateProgrammeCandidate = async (id: string, updates: Partial<ProgrammeCandidate>): Promise<boolean> => {
    setProgrammeCandidates((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_candidates', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };

  const deleteProgrammeCandidate = async (id: string): Promise<boolean> => {
    setProgrammeCandidates((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_candidates', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };

  const addProgrammeParticipant = async (participantData: Omit<ProgrammeParticipant, 'id' | 'created_at' | 'updated_at'>): Promise<ProgrammeParticipant> => {
    const newParticipant: ProgrammeParticipant = {
      ...participantData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProgrammeParticipants((prev) => {
      const updated = [...prev, newParticipant];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_participants', JSON.stringify(updated));
      }
      return updated;
    });
    addProgrammeActivity({
      programme_id: newParticipant.programme_id,
      action: 'Participant Registered',
      user_name: user?.full_name || 'Admin',
      details: \`Registered participant "\${newParticipant.full_name}".\`,
    });
    return newParticipant;
  };

  const updateProgrammeParticipant = async (id: string, updates: Partial<ProgrammeParticipant>): Promise<boolean> => {
    setProgrammeParticipants((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_participants', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };

  const deleteProgrammeParticipant = async (id: string): Promise<boolean> => {
    setProgrammeParticipants((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_participants', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };

  const addProgrammeActivity = async (activityData: Omit<ProgrammeActivity, 'id' | 'created_at'>): Promise<ProgrammeActivity> => {
    const newActivity: ProgrammeActivity = {
      ...activityData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setProgrammeActivities((prev) => {
      const updated = [newActivity, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_activities', JSON.stringify(updated));
      }
      return updated;
    });
    return newActivity;
  };

  const updateProgrammeControlSettings = async (categories: ProgrammeCategoryConfig[], statuses: ProgrammeStatusConfig[]): Promise<boolean> => {
    setProgrammeCategories(categories);
    setProgrammeStatuses(statuses);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chromadiaries_programme_categories', JSON.stringify(categories));
      localStorage.setItem('chromadiaries_programme_statuses', JSON.stringify(statuses));
    }
    return true;
  };`;

const replaceRest = `  const addProgrammeGuest = async (guestData: Omit<ProgrammeGuest, 'id' | 'created_at' | 'updated_at'>): Promise<ProgrammeGuest> => {
    const newGuest: ProgrammeGuest = {
      ...guestData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProgrammeGuests((prev) => {
      const updated = [...prev, newGuest];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_guests', JSON.stringify(updated));
      }
      return updated;
    });
    addProgrammeActivity({
      programme_id: newGuest.programme_id,
      action: 'Guest Added',
      user_name: user?.full_name || 'Admin',
      details: \`Added \${newGuest.full_name} (\${newGuest.category || 'Guest'}).\`,
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_guests').insert([newGuest]).then(({ error }) => {
          if (error) console.error('Supabase addProgrammeGuest error:', error);
        });
      }
    }

    return newGuest;
  };

  const updateProgrammeGuest = async (id: string, updates: Partial<ProgrammeGuest>): Promise<boolean> => {
    setProgrammeGuests((prev) => {
      const updated = prev.map((g) => (g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_guests', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_guests').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateProgrammeGuest error:', error);
        });
      }
    }

    return true;
  };

  const deleteProgrammeGuest = async (id: string): Promise<boolean> => {
    setProgrammeGuests((prev) => {
      const updated = prev.filter((g) => g.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_guests', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_guests').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteProgrammeGuest error:', error);
        });
      }
    }

    return true;
  };

  const addProgrammeCandidate = async (candidateData: Omit<ProgrammeCandidate, 'id' | 'created_at' | 'updated_at'>): Promise<ProgrammeCandidate> => {
    const newCandidate: ProgrammeCandidate = {
      ...candidateData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProgrammeCandidates((prev) => {
      const updated = [...prev, newCandidate];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_candidates', JSON.stringify(updated));
      }
      return updated;
    });
    addProgrammeActivity({
      programme_id: newCandidate.programme_id,
      action: 'Candidate Added',
      user_name: user?.full_name || 'Admin',
      details: \`Added candidate "\${newCandidate.full_name}".\`,
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_candidates').insert([newCandidate]).then(({ error }) => {
          if (error) console.error('Supabase addProgrammeCandidate error:', error);
        });
      }
    }

    return newCandidate;
  };

  const updateProgrammeCandidate = async (id: string, updates: Partial<ProgrammeCandidate>): Promise<boolean> => {
    setProgrammeCandidates((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_candidates', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_candidates').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateProgrammeCandidate error:', error);
        });
      }
    }

    return true;
  };

  const deleteProgrammeCandidate = async (id: string): Promise<boolean> => {
    setProgrammeCandidates((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_candidates', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_candidates').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteProgrammeCandidate error:', error);
        });
      }
    }

    return true;
  };

  const addProgrammeParticipant = async (participantData: Omit<ProgrammeParticipant, 'id' | 'created_at' | 'updated_at'>): Promise<ProgrammeParticipant> => {
    const newParticipant: ProgrammeParticipant = {
      ...participantData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProgrammeParticipants((prev) => {
      const updated = [...prev, newParticipant];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_participants', JSON.stringify(updated));
      }
      return updated;
    });
    addProgrammeActivity({
      programme_id: newParticipant.programme_id,
      action: 'Participant Registered',
      user_name: user?.full_name || 'Admin',
      details: \`Registered participant "\${newParticipant.full_name}".\`,
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_participants').insert([newParticipant]).then(({ error }) => {
          if (error) console.error('Supabase addProgrammeParticipant error:', error);
        });
      }
    }

    return newParticipant;
  };

  const updateProgrammeParticipant = async (id: string, updates: Partial<ProgrammeParticipant>): Promise<boolean> => {
    setProgrammeParticipants((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_participants', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_participants').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateProgrammeParticipant error:', error);
        });
      }
    }

    return true;
  };

  const deleteProgrammeParticipant = async (id: string): Promise<boolean> => {
    setProgrammeParticipants((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_participants', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_participants').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteProgrammeParticipant error:', error);
        });
      }
    }

    return true;
  };

  const addProgrammeActivity = async (activityData: Omit<ProgrammeActivity, 'id' | 'created_at'>): Promise<ProgrammeActivity> => {
    const newActivity: ProgrammeActivity = {
      ...activityData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setProgrammeActivities((prev) => {
      const updated = [newActivity, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_activities', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_activities').insert([newActivity]).then(({ error }) => {
          if (error) console.error('Supabase addProgrammeActivity error:', error);
        });
      }
    }

    return newActivity;
  };

  const updateProgrammeControlSettings = async (categories: ProgrammeCategoryConfig[], statuses: ProgrammeStatusConfig[]): Promise<boolean> => {
    setProgrammeCategories(categories);
    setProgrammeStatuses(statuses);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chromadiaries_programme_categories', JSON.stringify(categories));
      localStorage.setItem('chromadiaries_programme_statuses', JSON.stringify(statuses));
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const catRows = categories.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          is_active: c.is_active,
          display_order: c.order,
        }));
        supabase.from('programme_categories').upsert(catRows).then(({ error }) => {
          if (error) console.error('Supabase programme_categories error:', error);
        });

        const statRows = statuses.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          counts_as_progress: s.counts_as_progress,
          counts_as_completed: s.counts_as_completed,
          is_active: s.is_active,
          display_order: s.order,
        }));
        supabase.from('programme_statuses').upsert(statRows).then(({ error }) => {
          if (error) console.error('Supabase programme_statuses error:', error);
        });
      }
    }

    return true;
  };`;

if (file.includes(targetRest)) {
  file = file.replace(targetRest, replaceRest);
  console.log('Patched Programme rest');
}

fs.writeFileSync('src/lib/context/data-context.tsx', file, 'utf8');
console.log('data-context.tsx patched successfully!');
