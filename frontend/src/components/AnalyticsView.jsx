import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp, Globe, Award, ShieldCheck, CheckCircle2,
  Users, Building2, BarChart2, PieChart, ArrowUpRight,
  Clock, Activity, RefreshCw
} from 'lucide-react';

export default function AnalyticsView({ apiBase }) {
  const [data, setData] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${apiBase}/analytics`),
      axios.get(`${apiBase}/activity-logs`)
    ])
      .then(([analyticsRes, logsRes]) => {
        setData(analyticsRes.data);
        setActivityLogs(logsRes.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Analytics fetch error:", err);
        setLoading(false);
      });
  }, [apiBase]);

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-semibold">Loading pipeline analytics & activity logs...</p>
      </div>
    );
  }

  if (!data || data.total_leads === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-2xl mx-auto shadow-2xs">
        <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">No Analytics Data Yet</h3>
        <p className="text-xs text-slate-500 mt-1">
          Generate or add prospects to view real-time conversion funnel, quality distribution, and market insights.
        </p>
      </div>
    );
  }

  const { total_leads, avg_score, verified_percentage, by_country, by_stage, by_score_tier } = data;
  const stageOrder = ["New", "Verified", "Contacted", "Sample Sent", "Converted", "Lost"];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pipeline Leads</span>
            <Building2 className="w-4 h-4 text-slate-700" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{total_leads}</span>
            <span className="text-xs text-slate-500 font-medium">prospects</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Quality Score</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-600">{avg_score}%</span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">High Intent</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">0-Bounce Verified</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-blue-600">{verified_percentage}%</span>
            <span className="text-xs text-slate-500 font-medium">of decision makers</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Markets</span>
            <Globe className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-indigo-600">{Object.keys(by_country).length}</span>
            <span className="text-xs text-slate-500 font-medium">countries</span>
          </div>
        </div>
      </div>

      {/* Main Analytics Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Pipeline Funnel */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Pipeline Conversion Funnel</h3>
            <span className="text-xs font-bold text-slate-500 font-mono">Stage Distribution</span>
          </div>

          <div className="space-y-4 pt-2">
            {stageOrder.map((stage) => {
              const count = by_stage[stage] || 0;
              const pct = total_leads > 0 ? Math.round((count / total_leads) * 100) : 0;
              return (
                <div key={stage} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">{stage}</span>
                    <span className="font-mono text-slate-600 font-semibold">{count} leads ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        stage === 'Converted' ? 'bg-emerald-600' :
                        stage === 'Sample Sent' ? 'bg-indigo-600' :
                        stage === 'Contacted' ? 'bg-blue-600' :
                        stage === 'Verified' ? 'bg-sky-500' :
                        stage === 'Lost' ? 'bg-rose-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Quality & Geographic Distribution */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quality Tiers */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Lead Viability Tiers</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg text-xs">
                <span className="font-bold text-emerald-900">High Score (80-100%)</span>
                <span className="font-black text-emerald-700">{by_score_tier.high} leads</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-100 rounded-lg text-xs">
                <span className="font-bold text-amber-900">Medium Score (50-79%)</span>
                <span className="font-black text-amber-700">{by_score_tier.medium} leads</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="font-bold text-slate-700">Low Score (&lt;50%)</span>
                <span className="font-black text-slate-700">{by_score_tier.low} leads</span>
              </div>
            </div>
          </div>

          {/* Target Markets */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Target Geographies</h3>
            <div className="space-y-2">
              {Object.entries(by_country).map(([country, count]) => (
                <div key={country} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                  <span className="font-medium text-slate-800">{country}</span>
                  <span className="font-bold text-slate-900">{count} leads</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Activity Trail */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-slate-900" />
            <h3 className="text-sm font-bold text-slate-900">Recent CRM Activity & Pipeline Audit Trail</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Live Event Logging</span>
        </div>

        {activityLogs.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">No recent activities logged.</p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {activityLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded">
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono font-bold text-[10px]">
                    {log.action}
                  </span>
                  <span className="text-slate-800 font-medium">{log.details}</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                  <span>by <strong className="text-slate-700">{log.user}</strong></span>
                  <span>•</span>
                  <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
