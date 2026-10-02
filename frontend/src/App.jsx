import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Building2, Users, PhoneCall, CheckCircle2, AlertCircle,
  Search, Filter, Plus, Phone, Mail, Globe, MapPin,
  ExternalLink, MessageSquare, Download, Trash2, RefreshCw,
  Sparkles, ShieldCheck, ChevronRight, X, Clock, Play,
  Send, Award
} from 'lucide-react';
import OutreachAssistant from './components/OutreachAssistant';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8088/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('directory'); // 'directory', 'finder', 'pipeline', 'verifier'
  const [stats, setStats] = useState({
    total_companies: 0,
    total_contacts: 0,
    verified_emails: 0,
    total_calls: 0,
    stages: { New: 0, Verified: 0, Contacted: 0, "Sample Sent": 0, Converted: 0, Lost: 0 }
  });
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Finder state
  const [finderKeyword, setFinderKeyword] = useState('Product Photography Studio');
  const [finderCity, setFinderCity] = useState('New York');
  const [finderCountry, setFinderCountry] = useState('USA');
  const [finderLimit, setFinderLimit] = useState(5);
  const [finderAutoVerify, setFinderAutoVerify] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeFeedback, setScrapeFeedback] = useState(null);

  // Call Log modal
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callTargetCompany, setCallTargetCompany] = useState(null);
  const [callTargetContactId, setCallTargetContactId] = useState('');
  const [callStatus, setCallStatus] = useState('Interested');
  const [callNotes, setCallNotes] = useState('');
  const [callFollowup, setCallFollowup] = useState('');

  // Add Contact modal
  const [addContactModal, setAddContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactDesig, setNewContactDesig] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactLinkedin, setNewContactLinkedin] = useState('');

  // Standalone Verifier
  const [testEmail, setTestEmail] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Message notifications
  const [banner, setBanner] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/stats`);
      setStats(res.data);
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/companies`, {
        params: {
          status: statusFilter === 'All' ? undefined : statusFilter,
          search: searchQuery || undefined
        }
      });
      setCompanies(res.data);
    } catch (err) {
      console.error("Fetch companies error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchCompanies();
  }, [statusFilter, searchQuery]);

  const handleStartScrape = async (e) => {
    e.preventDefault();
    setIsScraping(true);
    setScrapeFeedback(null);
    try {
      const res = await axios.post(`${API_BASE}/leads/generate`, {
        keyword: finderKeyword,
        city: finderCity,
        country: finderCountry,
        limit: parseInt(finderLimit),
        auto_verify: finderAutoVerify
      });
      setScrapeFeedback({
        type: 'success',
        message: `Successfully generated & enriched ${res.data.length} leads for ${finderCity}, ${finderCountry}!`
      });
      fetchStats();
      fetchCompanies();
      setActiveTab('directory');
    } catch (err) {
      setScrapeFeedback({
        type: 'error',
        message: 'Scraping process encountered an error: ' + (err.response?.data?.detail || err.message)
      });
    } finally {
      setIsScraping(false);
    }
  };

  const handleStageChange = async (companyId, newStage) => {
    try {
      await axios.put(`${API_BASE}/companies/${companyId}`, {
        lead_status: newStage
      });
      fetchStats();
      fetchCompanies();
      if (selectedCompany && selectedCompany.id === companyId) {
        setSelectedCompany(prev => ({ ...prev, lead_status: newStage }));
      }
    } catch (err) {
      console.error("Stage update error:", err);
    }
  };

  const handleLogCallSubmit = async (e) => {
    e.preventDefault();
    if (!callTargetCompany) return;
    try {
      await axios.post(`${API_BASE}/companies/${callTargetCompany.id}/calls`, {
        company_id: callTargetCompany.id,
        contact_id: callTargetContactId ? parseInt(callTargetContactId) : null,
        caller_name: 'Outreach Agent',
        call_status: callStatus,
        notes: callNotes,
        next_followup_date: callFollowup
      });
      setCallModalOpen(false);
      setCallNotes('');
      setCallFollowup('');
      fetchStats();
      fetchCompanies();
      if (selectedCompany && selectedCompany.id === callTargetCompany.id) {
        const updated = await axios.get(`${API_BASE}/companies/${callTargetCompany.id}`);
        setSelectedCompany(updated.data);
      }
      setBanner({ text: 'Call log saved successfully!', type: 'success' });
      setTimeout(() => setBanner(null), 3000);
    } catch (err) {
      alert("Failed to log call: " + err.message);
    }
  };

  const handleAddContactSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      await axios.post(`${API_BASE}/companies/${selectedCompany.id}/contacts`, {
        company_id: selectedCompany.id,
        name: newContactName,
        designation: newContactDesig,
        email: newContactEmail,
        phone: newContactPhone,
        linkedin_url: newContactLinkedin,
        is_primary: false
      });
      setAddContactModal(false);
      setNewContactName('');
      setNewContactDesig('');
      setNewContactEmail('');
      setNewContactPhone('');
      setNewContactLinkedin('');
      
      const updated = await axios.get(`${API_BASE}/companies/${selectedCompany.id}`);
      setSelectedCompany(updated.data);
      fetchStats();
      fetchCompanies();
      setBanner({ text: 'Contact person added successfully!', type: 'success' });
      setTimeout(() => setBanner(null), 3000);
    } catch (err) {
      alert("Failed to add contact: " + err.message);
    }
  };

  const handleSingleVerify = async (e) => {
    e.preventDefault();
    if (!testEmail) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await axios.post(`${API_BASE}/verify/email`, { email: testEmail });
      setVerifyResult(res.data);
    } catch (err) {
      alert("Verification failed: " + err.message);
    } finally {
      setVerifying(false);
    }
  };

  const [batchVerifying, setBatchVerifying] = useState(false);
  const handleBatchVerify = async () => {
    setBatchVerifying(true);
    try {
      const res = await axios.post(`${API_BASE}/leads/batch-verify`);
      setBanner({
        text: `Batch DNS verification completed: Checked ${res.data.total_checked}, Verified ${res.data.verified} active emails!`,
        type: 'success'
      });
      fetchStats();
      fetchCompanies();
      setTimeout(() => setBanner(null), 4000);
    } catch (err) {
      alert("Batch verification failed: " + err.message);
    } finally {
      setBatchVerifying(false);
    }
  };

  const handleCleanupDemo = async () => {
    if (!window.confirm("Are you sure you want to clean up ALL demo and test leads? This resets the CRM database to clean production state.")) {
      return;
    }
    try {
      await axios.delete(`${API_BASE}/cleanup-demo-data`);
      setSelectedCompany(null);
      fetchStats();
      fetchCompanies();
      setBanner({ text: 'Clean-up completed: All demo data wiped clean.', type: 'info' });
      setTimeout(() => setBanner(null), 3500);
    } catch (err) {
      alert("Clean-up failed: " + err.message);
    }
  };

  const exportCSV = () => {
    if (companies.length === 0) return alert("No leads to export.");
    let csv = "Company Name,Website,Phone,City,Country,Lead Status,Primary Contact,Contact Email,Email Status,Contact Phone\n";
    companies.forEach(c => {
      const p = c.contacts && c.contacts.length > 0 ? c.contacts[0] : {};
      csv += `"${c.name}","${c.website || '—'}","${c.phone || '—'}","${c.city || '—'}","${c.country || '—'}","${c.lead_status}","${p.name || '—'}","${p.email || '—'}","${p.email_status || '—'}","${p.phone || '—'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `image_editing_leads_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Banner Message */}
      {banner && (
        <div className={`py-2.5 px-4 text-center font-medium text-sm transition-all ${
          banner.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
        }`}>
          {banner.text}
        </div>
      )}

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                PE
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                  Picasa & Stencil B2B Lead Engine
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  Automated Image Editing & Photography Lead Finder & CRM
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={() => setActiveTab('directory')}
                className={`px-3.5 py-2 rounded-md text-sm font-semibold transition-colors flex items-center space-x-2 ${
                  activeTab === 'directory'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Leads Directory</span>
              </button>
              <button
                onClick={() => setActiveTab('finder')}
                className={`px-3.5 py-2 rounded-md text-sm font-semibold transition-colors flex items-center space-x-2 ${
                  activeTab === 'finder'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Auto Lead Finder</span>
              </button>
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`px-3.5 py-2 rounded-md text-sm font-semibold transition-colors flex items-center space-x-2 ${
                  activeTab === 'pipeline'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Sales Pipeline</span>
              </button>
              <button
                onClick={() => setActiveTab('verifier')}
                className={`px-3.5 py-2 rounded-md text-sm font-semibold transition-colors flex items-center space-x-2 ${
                  activeTab === 'verifier'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Email Verifier</span>
              </button>
              <button
                onClick={() => setActiveTab('outreach')}
                className={`px-3.5 py-2 rounded-md text-sm font-semibold transition-colors flex items-center space-x-2 ${
                  activeTab === 'outreach'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Send className="w-4 h-4 text-sky-400" />
                <span>Outreach & Scripts</span>
              </button>
            </div>

            {/* Top Right Utilities */}
            <div className="flex items-center space-x-2">
              <button
                onClick={exportCSV}
                title="Export CSV"
                className="p-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleCleanupDemo}
                title="Wipe Demo Data"
                className="px-2.5 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-md text-xs font-semibold flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Data</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* KPI Stats Bar */}
      <section className="bg-white border-b border-slate-200 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3 p-2">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Companies</p>
              <p className="text-xl font-bold text-slate-900">{stats.total_companies}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-2">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Decision Makers</p>
              <p className="text-xl font-bold text-slate-900">{stats.total_contacts}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-2">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Verified 0-Bounce Emails</p>
              <p className="text-xl font-bold text-slate-900">{stats.verified_emails}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-2">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Calls / Pitches Logged</p>
              <p className="text-xl font-bold text-slate-900">{stats.total_calls}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Body Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* TAB 1: AUTO LEAD FINDER */}
        {activeTab === 'finder' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-4xl mx-auto">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-200">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Automated B2B Lead Generator
                </h2>
                <p className="text-sm text-slate-600">
                  Discover photographers, e-commerce studios & retouching agencies worldwide with real-time website crawling & DNS email validation.
                </p>
              </div>
            </div>

            <form onSubmit={handleStartScrape} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Target Niche / Keyword
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                  {[
                    "E-commerce Product Photography",
                    "Fashion & Apparel Retouching Studio",
                    "Commercial Advertising Agency",
                    "Real Estate Photo Editing",
                    "Amazon Product Image Studio"
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFinderKeyword(preset)}
                      className={`text-left px-3 py-2 text-xs rounded border transition-colors ${
                        finderKeyword === preset
                          ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={finderKeyword}
                  onChange={(e) => setFinderKeyword(e.target.value)}
                  placeholder="Or custom keyword (e.g., Jewelry Photography London)"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Target City
                  </label>
                  <input
                    type="text"
                    value={finderCity}
                    onChange={(e) => setFinderCity(e.target.value)}
                    placeholder="New York, London, Berlin, etc."
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Country
                  </label>
                  <input
                    type="text"
                    value={finderCountry}
                    onChange={(e) => setFinderCountry(e.target.value)}
                    placeholder="USA, UK, Germany, etc."
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Batch Lead Count
                  </label>
                  <select
                    value={finderLimit}
                    onChange={(e) => setFinderLimit(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value={5}>5 Leads</option>
                    <option value={10}>10 Leads</option>
                    <option value={20}>20 Leads</option>
                    <option value={50}>50 Leads</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="autoVerify"
                  checked={finderAutoVerify}
                  onChange={(e) => setFinderAutoVerify(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                />
                <label htmlFor="autoVerify" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Auto-verify discovered emails via DNS MX handshake & filter out disposable domains
                </label>
              </div>

              {scrapeFeedback && (
                <div className={`p-4 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                  scrapeFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {scrapeFeedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
                  <span>{scrapeFeedback.message}</span>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  disabled={isScraping}
                  className="px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center space-x-2 shadow-sm disabled:opacity-50"
                >
                  {isScraping ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Scraping & Verifying Leads...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Start Lead Generation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: DIRECTORY */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            {/* Control Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by company name, website, city..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <button
                  onClick={handleBatchVerify}
                  disabled={batchVerifying}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50 mr-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{batchVerifying ? 'Verifying...' : 'Verify All (DNS MX)'}</span>
                </button>
                {['All', 'New', 'Verified', 'Contacted', 'Sample Sent', 'Converted', 'Lost'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {st} {stats.stages[st] !== undefined ? `(${stats.stages[st]})` : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Leads Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Company & Location</th>
                      <th className="py-3 px-4">Primary Contact / Role</th>
                      <th className="py-3 px-4">Direct Email & Status</th>
                      <th className="py-3 px-4">Phone / WhatsApp</th>
                      <th className="py-3 px-4">Pipeline Stage</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                          <span>Loading companies...</span>
                        </td>
                      </tr>
                    ) : companies.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-500">
                          <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-700">No leads found in this view</p>
                          <p className="text-xs text-slate-500 mt-1">Use the Auto Lead Finder to discover image editing & photography studios</p>
                        </td>
                      </tr>
                    ) : (
                      companies.map((comp) => {
                        const primContact = comp.contacts && comp.contacts.length > 0 ? comp.contacts[0] : null;
                        return (
                          <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 flex items-center space-x-2">
                                <span>{comp.name}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                  (comp.lead_score || 50) >= 80 ? 'bg-emerald-100 text-emerald-800' :
                                  (comp.lead_score || 50) >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {comp.lead_score || 50}% Quality
                                </span>
                                {comp.website && (
                                  <a
                                    href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-slate-400 hover:text-slate-700"
                                    title="Open website"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{comp.city || '—'}, {comp.country || '—'}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              {primContact ? (
                                <div>
                                  <div className="font-medium text-slate-900">{primContact.name}</div>
                                  <div className="text-xs text-slate-500">{primContact.designation || 'Owner / Director'}</div>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              {primContact && primContact.email ? (
                                <div>
                                  <div className="text-xs font-mono font-medium text-slate-800">{primContact.email}</div>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 ${
                                    primContact.email_status === 'VERIFIED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : primContact.email_status === 'CATCH_ALL'
                                      ? 'bg-amber-100 text-amber-800'
                                      : primContact.email_status === 'INVALID'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {primContact.email_status}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="text-xs font-medium text-slate-800">
                                {comp.phone || (primContact && primContact.phone) || '—'}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                {(comp.phone || (primContact && primContact.phone)) && (
                                  <a
                                    href={`tel:${comp.phone || primContact.phone}`}
                                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-0.5"
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>Call</span>
                                  </a>
                                )}
                                {(primContact?.whatsapp || comp.phone) && (
                                  <a
                                    href={`https://wa.me/${(primContact?.whatsapp || comp.phone).replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 flex items-center space-x-0.5"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    <span>WhatsApp</span>
                                  </a>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <select
                                value={comp.lead_status}
                                onChange={(e) => handleStageChange(comp.id, e.target.value)}
                                className="text-xs font-semibold py-1 px-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-1 focus:ring-slate-900"
                              >
                                <option value="New">New</option>
                                <option value="Verified">Verified</option>
                                <option value="Contacted">Contacted</option>
                                <option value="Sample Sent">Sample Sent</option>
                                <option value="Converted">Converted</option>
                                <option value="Lost">Lost</option>
                              </select>
                            </td>

                            <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setCallTargetCompany(comp);
                                  setCallTargetContactId(primContact?.id || '');
                                  setCallModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-200 transition-colors"
                              >
                                Log Call
                              </button>
                              <button
                                onClick={() => setSelectedCompany(comp)}
                                className="px-2.5 py-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded transition-colors"
                              >
                                Details
                              </button>
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

        {/* TAB 3: PIPELINE KANBAN */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
            {['New', 'Verified', 'Contacted', 'Sample Sent', 'Converted', 'Lost'].map((columnStage) => {
              const stageCompanies = companies.filter(c => c.lead_status === columnStage);
              return (
                <div key={columnStage} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-w-[200px]">
                  <div className="p-3 border-b border-slate-200 bg-slate-50 rounded-t-xl flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      {columnStage}
                    </span>
                    <span className="text-xs bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full">
                      {stageCompanies.length}
                    </span>
                  </div>
                  <div className="p-2 space-y-2 flex-1 min-h-[350px] bg-slate-50/50">
                    {stageCompanies.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCompany(c)}
                        className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow cursor-pointer transition-shadow"
                      >
                        <h4 className="font-bold text-xs text-slate-900 truncate">{c.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{c.city || '—'}, {c.country || '—'}</p>
                        {c.contacts && c.contacts[0] && (
                          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px]">
                            <p className="text-slate-800 font-medium truncate">{c.contacts[0].name}</p>
                            <p className="text-slate-400 text-[10px]">{c.contacts[0].designation || 'Owner'}</p>
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCallTargetCompany(c);
                              setCallModalOpen(true);
                            }}
                            className="text-[10px] text-blue-600 font-bold hover:underline"
                          >
                            + Call Log
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: EMAIL VERIFIER TOOL */}
        {activeTab === 'verifier' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-xl mx-auto">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-200">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Instant DNS Email Verifier
                </h2>
                <p className="text-sm text-slate-600">
                  Direct MX handshake test to prevent cold outreach email bounces and protect domain reputation.
                </p>
              </div>
            </div>

            <form onSubmit={handleSingleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email Address to Verify
                </label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="e.g., info@picasalimited.com, studio@artdirectors.com"
                    required
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={verifying}
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                  >
                    {verifying ? 'Checking...' : 'Verify'}
                  </button>
                </div>
              </div>

              {verifyResult && (
                <div className="mt-6 p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Verification Result</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      verifyResult.status === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : verifyResult.status === 'CATCH_ALL'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {verifyResult.status}
                    </span>
                  </div>
                  <div className="text-sm font-mono text-slate-900 font-bold">{verifyResult.email}</div>
                  <div className="text-xs text-slate-600">
                    <strong>Message:</strong> {verifyResult.message}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center space-x-4 pt-1">
                    <span><strong>MX Found:</strong> {verifyResult.has_mx ? 'Yes ✓' : 'No ✗'}</span>
                    <span><strong>Disposable:</strong> {verifyResult.is_disposable ? 'Yes (Block)' : 'No (Safe)'}</span>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* TAB 5: COLD OUTREACH & TELEMARKETING ASSISTANT */}
        {activeTab === 'outreach' && (
          <OutreachAssistant
            companies={companies}
            apiBase={API_BASE}
            setBanner={setBanner}
          />
        )}
      </main>

      {/* COMPANY DETAILS SLIDEOUT DRAWER */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedCompany.name}</h3>
                <p className="text-xs text-slate-500">{selectedCompany.city || '—'}, {selectedCompany.country || '—'}</p>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              {/* Account Meta */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block">Website:</span>
                    {selectedCompany.website ? (
                      <a href={selectedCompany.website} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline flex items-center space-x-1">
                        <span className="truncate">{selectedCompany.website}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ) : '—'}
                  </div>
                  <div>
                    <span className="text-slate-500 block">Phone:</span>
                    <span className="font-semibold text-slate-800">{selectedCompany.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Industry:</span>
                    <span className="font-semibold text-slate-800">{selectedCompany.industry || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Lead Source:</span>
                    <span className="font-semibold text-slate-800">{selectedCompany.lead_source || '—'}</span>
                  </div>
                </div>
                {selectedCompany.address && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block">Physical Address:</span>
                    <span className="text-slate-800 font-medium">{selectedCompany.address}</span>
                  </div>
                )}
              </div>

              {/* Contacts / Decision Makers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-slate-600" />
                    <span>Decision Makers & Contacts ({selectedCompany.contacts?.length || 0})</span>
                  </h4>
                  <button
                    onClick={() => setAddContactModal(true)}
                    className="text-xs font-semibold text-slate-900 hover:underline flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Person</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {selectedCompany.contacts && selectedCompany.contacts.length > 0 ? (
                    selectedCompany.contacts.map((cnt) => (
                      <div key={cnt.id} className="p-3 border border-slate-200 rounded-lg bg-white shadow-sm space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{cnt.name}</span>
                          <span className="text-slate-500 font-medium">{cnt.designation || 'Owner / Director'}</span>
                        </div>
                        {cnt.email && (
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-slate-700">{cnt.email}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              cnt.email_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {cnt.email_status}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center space-x-3 pt-1 text-[11px]">
                          {cnt.phone && (
                            <a href={`tel:${cnt.phone}`} className="text-blue-600 font-semibold hover:underline flex items-center space-x-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{cnt.phone}</span>
                            </a>
                          )}
                          {cnt.whatsapp && (
                            <a href={`https://wa.me/${cnt.whatsapp}`} target="_blank" rel="noreferrer" className="text-emerald-600 font-semibold hover:underline flex items-center space-x-0.5">
                              <MessageSquare className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                          {cnt.linkedin_url && (
                            <a href={cnt.linkedin_url} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold hover:underline flex items-center space-x-0.5">
                              <Globe className="w-3 h-3" />
                              <span>LinkedIn</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">No contacts added yet.</p>
                  )}
                </div>
              </div>

              {/* Call History / Logs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                    <PhoneCall className="w-4 h-4 text-slate-600" />
                    <span>Call Activity & Pitches</span>
                  </h4>
                  <button
                    onClick={() => {
                      setCallTargetCompany(selectedCompany);
                      setCallModalOpen(true);
                    }}
                    className="text-xs font-semibold bg-slate-900 text-white px-2.5 py-1 rounded"
                  >
                    + Log New Call
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedCompany.call_logs && selectedCompany.call_logs.length > 0 ? (
                    selectedCompany.call_logs.map((cl) => (
                      <div key={cl.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{cl.call_status}</span>
                          <span className="text-slate-400 text-[10px]">{new Date(cl.created_at).toLocaleDateString()}</span>
                        </div>
                        {cl.notes && <p className="text-slate-700">{cl.notes}</p>}
                        {cl.next_followup_date && (
                          <p className="text-amber-700 font-medium text-[10px]">Next Follow-up: {cl.next_followup_date}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">No calls logged yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CALL LOGGING MODAL */}
      {callModalOpen && callTargetCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">
                Log Call: {callTargetCompany.name}
              </h3>
              <button onClick={() => setCallModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogCallSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Call Outcome</label>
                <select
                  value={callStatus}
                  onChange={(e) => setCallStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="Interested">Interested in Retouching/Editing Services</option>
                  <option value="Sample Requested">Sample Test Requested (Sending Trial Files)</option>
                  <option value="Follow Up">Follow Up Needed</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="No Answer">No Answer / Left Voicemail</option>
                  <option value="Wrong Number">Wrong Number</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes & Client Requirements</label>
                <textarea
                  rows="3"
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="e.g., Client does 500 product shots/week. Needs clipping path, drop shadow, and color correction. Sample test invited."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Next Follow-up Date/Time</label>
                <input
                  type="text"
                  value={callFollowup}
                  onChange={(e) => setCallFollowup(e.target.value)}
                  placeholder="e.g., Tomorrow at 3:00 PM EST"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCallModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 rounded-lg text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Save Call Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CONTACT MODAL */}
      {addContactModal && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">
                Add Contact to {selectedCompany.name}
              </h3>
              <button onClick={() => setAddContactModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddContactSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="e.g., Alex Morgan"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Designation / Role</label>
                <input
                  type="text"
                  value={newContactDesig}
                  onChange={(e) => setNewContactDesig(e.target.value)}
                  placeholder="e.g., Lead Photographer / Art Director"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="alex@photostudio.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="+1 212 555 0199"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn Profile</label>
                <input
                  type="url"
                  value={newContactLinkedin}
                  onChange={(e) => setNewContactLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/alexmorgan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAddContactModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 rounded-lg text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Add Person
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
