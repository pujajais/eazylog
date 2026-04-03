'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Navigation from '@/components/Navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { FileText, Loader2, LogOut, Download } from 'lucide-react';
import type { SymptomEntry } from '@/lib/types';

const COLORS = ['#5B8C7B', '#D4956A', '#6ea393', '#e5a97b', '#497063', '#c07a4f'];

export default function DashboardPage() {
  const [entries, setEntries] = useState<SymptomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState('');
  const supabase = createClient();

  const loadEntries = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = '/'; return; }

    const { data } = await supabase
      .from('symptom_entries')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (data) setEntries(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const res = await fetch('/api/doctor-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data.report);
    } catch {
      setReport('Failed to generate report. Please try again.');
    } finally {
      setReportLoading(false);
    }
  };

  // Chart data
  const severityData = entries
    .filter(e => e.severity)
    .map(e => ({
      date: new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      severity: e.severity,
    }));

  const bodyLocationCounts: Record<string, number> = {};
  entries.forEach(e => {
    e.body_locations?.forEach(loc => {
      bodyLocationCounts[loc] = (bodyLocationCounts[loc] || 0) + 1;
    });
  });
  const bodyData = Object.entries(bodyLocationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  const triggerCounts: Record<string, number> = {};
  entries.forEach(e => {
    e.triggers?.forEach(t => {
      triggerCounts[t] = (triggerCounts[t] || 0) + 1;
    });
  });
  const triggerData = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <Loader2 className="animate-spin text-sage-400" size={32} />
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif text-gray-800">Dashboard</h1>
            <p className="text-sm text-gray-400 font-sans">{entries.length} entries logged</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Sign out"
          >
            <LogOut size={20} />
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-serif text-gray-500 text-lg">No entries yet.</p>
            <p className="text-sm text-gray-400 font-sans mt-2">Start logging how you feel to see your patterns here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Severity Trend */}
            {severityData.length > 0 && (
              <div className="bg-white rounded-2xl p-5">
                <h2 className="font-serif text-gray-700 mb-4">Severity Over Time</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={severityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: 'sans-serif' }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="severity"
                      stroke="#5B8C7B"
                      strokeWidth={2}
                      dot={{ fill: '#5B8C7B', r: 4 }}
                      activeDot={{ r: 6, fill: '#D4956A' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Body Areas */}
            {bodyData.length > 0 && (
              <div className="bg-white rounded-2xl p-5">
                <h2 className="font-serif text-gray-700 mb-4">Most Affected Areas</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={bodyData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontFamily: 'sans-serif' }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#5B8C7B" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Triggers */}
            {triggerData.length > 0 && (
              <div className="bg-white rounded-2xl p-5">
                <h2 className="font-serif text-gray-700 mb-4">Common Triggers</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={triggerData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name }) => name}
                    >
                      {triggerData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Doctor Report */}
            <div className="bg-white rounded-2xl p-5">
              <h2 className="font-serif text-gray-700 mb-3">Doctor Report</h2>
              <p className="text-sm text-gray-400 font-sans mb-4">
                Generate a summary of your symptom history to share with your healthcare provider.
              </p>

              {!report ? (
                <button
                  onClick={generateReport}
                  disabled={reportLoading}
                  className="w-full py-3 rounded-xl bg-terra-400 text-white font-sans
                             font-medium flex items-center justify-center gap-2
                             hover:bg-terra-500 transition-colors disabled:opacity-50"
                >
                  {reportLoading ? (
                    <><Loader2 size={18} className="animate-spin" /> Generating...</>
                  ) : (
                    <><FileText size={18} /> Generate Doctor Report</>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-cream-100 rounded-xl max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-sans text-gray-700 leading-relaxed">
                      {report}
                    </pre>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(report);
                      }}
                      className="flex-1 py-2 rounded-lg bg-sage-500 text-white font-sans text-sm
                                 flex items-center justify-center gap-1 hover:bg-sage-600"
                    >
                      <Download size={14} /> Copy to Clipboard
                    </button>
                    <button
                      onClick={() => setReport('')}
                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-500 font-sans text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}
