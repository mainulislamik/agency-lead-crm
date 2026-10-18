import React, { useState } from 'react';
import axios from 'axios';
import {
  Globe, MapPin, Search, Sparkles, Building2, User, Phone, Mail,
  CheckCircle2, AlertCircle, Copy, ExternalLink, Linkedin, Instagram,
  Facebook, Twitter, Download, Check, RefreshCw, Send, Layers,
  Briefcase, Zap, Compass, ArrowRight, FileSpreadsheet, ShieldCheck
} from 'lucide-react';

export default function DeepUrlLeadFinderView({ apiBase, setBanner, onLeadSaved }) {
  const [activeMode, setActiveMode] = useState('single'); // 'single' | 'bulk'

  // Single URL state
  const [urlInput, setUrlInput] = useState('');
  const [autoSave, setAutoSave] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(null);
  const [savingLead, setSavingLead] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Bulk state
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResults, setBulkResults] = useState([]);
  const [savingAll, setSavingAll] = useState(false);

  // Step labels for animation
  const steps = [
    { title: "ইউআরএল বিশ্লেষণ ও প্রোটোকল ভ্যালিডেশন...", sub: "গুগল ম্যাপস বা ডোমেইন শনাক্তকরণ" },
    { title: "ওয়েবসাইট ডিপ ক্রলিং ও মেটাডাটা এক্সট্র্যাকশন...", sub: "হোমপেজ, কন্টাক্ট ও টিম পেজ স্ক্যানিং" },
    { title: "ডিসিশন মেকার ও লিঙ্কডইন OSINT অনুসন্ধান...", sub: "অনার, ক্রিয়েটিভ ডিরেক্টর ও ম্যানেজার প্রোফাইল" },
    { title: "ইমেইল পারমিউটেশন ও লাইভ DNS MX ভেরিফিকেশন...", sub: "ডেলিভারেবল কর্পোরেট ইমেইল নিশ্চিতকরণ" },
    { title: "ইমেজ এডিটিং কোল্ড পিচ ও লিড স্কোর তৈরি সম্পন্ন!", sub: "চূড়ান্ত ফলাফল প্রস্তুত" }
  ];

  const presets = [
    { label: "Milk Studios (Website)", url: "https://milkstudios.com" },
    { label: "Milk Studios NYC (Google Maps)", url: "https://www.google.com/maps/place/Milk+Studios/@40.7423521,-74.0076211,17z/" },
    { label: "Spring Studios NYC (Website)", url: "https://www.springny.com" },
    { label: "Industrial Color (Google Maps)", url: "https://www.google.com/maps/place/Industrial+Color/@40.7228,-74.0089,17z/" }
  ];

  // Run single deep research
  const handleSingleResearch = async (targetUrl = null) => {
    const urlToScan = targetUrl || urlInput;
    if (!urlToScan.trim()) {
      setBanner({ type: 'error', message: 'দয়া করে একটি সঠিক Website URL অথবা Google Maps লিঙ্ক প্রদান করুন।' });
      return;
    }

    setLoading(true);
    setResult(null);
    setSavedSuccess(false);
    setCurrentStep(0);

    // Simulate animated step progression
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 1200);

    try {
      const response = await axios.post(`${apiBase}/leads/deep-research`, {
        url: urlToScan.trim(),
        auto_save: autoSave
      });

      clearInterval(stepInterval);
      setCurrentStep(4);
      setResult(response.data);
      if (response.data.saved) {
        setSavedSuccess(true);
      }
      setBanner({
        type: 'success',
        message: `গবেষণা সফল! ${response.data.company_name}-এর তথ্য ও ${response.data.contacts?.length || 0}টি কন্টাক্ট পাওয়া গেছে।`
      });
      if (response.data.saved && onLeadSaved) {
        onLeadSaved();
      }
    } catch (err) {
      clearInterval(stepInterval);
      setBanner({
        type: 'error',
        message: err.response?.data?.detail || 'ডিপ রিসার্চ সম্পন্ন করতে ত্রুটি হয়েছে। URL সঠিক কিনা পুনরায় পরীক্ষা করুন।'
      });
    } finally {
      setLoading(false);
    }
  };

  // Save lead to CRM
  const handleSaveToCrm = async () => {
    if (!result || savingLead || savedSuccess) return;
    setSavingLead(true);
    try {
      const resp = await axios.post(`${apiBase}/leads/deep-research/save`, result);
      setSavedSuccess(true);
      setBanner({ type: 'success', message: `${result.company_name} সফলভাবে CRM ডাটাবেজ ও পাইপলাইনে সংরক্ষিত হয়েছে!` });
      if (onLeadSaved) onLeadSaved();
    } catch (err) {
      setBanner({ type: 'error', message: 'CRM-এ সংরক্ষণ করতে ত্রুটি হয়েছে।' });
    } finally {
      setSavingLead(false);
    }
  };

  // Copy Cold Pitch
  const handleCopyPitch = () => {
    if (!result?.outreach_pitch) return;
    navigator.clipboard.writeText(result.outreach_pitch);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2500);
  };

  // Copy Email
  const handleCopyEmail = (email, id) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(id);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Run Bulk Deep Research
  const handleBulkResearch = async () => {
    const urls = bulkUrls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urls.length === 0) {
      setBanner({ type: 'error', message: 'দয়া করে কমপক্ষে একটি URL প্রতি লাইনে প্রদান করুন।' });
      return;
    }

    if (urls.length > 20) {
      setBanner({ type: 'error', message: 'একবারে সর্বোচ্চ ২০টি URL প্রসেস করা সম্ভব।' });
      return;
    }

    setBulkLoading(true);
    setBulkResults([]);
    setBulkProgress({ current: 0, total: urls.length });

    const collected = [];
    for (let i = 0; i < urls.length; i++) {
      setBulkProgress({ current: i + 1, total: urls.length });
      try {
        const resp = await axios.post(`${apiBase}/leads/deep-research`, {
          url: urls[i],
          auto_save: false
        });
        collected.push(resp.data);
      } catch (err) {
        collected.push({
          input_url: urls[i],
          company_name: 'Failed to extract',
          lead_score: 0,
          contacts: [],
          saved: false,
          error: true
        });
      }
      setBulkResults([...collected]);
    }

    setBulkLoading(false);
    setBanner({
      type: 'success',
      message: `বাল্ক রিসার্চ সমাপ্ত! মোট ${collected.length}টি লিডের ডেটা নিষ্কাশন সম্পন্ন হয়েছে।`
    });
  };

  // Save all bulk leads to CRM
  const handleSaveAllBulk = async () => {
    const validLeads = bulkResults.filter(l => !l.error && !l.saved);
    if (validLeads.length === 0) return;

    setSavingAll(true);
    let savedCount = 0;
    for (const lead of validLeads) {
      try {
        await axios.post(`${apiBase}/leads/deep-research/save`, lead);
        lead.saved = true;
        savedCount++;
      } catch (e) {
        // continue
      }
    }
    setBulkResults([...bulkResults]);
    setSavingAll(false);
    setBanner({ type: 'success', message: `${savedCount}টি লিড সফলভাবে CRM-এ সেভ করা হয়েছে!` });
    if (onLeadSaved) onLeadSaved();
  };

  // Export Bulk as CSV
  const handleExportCsv = () => {
    if (bulkResults.length === 0) return;
    const headers = [
      "Company Name", "Type", "Website", "Address", "City", "Country",
      "Lead Score", "Decision Maker", "Designation", "Verified Email",
      "Phone", "WhatsApp", "LinkedIn Profile"
    ];

    const rows = bulkResults.map(l => {
      const c = l.contacts?.[0] || {};
      return [
        `"${(l.company_name || '').replace(/"/g, '""')}"`,
        `"${l.detected_type || 'website'}"`,
        `"${l.website || ''}"`,
        `"${(l.address || '').replace(/"/g, '""')}"`,
        `"${l.city || ''}"`,
        `"${l.country || ''}"`,
        l.lead_score || 0,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.designation || '').replace(/"/g, '""')}"`,
        `"${c.email || ''}"`,
        `"${c.phone || ''}"`,
        `"${c.whatsapp || ''}"`,
        `"${c.linkedin_url || ''}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `deep_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm mb-1">
            <Compass className="w-4 h-4" />
            <span>AI OSINT & Web Intelligence Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            URL & Maps Deep Lead Generator
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            ক্লায়েন্টের <strong>Website URL</strong> অথবা <strong>Google Maps Link</strong> দিন—সফটওয়্যার কোম্পানির অনার, ক্রিয়েটিভ ডিরেক্টর, ভেরিফায়েড ইমেইল, ফোন ও সোশ্যাল লিঙ্ক স্বয়ংক্রিয়ভাবে এক্সট্র্যাক্ট করবে।
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveMode('single')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeMode === 'single'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            সিঙ্গেল সার্চ (URL / Maps)
          </button>
          <button
            onClick={() => setActiveMode('bulk')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeMode === 'bulk'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            বাল্ক স্ক্যানার (Bulk Batch)
          </button>
        </div>
      </div>

      {/* SINGLE SEARCH MODE */}
      {activeMode === 'single' && (
        <div className="space-y-6">
          {/* Input Card */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <label className="block text-sm font-semibold text-slate-800">
              টার্গেট ক্লায়েন্টের লিঙ্ক পেস্ট করুন (Website URL অথবা Google Maps Link):
            </label>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Globe className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSingleResearch()}
                  placeholder="e.g. https://milkstudios.com অথবা https://maps.app.goo.gl/... বা Google Maps URL"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                  disabled={loading}
                />
              </div>

              <button
                onClick={() => handleSingleResearch()}
                disabled={loading || !urlInput.trim()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>ডিপ রিসার্চ চলছে...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>ডিপ রিসার্চ করুন</span>
                  </>
                )}
              </button>
            </div>

            {/* Auto save checkbox & Presets */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-medium">ফলাফল আসার সাথে সাথে স্বয়ংক্রিয়ভাবে CRM-এ সেভ করুন</span>
              </label>

              {/* Fast Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-600 font-medium">দ্রুত টেস্ট প্রিসেট:</span>
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setUrlInput(p.url);
                      handleSingleResearch(p.url);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded border border-slate-200 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Realtime Loading Steps Progression */}
          {loading && (
            <div className="bg-white rounded-xl p-6 border border-indigo-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
                  <h3 className="font-semibold text-slate-800 text-base">
                    AI ডিপ রিসার্চ ও ক্রলিং প্রক্রিয়াধীন...
                  </h3>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                  ধাপ {currentStep + 1} / {steps.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
                {steps.map((s, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs transition-all ${
                      idx === currentStep
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-2 ring-indigo-200'
                        : idx < currentStep
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      {idx < currentStep ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : idx === currentStep ? (
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-600 inline-flex items-center justify-center text-[9px]">
                          {idx + 1}
                        </span>
                      )}
                      <span>ধাপ {idx + 1}</span>
                    </div>
                    <div className="font-semibold line-clamp-1">{s.title.split(' ')[0]}</div>
                    <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESULT CARD */}
          {result && !loading && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {/* Card Header & Badges */}
              <div className="p-6 bg-gradient-to-r from-slate-50 to-white flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${
                      result.detected_type === 'google_maps'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {result.detected_type === 'google_maps' ? '📍 Google Maps Deep Scan' : '🌐 Website Deep Scan'}
                    </span>

                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      লিড স্কোর: {result.lead_score} / 100
                    </span>

                    {result.industry && (
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {result.industry}
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {result.company_name}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                    {result.website && (
                      <a
                        href={result.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>{result.domain || result.website}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {result.google_maps_url && (
                      <a
                        href={result.google_maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-700 hover:text-amber-900 font-medium inline-flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>গুগল ম্যাপসে দেখুন</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {result.phone && (
                      <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                        <span>{result.phone}</span>
                      </span>
                    )}
                  </div>

                  {result.address && (
                    <p className="text-xs text-slate-600 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                      <span>{result.address}</span>
                    </p>
                  )}
                </div>

                {/* Save to CRM button */}
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <button
                    onClick={handleSaveToCrm}
                    disabled={savingLead || savedSuccess}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all shadow-sm ${
                      savedSuccess
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-slate-900 hover:bg-black text-white'
                    }`}
                  >
                    {savedSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>✓ CRM-এ সংরক্ষিত</span>
                      </>
                    ) : savingLead ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>সংরক্ষণ হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4" />
                        <span>CRM পাইপলাইনে সেভ করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Tech Stack & Social Media Links */}
              <div className="p-6 bg-white space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tech Stack */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-600" />
                      <span>সনাক্তকৃত টেক স্ট্যাক (Tech Stack)</span>
                    </h4>
                    {result.tech_stack?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {result.tech_stack.map((t, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-white text-indigo-700 font-semibold text-xs rounded border border-indigo-100 shadow-2xs"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600">কাস্টম স্ট্যাটিক / হেডলেস আর্কিটেকচার</p>
                    )}
                  </div>

                  {/* Discovered Social Profiles */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-600" />
                      <span>সোশ্যাল মিডিয়া প্রোফাইলসমূহ</span>
                    </h4>
                    {Object.keys(result.social_links || {}).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {result.social_links.linkedin && (
                          <a
                            href={result.social_links.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-[#0A66C2] text-white text-xs font-medium rounded flex items-center gap-1 hover:opacity-90"
                          >
                            <Linkedin className="w-3 h-3" />
                            <span>LinkedIn Page</span>
                          </a>
                        )}
                        {result.social_links.instagram && (
                          <a
                            href={result.social_links.instagram}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-[#E4405F] text-white text-xs font-medium rounded flex items-center gap-1 hover:opacity-90"
                          >
                            <Instagram className="w-3 h-3" />
                            <span>Instagram</span>
                          </a>
                        )}
                        {result.social_links.facebook && (
                          <a
                            href={result.social_links.facebook}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-[#1877F2] text-white text-xs font-medium rounded flex items-center gap-1 hover:opacity-90"
                          >
                            <Facebook className="w-3 h-3" />
                            <span>Facebook</span>
                          </a>
                        )}
                        {result.social_links.twitter && (
                          <a
                            href={result.social_links.twitter}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-black text-white text-xs font-medium rounded flex items-center gap-1 hover:opacity-90"
                          >
                            <Twitter className="w-3 h-3" />
                            <span>Twitter / X</span>
                          </a>
                        )}
                        {result.social_links.behance && (
                          <a
                            href={result.social_links.behance}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-[#0057ff] text-white text-xs font-medium rounded flex items-center gap-1 hover:opacity-90"
                          >
                            <span>Behance</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600">কোনো পাবলিক সোশ্যাল লিঙ্ক পাওয়া যায়নি</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Decision Makers & Team Members Table */}
              <div className="p-6 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      ডিসিশন মেকার ও কর্মী তালিকা ({result.contacts?.length || 0} জন এক্সট্র্যাক্ট করা হয়েছে)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-600">
                    LinkedIn OSINT & Website Team Scraping
                  </span>
                </div>

                {result.contacts?.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase">
                        <tr>
                          <th className="px-4 py-3">কর্মীর নাম ও পদবী</th>
                          <th className="px-4 py-3">ভেরিফায়েড কর্পোরেট ইমেইল</th>
                          <th className="px-4 py-3">ফোন / হোয়াটসঅ্যাপ</th>
                          <th className="px-4 py-3">লিঙ্কডইন প্রোফাইল</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {result.contacts.map((contact, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                                  {contact.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{contact.name}</span>
                                    {contact.is_primary && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                        Primary Lead
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-600 font-medium mt-0.5">
                                    {contact.designation || 'Creative Director / Owner'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              {contact.email ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs font-semibold text-slate-800">
                                      {contact.email}
                                    </span>
                                    <button
                                      onClick={() => handleCopyEmail(contact.email, idx)}
                                      className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                                      title="Copy email"
                                    >
                                      {copiedEmail === idx ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                  <div>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                      contact.email_status === 'VERIFIED'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                      {contact.email_status === 'VERIFIED' ? 'DNS MX Verified' : 'Unverified Pattern'}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-600 text-xs">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              {contact.phone ? (
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-slate-800">
                                    {contact.phone}
                                  </div>
                                  {contact.whatsapp && (
                                    <a
                                      href={`https://wa.me/${contact.whatsapp}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold"
                                    >
                                      <span>💬 WhatsApp চ্যাট</span>
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-600 text-xs">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              {contact.linkedin_url ? (
                                <a
                                  href={contact.linkedin_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors"
                                >
                                  <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                                  <span>LinkedIn প্রোফাইল</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-slate-600 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 py-3">কোনো সরাসরি কর্মী পাওয়া যায়নি।</p>
                )}
              </div>

              {/* High-Converting Cold Pitch */}
              {result.outreach_pitch && (
                <div className="p-6 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-sm font-bold text-slate-900">
                        কাস্টমাইজড ইমেজ এডিটিং কোল্ড পিচ (Ready-to-Send Outreach Pitch)
                      </h4>
                    </div>

                    <button
                      onClick={handleCopyPitch}
                      className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-600 font-semibold text-xs rounded border border-slate-300 flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      {copiedPitch ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>কপি করা হয়েছে!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>পিচ কপি করুন</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-4 bg-white rounded-lg border border-slate-200 text-slate-800 text-xs font-mono whitespace-pre-line leading-relaxed">
                    {result.outreach_pitch}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* BULK BATCH SCANNER MODE */}
      {activeMode === 'bulk' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              বাল্ক URL ব্যাচ স্ক্যানার (প্রতি লাইনে একটি করে লিঙ্ক পেস্ট করুন, সর্বোচ্চ ২০টি):
            </h3>

            <textarea
              rows={6}
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              placeholder="https://milkstudios.com&#10;https://www.google.com/maps/place/Milk+Studios/@40.7423521,-74.0076211,17z/&#10;https://www.springny.com&#10;https://www.google.com/maps/place/Industrial+Color/@40.7228,-74.0089,17z/"
              className="w-full p-4 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              disabled={bulkLoading}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={handleBulkResearch}
                disabled={bulkLoading || !bulkUrls.trim()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {bulkLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>প্রসেসিং চলছে ({bulkProgress.current} / {bulkProgress.total})...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>বাল্ক ডিপ রিসার্চ শুরু করুন</span>
                  </>
                )}
              </button>

              {bulkResults.length > 0 && !bulkLoading && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCsv}
                    className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>CSV ডাউনলোড করুন</span>
                  </button>

                  <button
                    onClick={handleSaveAllBulk}
                    disabled={savingAll}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm"
                  >
                    <Layers className="w-4 h-4" />
                    <span>সবগুলো CRM-এ সেভ করুন</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bulk Results Table */}
          {bulkResults.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">
                  বাল্ক রেজাল্ট তালিকা (মোট {bulkResults.length}টি লিড)
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">কোম্পানির নাম</th>
                      <th className="px-4 py-3">টাইপ</th>
                      <th className="px-4 py-3">ডিসিশন মেকার</th>
                      <th className="px-4 py-3">ভেরিফায়েড ইমেইল</th>
                      <th className="px-4 py-3">ফোন নম্বর</th>
                      <th className="px-4 py-3">স্কোর</th>
                      <th className="px-4 py-3">অবস্থা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {bulkResults.map((lead, idx) => {
                      const firstContact = lead.contacts?.[0] || {};
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            <div>{lead.company_name}</div>
                            {lead.website && (
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-indigo-600 hover:underline font-normal inline-flex items-center gap-0.5"
                              >
                                {lead.domain || lead.website}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              lead.detected_type === 'google_maps' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {lead.detected_type === 'google_maps' ? 'Maps' : 'Website'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{firstContact.name || '—'}</div>
                            <div className="text-[10px] text-slate-600">{firstContact.designation || '—'}</div>
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {firstContact.email ? (
                              <span className="text-emerald-700 font-semibold">{firstContact.email}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {lead.phone || firstContact.phone || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-emerald-700">{lead.lead_score}/100</span>
                          </td>
                          <td className="px-4 py-3">
                            {lead.saved ? (
                              <span className="text-emerald-700 font-semibold">✓ Saved</span>
                            ) : lead.error ? (
                              <span className="text-rose-600 font-medium">Failed</span>
                            ) : (
                              <span className="text-slate-600">Extracted</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
