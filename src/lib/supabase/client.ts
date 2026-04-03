import { createBrowserClient } from '@supabase/ssr';

export const IS_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createClient() {
  if (IS_DEMO) {
    return createMockClient();
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@eazylog.app',
  user_metadata: { display_name: 'Demo User' },
};

const DEMO_SESSION = { user: DEMO_USER };

// In-memory demo storage
const demoStore: Record<string, Record<string, unknown>[]> = {
  symptom_entries: [
    {
      id: 'demo-entry-1',
      user_id: DEMO_USER.id,
      raw_text: 'Throbbing headache behind my eyes, started after staring at screen all day',
      body_locations: ['head', 'eyes'],
      pain_type: 'throbbing',
      severity: 6,
      triggers: ['screen time'],
      is_chronic: true,
      notes: 'Recurring headache from screen use',
      source: 'log',
      created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    },
    {
      id: 'demo-entry-2',
      user_id: DEMO_USER.id,
      raw_text: 'Lower back ache after sitting too long',
      body_locations: ['lower back'],
      pain_type: 'aching',
      severity: 4,
      triggers: ['sitting', 'posture'],
      is_chronic: true,
      notes: 'Chronic lower back pain from sitting',
      source: 'log',
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: 'demo-entry-3',
      user_id: DEMO_USER.id,
      raw_text: 'Migraine',
      body_locations: ['head'],
      pain_type: 'migraine',
      severity: 8,
      triggers: [],
      is_chronic: true,
      notes: null,
      source: 'quick-tap',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 'demo-entry-4',
      user_id: DEMO_USER.id,
      raw_text: 'Sharp knee pain going up stairs',
      body_locations: ['right knee'],
      pain_type: 'sharp',
      severity: 5,
      triggers: ['stairs', 'walking'],
      is_chronic: false,
      notes: 'Sharp pain in right knee with stairs',
      source: 'body-map',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 'demo-entry-5',
      user_id: DEMO_USER.id,
      raw_text: 'Feeling OK',
      body_locations: [],
      pain_type: null,
      severity: 1,
      triggers: [],
      is_chronic: false,
      notes: null,
      source: 'quick-tap',
      created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    },
  ],
  quick_tap_presets: [
    { id: 'preset-1', user_id: DEMO_USER.id, label: 'Migraine', icon: 'brain', color: '#D4956A', sort_order: 0 },
    { id: 'preset-2', user_id: DEMO_USER.id, label: 'Nausea', icon: 'frown', color: '#D4956A', sort_order: 1 },
    { id: 'preset-3', user_id: DEMO_USER.id, label: 'Back Pain', icon: 'arrow-down', color: '#D4956A', sort_order: 2 },
    { id: 'preset-4', user_id: DEMO_USER.id, label: 'Fatigue', icon: 'battery-low', color: '#D4956A', sort_order: 3 },
    { id: 'preset-5', user_id: DEMO_USER.id, label: 'Joint Pain', icon: 'bone', color: '#D4956A', sort_order: 4 },
    { id: 'preset-6', user_id: DEMO_USER.id, label: 'Feeling OK', icon: 'smile', color: '#5B8C7B', sort_order: 5 },
  ],
  follow_ups: [],
  doctor_reports: [],
};

function createMockClient() {
  // Chain builder for mock queries
  function createQueryBuilder(table: string) {
    let filters: Array<{ col: string; val: unknown }> = [];
    let orderCol = '';
    let orderAsc = true;
    let isInsert = false;
    let insertData: Record<string, unknown> | Record<string, unknown>[] | null = null;
    let isDelete = false;
    let isSingle = false;
    let isSelect = false;

    const builder: Record<string, unknown> = {
      select(_cols?: string) {
        isSelect = true;
        return builder;
      },
      insert(data: Record<string, unknown> | Record<string, unknown>[]) {
        isInsert = true;
        insertData = data;
        return builder;
      },
      delete() {
        isDelete = true;
        return builder;
      },
      eq(col: string, val: unknown) {
        filters.push({ col, val });
        return builder;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        orderCol = col;
        orderAsc = opts?.ascending !== false;
        return builder;
      },
      single() {
        isSingle = true;
        return resolve();
      },
      then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
        return resolve().then(onFulfilled, onRejected);
      },
    };

    function resolve() {
      if (!demoStore[table]) demoStore[table] = [];

      if (isInsert && insertData) {
        const items = Array.isArray(insertData) ? insertData : [insertData];
        const created = items.map(item => ({
          id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: new Date().toISOString(),
          ...item,
        }));
        demoStore[table].push(...created);
        const data = created.length === 1 ? created[0] : created;
        if (isSelect) {
          // .insert().select() chain — need to return builder that resolves
          return Promise.resolve({ data: isSingle ? (created[0] || null) : created, error: null });
        }
        return Promise.resolve({ data, error: null });
      }

      if (isDelete) {
        demoStore[table] = demoStore[table].filter(row => {
          return !filters.every(f => row[f.col] === f.val);
        });
        return Promise.resolve({ data: null, error: null });
      }

      // SELECT
      let rows = [...demoStore[table]];
      for (const f of filters) {
        rows = rows.filter(r => r[f.col] === f.val);
      }
      if (orderCol) {
        rows.sort((a, b) => {
          const av = a[orderCol] as string;
          const bv = b[orderCol] as string;
          return orderAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
      }
      return Promise.resolve({ data: isSingle ? (rows[0] || null) : rows, error: null });
    }

    return builder;
  }

  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: DEMO_SESSION }, error: null }),
      signUp: () => Promise.resolve({ data: { session: DEMO_SESSION }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { session: DEMO_SESSION }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      exchangeCodeForSession: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: (table: string) => createQueryBuilder(table),
  };
}
