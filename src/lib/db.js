import { supabase } from './supabase.js'

// ─── row mappers ──────────────────────────────────────────────
const rowToUser = r => ({ id: r.id, name: r.name, email: r.email, password: r.password, role: r.role })

const rowToProj = r => ({
  id: r.id, name: r.name, desc: r.description, start: r.start_date, end: r.end_date,
  members: r.members ?? [], color: r.color, notionUrl: r.notion_url ?? '',
})

const rowToTask = r => ({
  id: r.id, pid: r.project_id, parentId: r.parent_id, depth: r.depth,
  uid: r.user_id, title: r.title, role: r.role, desc: r.description,
  ts: r.task_start, te: r.task_end, cs: r.current_start, ce: r.current_end,
  status: r.status, color: r.color, expanded: r.expanded ?? true,
  del: r.deliverables ?? [], _manual: r.is_manual, _statusManual: r.status_manual,
})

const rowToDoc = r => ({
  id: r.id, pid: r.project_id, uid: r.user_id, title: r.title, desc: r.description,
  files: r.files ?? [], links: r.links ?? [], at: r.document_at,
})

const taskToRow = t => ({
  id: t.id,
  project_id: t.pid,
  parent_id: t.parentId ?? null,
  depth: t.depth,
  user_id: t.uid ?? null,
  title: t.title,
  role: t.role ?? null,
  description: t.desc ?? null,
  task_start: t.ts ?? null,
  task_end: t.te ?? null,
  current_start: t.cs ?? null,
  current_end: t.ce ?? null,
  status: t.status ?? '예정',
  color: t.color ?? null,
  expanded: t.expanded ?? true,
  deliverables: t.del ?? [],
  is_manual: t._manual ?? false,
  status_manual: t._statusManual ?? false,
})

const sync = p => p.then(({ error }) => { if (error) console.warn('[prosync db]', error) })

// ─── load all ────────────────────────────────────────────────
export async function loadAll() {
  const [ur, pr, tr, dr] = await Promise.all([
    supabase.from('users').select('*').order('id'),
    supabase.from('projects').select('*').order('created_at'),
    supabase.from('tasks').select('*').order('created_at'),
    supabase.from('documents').select('*').order('created_at'),
  ])
  return {
    users: (ur.data ?? []).map(rowToUser),
    projs: (pr.data ?? []).map(rowToProj),
    tasks: (tr.data ?? []).map(rowToTask),
    docs:  (dr.data ?? []).map(rowToDoc),
  }
}

// ─── auth ────────────────────────────────────────────────────
export async function dbLogin(email, password) {
  const { data } = await supabase.from('users').select('*')
    .eq('email', email).eq('password', password).maybeSingle()
  return data ? rowToUser(data) : null
}

export async function dbRegister(name, email, password) {
  const { data, error } = await supabase.from('users')
    .insert([{ name, email, password, role: 'member' }]).select().single()
  if (error) throw error
  return rowToUser(data)
}

// ─── projects ────────────────────────────────────────────────
export const dbAddProject = p => sync(supabase.from('projects').insert([{
  id: p.id, name: p.name, description: p.desc ?? null,
  start_date: p.start ?? null, end_date: p.end ?? null,
  members: p.members, color: p.color, notion_url: p.notionUrl || null,
}]))

export const dbUpdateProject = p => sync(supabase.from('projects').upsert({
  id: p.id, name: p.name, description: p.desc ?? null,
  start_date: p.start ?? null, end_date: p.end ?? null,
  members: p.members, color: p.color, notion_url: p.notionUrl || null,
}))

// ─── sync all (크로스 디바이스) ──────────────────────────────
export async function dbSyncAllProjects(projs) {
  if (!projs.length) return
  const { error } = await supabase.from('projects').upsert(projs.map(p => ({
    id: p.id, name: p.name, description: p.desc ?? null,
    start_date: p.start ?? null, end_date: p.end ?? null,
    members: p.members, color: p.color, notion_url: p.notionUrl || null,
  })), { onConflict: 'id' })
  if (error) console.error('[prosync db] syncAllProjects:', error.message)
}

export async function dbSyncUsers(users) {
  if (!users.length) return
  const { error } = await supabase.from('users').upsert(
    users.map(({ name, email, password, role }) => ({ name, email, password, role: role || 'member' })),
    { onConflict: 'email', ignoreDuplicates: true }
  )
  if (error) console.error('[prosync db] syncUsers:', error.message)
}

// ─── tasks ───────────────────────────────────────────────────
export const dbAddTask = t => sync(supabase.from('tasks').insert([taskToRow(t)]))

// depth 순서(0→1→2)로 삽입해야 parent_id FK 제약 위반 방지
export async function dbAddTasks(ts) {
  for (const depth of [0, 1, 2]) {
    const batch = ts.filter(t => t.depth === depth).map(taskToRow)
    if (!batch.length) continue
    const { error } = await supabase.from('tasks').insert(batch)
    if (error) console.warn('[prosync db] dbAddTasks depth=' + depth, error)
  }
}

export const dbUpdateTask = t => sync(supabase.from('tasks').upsert(taskToRow(t)))

// 로드 시 localStorage 전체를 Supabase에 강제 동기화 (크로스 브라우저용)
// depth 순서 필수 (0→1→2): parent_id FK 제약 위반 방지
export async function dbSyncAllTasks(tasks) {
  for (const depth of [0, 1, 2]) {
    const batch = tasks.filter(t => t.depth === depth).map(taskToRow)
    if (!batch.length) continue
    const { error } = await supabase.from('tasks').upsert(batch, { onConflict: 'id' })
    if (error) console.error('[prosync db] syncAllTasks depth=' + depth, error.message)
  }
}
export const dbDeleteTask  = id => sync(supabase.from('tasks').delete().eq('id', id))
export const dbDeleteTasks = ids => sync(supabase.from('tasks').delete().in('id', [...ids]))
export const dbDeleteProjectTasksNotManual = pid =>
  sync(supabase.from('tasks').delete().eq('project_id', pid).eq('is_manual', false))

// ─── documents ───────────────────────────────────────────────
export const dbAddDoc = d => sync(supabase.from('documents').insert([{
  id: d.id, project_id: d.pid, user_id: d.uid, title: d.title,
  description: d.desc ?? null, files: d.files, links: d.links, document_at: d.at,
}]))
export const dbDeleteDoc = id => sync(supabase.from('documents').delete().eq('id', id))

// ─── first-run seed ──────────────────────────────────────────
export async function seedInitialData(users, projs, tasks, docs) {
  if (users.length)
    await supabase.from('users').upsert(users.map(u => ({
      id: u.id, name: u.name, email: u.email, password: u.password, role: u.role,
    })))
  await supabase.from('projects').upsert(projs.map(p => ({
    id: p.id, name: p.name, description: p.desc ?? null,
    start_date: p.start ?? null, end_date: p.end ?? null,
    members: p.members, color: p.color, notion_url: p.notionUrl || null,
  })))
  // depth 순서로 삽입 (Phase → Task → SubTask)
  for (const depth of [0, 1, 2]) {
    const batch = tasks.filter(t => t.depth === depth).map(taskToRow)
    if (batch.length) await supabase.from('tasks').upsert(batch)
  }
  if (docs.length)
    await supabase.from('documents').upsert(docs.map(d => ({
      id: d.id, project_id: d.pid, user_id: d.uid, title: d.title,
      description: d.desc ?? null, files: d.files, links: d.links, document_at: d.at,
    })))
}
