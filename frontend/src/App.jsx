import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Building2, Users, PhoneCall, CheckCircle2, AlertCircle,
  Search, Filter, Plus, Phone, Mail, Globe, MapPin,
  ExternalLink, MessageSquare, Download, Trash2, RefreshCw,
  Sparkles, ShieldCheck, Layers, Send, BarChart2,
  ChevronDown, CheckSquare, Square, MoreHorizontal, ArrowUpDown, Upload
} from 'lucide-react';

import SlideoutDrawer from './components/SlideoutDrawer';
import CallLogModal from './components/CallLogModal';
import PipelineKanbanView from './components/PipelineKanbanView';
import OutreachAssistant from './components/OutreachAssistant';
import DnsVerifierView from './components/DnsVerifierView';
import AnalyticsView from './components/AnalyticsView';
import LeadFinderView from './components/LeadFinderView';
import CsvImportModal from './components/CsvImportModal';

const API_BASE = '/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('directory');
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({
    total_companies: 0,
    total_contacts: 0,
    verified_emails: 0,
    total_calls: 0,
    stages: {}
  });
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [scoreFilter, setScoreFilter] = useState('all');

  // Multi-select Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActionStage, setBulkActionStage] = useState('');

  // Modals & Drawers
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [callModalCompany, setCallModalCompany] = useState(null);
  const [showCsvImport, setShowCsvImport] = useState(false);

  // Batch verify loading
  const [batchVerifying, setBatchVerifying] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/stats`);
      if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/companies`);
      if (Array.isArray(res.data)) {
        setCompanies(res.data);
      } else {
        setCompanies([]);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchCompanies();
  }, []);

  const handleRefreshAll = () => {
    fetchStats();
    fetchCompanies();
  };

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredCompanies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCompanies.map(c => c.id));
    }
  };

  const handleToggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkStageChange = async (targetStage) => {
    if (!targetStage || selectedIds.length === 0) return;
    try {
      await axios.post(`${API_BASE}/companies/batch-update-stage`, {
        company_ids: selectedIds,
        lead_status: targetStage
      });
      setBanner({ text: `Updated ${selectedIds.length} leads to '${targetStage}'`, type: 'success' });
      setSelectedIds([]);
      setBulkActionStage('');
      handleRefreshAll();
      setTimeout(() => setBanner(null), 3000);
    } catch (err) {
      alert("Bulk update error: " + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected leads?`)) return;
    try {
      await axios.post(`${API_BASE}/companies/batch-delete`, {
        company_ids: selectedIds
      });
      setBanner({ text: `Deleted ${selectedIds.length} leads`, type: 'info' });
      setSelectedIds([]);
      handleRefreshAll();
      setTimeout(() => setBanner(null), 3000);
    } catch (err) {
      alert("Bulk delete error: " + err.message);
    }
  };

  // Batch Verify
  const handleBatchVerify = async () => {
    setBatchVerifying(true);
    try {
      const res = await axios.post(`${API_BASE}/leads/batch-verify`);
      setBanner({
        text: `DNS Batch Verification complete! Checked: ${res.data.total_checked}, Verified: ${res.data.verified}`,
        type: 'success'
      });
      handleRefreshAll();
      setTimeout(() => setBanner(null), 4000);
    } catch (err) {
      alert("Batch verify error: " + err.message);
    } finally {
      setBatchVerifying(false);
    }
  };

  // Cleanup Demo Data
  const handleCleanupDemo = async () => {
    if (!window.confirm("WARNING: This will permanently purge ALL leads, contacts, and outreach logs to leave a clean production database. Proceed?")) {
      return;
    }
    try {
      await axios.delete(`${API_BASE}/cleanup-demo-data`);
      setBanner({ text: "All demo data permanently cleaned. Database is ready for live leads.", type: 'info' });
      setSelectedIds([]);
      handleRefreshAll();
      setTimeout(() => setBanner(null), 3500);
    } catch (err) {
      alert("Error cleaning demo data: " + err.message);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (companies.length === 0) return alert("No leads to export.");
    let csv = "ID,Company Name,Industry,Country,City,Phone,Website,Lead Score,Stage,Primary Contact,Contact Email,Email Status,Contact Phone\n";
    companies.forEach((c) => {
      const primary = c.contacts?.[0] || {};
      csv += `"${c.id}","${c.name}","${c.industry || ''}","${c.country || ''}","${c.city || ''}","${c.phone || ''}","${c.website || ''}","${c.lead_score || 50}","${c.lead_status}","${primary.name || ''}","${primary.email || ''}","${primary.email_status || ''}","${primary.phone || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `b2b_leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Filtered Leads
  const filteredCompanies = companies.filter((c) => {
    if (!c) return false;
    const q = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (c.name || '').toLowerCase().includes(q) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.country && c.country.toLowerCase().includes(q)) ||
      (c.industry && c.industry.toLowerCase().includes(q)) ||
      (c.website && c.website.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'All' || c.lead_status === statusFilter;

    let matchesScore = true;
    if (scoreFilter === 'high') matchesScore = (c.lead_score || 50) >= 80;
    if (scoreFilter === 'med') matchesScore = (c.lead_score || 50) >= 60;

    return matchesSearch && matchesStatus && matchesScore;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Toast Notification Banner */}
      {banner && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold transition-all animate-in slide-in-from-top-2 ${
          banner.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' :
          banner.type === 'info' ? 'bg-slate-900 text-white border-slate-700' :
          'bg-rose-600 text-white border-rose-500'
        }`}>
          {banner.text}
        </div>
      )}

      {/* Main Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Name */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-sm tracking-wider">
                CRM
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  CRM
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  B2B Lead Engine & Cold Outreach Pipeline
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto py-1">
              {[
                { id: 'directory', label: 'Directory', icon: Building2 },
                { id: 'finder', label: 'Auto Finder', icon: Sparkles },
                { id: 'pipeline', label: 'Pipeline', icon: Layers },
                { id: 'outreach', label: 'Outreach & Scripts', icon: Send },
                { id: 'verifier', label: 'DNS MX Verifier', icon: ShieldCheck },
                { id: 'analytics', label: 'Analytics', icon: BarChart2 }
              ].map(tab => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Top Right Quick Actions */}
            <div className="hidden lg:flex items-center space-x-2">
              <button
                onClick={handleCleanupDemo}
                title="Wipe test data"
                className="px-2.5 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clean Data</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* TAB 1: DIRECTORY */}
        {activeTab === 'directory' && (
          <div className="space-y-6">
            {/* Stat Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Companies</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{stats.total_companies}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Decision Makers</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{stats.total_contacts}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">0-Bounce Verified</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">{stats.verified_emails}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Outreach Calls</span>
                <p className="text-2xl font-black text-indigo-600 mt-1">{stats.total_calls}</p>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                {/* Search */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search studio name, city, website..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Right Action Tools */}
                <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                  <select
                    value={scoreFilter}
                    onChange={(e) => setScoreFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="all">All Scores</option>
                    <option value="high">High Viability (80%+)</option>
                    <option value="med">Medium+ (60%+)</option>
                  </select>

                  <button
                    onClick={handleBatchVerify}
                    disabled={batchVerifying}
                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-2xs disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{batchVerifying ? 'Verifying...' : 'Verify All (DNS MX)'}</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={() => setShowCsvImport(true)}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Import CSV</span>
                  </button>
                </div>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center space-x-1 overflow-x-auto pt-1 border-t border-slate-100">
                {['All', 'New', 'Verified', 'Contacted', 'Sample Sent', 'Converted', 'Lost'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {st} {st !== 'All' && stats.stages?.[st] !== undefined ? `(${stats.stages[st]})` : ''}
                  </button>
                ))}
              </div>

              {/* Bulk Action Strip (Appears when items are selected) */}
              {selectedIds.length > 0 && (
                <div className="p-2.5 bg-slate-900 text-white rounded-lg flex items-center justify-between text-xs animate-in fade-in duration-150">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold">{selectedIds.length} leads selected</span>
                    <button
                      onClick={() => setSelectedIds([])}
                      className="text-slate-400 hover:text-white underline text-[11px]"
                    >
                      Deselect all
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={bulkActionStage}
                      onChange={(e) => handleBulkStageChange(e.target.value)}
                      className="px-2.5 py-1 bg-slate-800 text-white border border-slate-700 rounded text-xs font-bold"
                    >
                      <option value="">Move Stage To...</option>
                      {['New', 'Verified', 'Contacted', 'Sample Sent', 'Converted', 'Lost'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleBulkDelete}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold"
                    >
                      Delete Selected
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={filteredCompanies.length > 0 && selectedIds.length === filteredCompanies.length}
                          onChange={handleToggleSelectAll}
                          className="rounded text-slate-900 focus:ring-slate-900"
                        />
                      </th>
                      <th className="py-3 px-4">Company & Viability</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Decision Makers</th>
                      <th className="py-3 px-4">Pipeline Stage</th>
                      <th className="py-3 px-4 text-right">Outreach Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          No leads found in this view. Use "Auto Finder" to generate fresh studio leads!
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((comp) => {
                        const isSelected = selectedIds.includes(comp.id);
                        const primary = comp.contacts?.[0];
                        const cleanPhone = (primary?.whatsapp || primary?.phone || comp.phone || '').replace(/[^0-9]/g, '');

                        return (
                          <tr
                            key={comp.id}
                            className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-slate-50' : ''}`}
                          >
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(comp.id)}
                                className="rounded text-slate-900 focus:ring-slate-900"
                              />
                            </td>
                            <td className="py-3 px-4 cursor-pointer" onClick={() => setSelectedCompany(comp)}>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900 hover:text-blue-600 text-sm">
                                  {comp.name}
                                </span>
                                <span className={`px-1.5 py-0.2 rounded font-black text-[10px] ${
                                  (comp.lead_score || 50) >= 80 ? 'bg-emerald-100 text-emerald-800' :
                                  (comp.lead_score || 50) >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {comp.lead_score || 50}%
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                                <span>{comp.industry || 'Photography'}</span>
                                {comp.website && (
                                  <>
                                    <span>•</span>
                                    <a
                                      href={comp.website}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-blue-600 hover:underline flex items-center space-x-0.5"
                                    >
                                      <span>{comp.website.replace(/^https?:\/\//, '')}</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              <span className="font-medium">{comp.city || '—'}, {comp.country || '—'}</span>
                            </td>
                            <td className="py-3 px-4">
                              {primary ? (
                                <div>
                                  <div className="font-bold text-slate-800">{primary.name}</div>
                                  <div className="flex items-center space-x-2 text-[11px]">
                                    <span className="text-slate-500">{primary.email || '—'}</span>
                                    {primary.email_status && (
                                      <span className={`px-1 rounded text-[9px] font-bold ${
                                        primary.email_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                                        primary.email_status === 'CATCH_ALL' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                      }`}>
                                        {primary.email_status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={comp.lead_status}
                                onChange={async (e) => {
                                  try {
                                    await axios.put(`${API_BASE}/companies/${comp.id}`, { lead_status: e.target.value });
                                    handleRefreshAll();
                                  } catch (err) {
                                    alert("Update failed: " + err.message);
                                  }
                                }}
                                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold text-slate-800"
                              >
                                {['New', 'Verified', 'Contacted', 'Sample Sent', 'Converted', 'Lost'].map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                {cleanPhone && (
                                  <a
                                    href={`https://wa.me/${cleanPhone}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="WhatsApp Chat"
                                    className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                  </a>
                                )}
                                <button
                                  onClick={() => setCallModalCompany(comp)}
                                  title="Log Cold Call"
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
                                >
                                  <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Call</span>
                                </button>
                                <button
                                  onClick={() => setSelectedCompany(comp)}
                                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                                >
                                  Inspect
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AUTO LEAD FINDER */}
        {activeTab === 'finder' && (
          <LeadFinderView
            apiBase={API_BASE}
            onScrapeSuccess={handleRefreshAll}
            setBanner={setBanner}
          />
        )}

        {/* TAB 3: PIPELINE KANBAN */}
        {activeTab === 'pipeline' && (
          <PipelineKanbanView
            companies={companies}
            apiBase={API_BASE}
            onSelectCompany={(comp) => setSelectedCompany(comp)}
            onOpenCallModal={(comp) => setCallModalCompany(comp)}
            onRefresh={handleRefreshAll}
            setBanner={setBanner}
          />
        )}

        {/* TAB 4: OUTREACH & SCRIPTS */}
        {activeTab === 'outreach' && (
          <OutreachAssistant
            companies={companies}
            apiBase={API_BASE}
            setBanner={setBanner}
          />
        )}

        {/* TAB 5: DNS MX VERIFIER */}
        {activeTab === 'verifier' && (
          <DnsVerifierView
            apiBase={API_BASE}
          />
        )}

        {/* TAB 6: ANALYTICS */}
        {activeTab === 'analytics' && (
          <AnalyticsView
            apiBase={API_BASE}
          />
        )}
      </main>

      {/* Slideout Detail Drawer */}
      {selectedCompany && (
        <SlideoutDrawer
          company={selectedCompany}
          apiBase={API_BASE}
          onClose={() => setSelectedCompany(null)}
          onRefresh={handleRefreshAll}
          onOpenCallModal={(comp) => setCallModalCompany(comp)}
          setBanner={setBanner}
        />
      )}

      {/* Sales Call Recording Modal */}
      {callModalCompany && (
        <CallLogModal
          company={callModalCompany}
          apiBase={API_BASE}
          onClose={() => setCallModalCompany(null)}
          onSuccess={handleRefreshAll}
          setBanner={setBanner}
        />
      )}

      {/* Bulk CSV Import Modal */}
      {showCsvImport && (
        <CsvImportModal
          apiBase={API_BASE}
          onClose={() => setShowCsvImport(false)}
          onSuccess={handleRefreshAll}
          setBanner={setBanner}
        />
      )}
    </div>
  );
}
