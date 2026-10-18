import React, { useState } from 'react';
import axios from 'axios';
import {
  Globe, MapPin, Search, Sparkles, Building2, User, Phone, Mail,
  CheckCircle2, AlertCircle, Copy, ExternalLink, Linkedin, Instagram,
  Facebook, Twitter, Download, Check, RefreshCw, Send, Layers,
  Briefcase, Zap, Compass, ArrowRight, FileSpreadsheet, ShieldCheck,
  ChevronDown, ChevronUp, Star, Award, Crown, Target, MessageCircle
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
  const [copiedPermutation, setCopiedPermutation] = useState(null);
  const [copiedRolePitch, setCopiedRolePitch] = useState(null);
  const [savingLead, setSavingLead] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Active filters and expanded cards
  const [selectedTierFilter, setSelectedTierFilter] = useState('ALL');
  const [expandedPermutations, setExpandedPermutations] = useState({});
  const [expandedRolePitch, setExpandedRolePitch] = useState({});

  // Bulk state
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResults, setBulkResults] = useState([]);
  const [savingAll, setSavingAll] = useState(false);

  // Step labels for animation
  const steps = [
    { title: "ইউআরএল ও প্রোটোকল ভ্যালিডেশন...", sub: "গুগল ম্যাপস বা ডোমেইন শনাক্তকরণ" },
    { title: "ওয়েবসাইট ডিপ ক্রলিং ও বায়ো স্ক্যান...", sub: "হোমপেজ, কন্টাক্ট ও টিম পেজ স্ক্র্যাপিং" },
    { title: "মাল্টি-টিয়ার লিঙ্কডইন OSINT ডরকিং...", sub: "ওনার, আর্ট ডিরেক্টর ও ম্যানেজার প্রোফাইল" },
    { title: "Hunter প্যাটার্ন ও জিরো-বাউন্স SMTP টেস্ট...", sub: "লাইভ মেইলবক্স হ্যান্ডশেক ও ফোন পার্সিং" },
    { title: "রোল-ভিত্তিক কোল্ড পিচ ও লিড রেডি!", sub: "পূর্ণাঙ্গ ইন্টেলিজেন্স রিপোর্ট প্রস্তুত" }
  ];

  const presets = [
    { label: "Milk Studios (Website)", url: "https://milkstudios.com" },
    { label: "Milk Studios NYC (Google Maps)", url: "https://www.google.com/maps/place/Milk+Studios/@40.7423521,-74.0076211,17z/" },
    { label: "Spring Studios NYC (Website)", url: "https://www.springny.com" },
    { label: "Industrial Color (Google Maps)", url: "https://www.google.com/maps/place/Industrial+Color/@40.7228,-74.0089,17z/" }
  ];

  // Toggle Permutations popover
  const togglePermutations = (idx) => {
    setExpandedPermutations(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Toggle Role Pitch popover
  const toggleRolePitch = (idx) => {
    setExpandedRolePitch(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

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
    setExpandedPermutations({});
    setExpandedRolePitch({});

    // Animated step progression
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
        message: `গবেষণা সফল! ${response.data.company_name}-এর তথ্য ও ${response.data.contacts?.length || 0} জন ডিসিশন মেকার শনাক্ত হয়েছে।`
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
      await axios.post(`${apiBase}/leads/deep-research/save`, result);
      setSavedSuccess(true);
      setBanner({ type: 'success', message: `${result.company_name} সফলভাবে CRM ডাটাবেজ ও পাইপলাইনে সংরক্ষিত হয়েছে!` });
      if (onLeadSaved) onLeadSaved();
    } catch (err) {
      setBanner({ type: 'error', message: 'CRM-এ সংরক্ষণ করতে ত্রুটি হয়েছে।' });
    } finally {
      setSavingLead(false);
    }
  };

  // Copy Main Cold Pitch
  const handleCopyPitch = () => {
    if (!result?.outreach_pitch) return;
    navigator.clipboard.writeText(result.outreach_pitch);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2500);
  };

  // Copy Email
  const handleCopyEmail = (email, id) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmail(id);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Copy Permutation
  const handleCopyPermutation = (email, key) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedPermutation(key);
    setTimeout(() => setCopiedPermutation(null), 2000);
  };

  // Copy Role-Adaptive Pitch
  const handleCopyRolePitch = (pitch, id) => {
    if (!pitch) return;
    navigator.clipboard.writeText(pitch);
    setCopiedRolePitch(id);
    setTimeout(() => setCopiedRolePitch(null), 2500);
  };

  // Bulk research
  const handleBulkResearch = async () => {
    const rawList = bulkUrls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (rawList.length === 0) {
      setBanner({ type: 'error', message: 'দয়া করে অন্তত একটি ইউআরএল দিন।' });
      return;
    }

    if (rawList.length > 20) {
      setBanner({ type: 'error', message: 'একবারে সর্বোচ্চ ২০টি ইউআরএল প্রক্রিয়া করা যাবে।' });
      return;
    }

    setBulkLoading(true);
    setBulkResults([]);
    setBulkProgress({ current: 0, total: rawList.length });

    try {
      const resp = await axios.post(`${apiBase}/leads/deep-research/bulk`, {
        urls: rawList,
        auto_save: false
      });
      setBulkResults(resp.data);
      setBulkProgress({ current: rawList.length, total: rawList.length });
      setBanner({ type: 'success', message: `বাল্ক ডিপ রিসার্চ সম্পন্ন! মোট ${resp.data.length}টি লিড জেনারেট হয়েছে।` });
    } catch (err) {
      setBanner({ type: 'error', message: 'বাল্ক প্রসেসিংয়ে ত্রুটি হয়েছে।' });
    } finally {
      setBulkLoading(false);
    }
  };

  // Save all bulk leads
  const handleSaveAllBulk = async () => {
    if (bulkResults.length === 0 || savingAll) return;
    setSavingAll(true);
    let savedCount = 0;
    try {
      for (const item of bulkResults) {
        if (!item.error && !item.saved) {
          try {
            await axios.post(`${apiBase}/leads/deep-research/save`, item);
            item.saved = true;
            savedCount++;
          } catch (e) {
            console.error("Save error for item:", item.company_name);
          }
        }
      }
      setBanner({ type: 'success', message: `${savedCount}টি কোম্পানি ও তাদের ডিসিশন মেকাররা সফলভাবে CRM-এ সংরক্ষিত হয়েছে!` });
      if (onLeadSaved) onLeadSaved();
    } catch (err) {
      setBanner({ type: 'error', message: 'সংরক্ষণ প্রক্রিয়ায় কিছু ত্রুটি ঘটেছে।' });
    } finally {
      setSavingAll(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (bulkResults.length === 0) return;
    const headers = ["Company", "Type", "Website", "Phone", "Decision Maker", "Designation", "Seniority", "Email", "Email Status", "Email Confidence", "WhatsApp", "LinkedIn", "Lead Score"];
    const rows = [];

    bulkResults.forEach(b => {
      const cList = b.contacts?.length > 0 ? b.contacts : [{}];
      cList.forEach(c => {
        rows.push([
          `"${(b.company_name || '').replace(/"/g, '""')}"`,
          `"${b.detected_type || 'website'}"`,
          `"${b.website || ''}"`,
          `"${c.phone || b.phone || ''}"`,
          `"${(c.name || '').replace(/"/g, '""')}"`,
          `"${(c.designation || '').replace(/"/g, '""')}"`,
          `"${c.seniority_tier || ''}"`,
          `"${c.email || ''}"`,
          `"${c.email_status || ''}"`,
          `"${c.email_confidence || ''}%"`,
          `"${c.whatsapp || ''}"`,
          `"${c.linkedin_url || ''}"`,
          b.lead_score || 0
        ]);
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agency_decision_makers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter contacts by seniority tier
  const filteredContacts = (result?.contacts || []).filter(c => {
    if (selectedTierFilter === 'ALL') return true;
    return c.seniority_tier === selectedTierFilter;
  });

  const tier1Count = (result?.contacts || []).filter(c => c.seniority_tier === 'TIER_1').length;
  const tier2Count = (result?.contacts || []).filter(c => c.seniority_tier === 'TIER_2').length;
  const tier3Count = (result?.contacts || []).filter(c => c.seniority_tier === 'TIER_3').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Subtitle */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <Compass className="w-5 h-5 text-indigo-600" />
              </span>
              <h1 className="text-xl font-bold text-slate-900">
                ডিপ রিসার্চ ও এক্সিকিউটিভ ডিসিশন মেকার ফাইন্ডার (360° Lead Engine)
              </h1>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              ইমেজ এডিটিং ক্লায়েন্ট হান্টিংয়ের জন্য সরাসরি ওয়েবসাইট বা গুগল ম্যাপস লিঙ্ক থেকে ওনার, ক্রিয়েটিভ ডিরেক্টর ও প্রোডাকশন লিডদের পারসোনাল ভেরিফায়েড ইমেইল, ডিরেক্ট ফোন ও রোল-অ্যাডাপ্টিভ কোল্ড পিচ এক্সট্র্যাক্ট করুন।
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg shrink-0">
            <button
              onClick={() => setActiveMode('single')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeMode === 'single'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              একক ইউআরএল স্ক্যান
            </button>
            <button
              onClick={() => setActiveMode('bulk')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeMode === 'bulk'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              বাল্ক ব্যাচ স্ক্যানার
            </button>
          </div>
        </div>
      </div>

      {/* SINGLE URL SCANNER MODE */}
      {activeMode === 'single' && (
        <div className="space-y-6">
          {/* Input & Scanner Form */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>কোম্পানির ওয়েবসাইট অথবা গুগল ম্যাপসের পূর্ণাঙ্গ লিঙ্ক পেস্ট করুন:</span>
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && handleSingleResearch()}
                    placeholder="e.g. https://milkstudios.com অথবা https://maps.app.goo.gl/... বা Google Maps URL"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
                    disabled={loading}
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>

                <button
                  onClick={() => handleSingleResearch()}
                  disabled={loading || !urlInput.trim()}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 shrink-0"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>গবেষণা চলছে...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>ডিপ রিসার্চ চালান</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Demo Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-600">টেস্ট প্রিসেট:</span>
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setUrlInput(p.url);
                    handleSingleResearch(p.url);
                  }}
                  disabled={loading}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded border border-slate-200 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Realtime Loading Steps Progression */}
          {loading && (
            <div className="bg-white rounded-xl p-6 border border-indigo-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
                  <h3 className="font-semibold text-slate-800 text-base">
                    AI ডিপ রিসার্চ ও এক্সিকিউটিভ হান্টিং প্রক্রিয়াধীন...
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

              {/* Tech Stack & Discovered Social Profiles */}
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
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600">কোনো পাবলিক সোশ্যাল লিঙ্ক পাওয়া যায়নি</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ADVANCED DECISION MAKERS & DIRECT CONTACT INTELLIGENCE SECTION */}
              <div className="p-6 bg-white space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        এক্সিকিউটিভ ও ডিসিশন মেকার ইনটেলিজেন্স ({result.contacts?.length || 0} জন কর্মকর্তা)
                      </h3>
                      <p className="text-xs text-slate-500">
                        সিনিয়রিটি টিয়ারিং, ডিরেক্ট ফোন, Hunter.io স্টাইল ইমেইল ফরম্যাট ও লাইভ জিরো-বাউন্স SMTP টেস্ট
                      </p>
                    </div>
                  </div>

                  {/* Seniority Tier Filters */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setSelectedTierFilter('ALL')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                        selectedTierFilter === 'ALL'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      সকল ({result.contacts?.length || 0})
                    </button>
                    {tier1Count > 0 && (
                      <button
                        onClick={() => setSelectedTierFilter('TIER_1')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                          selectedTierFilter === 'TIER_1'
                            ? 'bg-purple-700 text-white'
                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                      >
                        <Crown className="w-3 h-3" />
                        <span>Tier 1: ওনার / সি-লেভেল ({tier1Count})</span>
                      </button>
                    )}
                    {tier2Count > 0 && (
                      <button
                        onClick={() => setSelectedTierFilter('TIER_2')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                          selectedTierFilter === 'TIER_2'
                            ? 'bg-indigo-700 text-white'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        <Award className="w-3 h-3" />
                        <span>Tier 2: আর্ট / ক্রিয়েটিভ ({tier2Count})</span>
                      </button>
                    )}
                    {tier3Count > 0 && (
                      <button
                        onClick={() => setSelectedTierFilter('TIER_3')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                          selectedTierFilter === 'TIER_3'
                            ? 'bg-blue-700 text-white'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        <Star className="w-3 h-3" />
                        <span>Tier 3: স্টুডিও লিড ({tier3Count})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Contacts Grid */}
                {filteredContacts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredContacts.map((contact, idx) => {
                      const tierColor = contact.seniority_tier === 'TIER_1'
                        ? 'border-purple-200 bg-purple-50/30'
                        : contact.seniority_tier === 'TIER_2'
                        ? 'border-indigo-200 bg-indigo-50/30'
                        : contact.seniority_tier === 'TIER_3'
                        ? 'border-blue-200 bg-blue-50/30'
                        : 'border-slate-200 bg-slate-50/30';

                      const badgeStyle = contact.seniority_tier === 'TIER_1'
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : contact.seniority_tier === 'TIER_2'
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                        : contact.seniority_tier === 'TIER_3'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-slate-100 text-slate-800 border-slate-200';

                      return (
                        <div
                          key={idx}
                          className={`rounded-xl border ${tierColor} p-5 space-y-4 shadow-xs transition-all hover:shadow-md bg-white`}
                        >
                          {/* Card Header: Avatar, Name, Seniority */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                                {contact.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-slate-900 text-sm">
                                    {contact.name}
                                  </h4>
                                  {contact.is_primary && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                      ★ Primary Lead
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-600 font-medium">
                                  {contact.designation || 'Executive'}
                                </div>
                              </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${badgeStyle}`}>
                              {contact.seniority_label || contact.seniority_tier}
                            </span>
                          </div>

                          {/* Contact Details: Email & Phone */}
                          <div className="space-y-2.5 pt-1 text-xs">
                            {/* Email Row */}
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 font-mono text-slate-900 font-semibold truncate">
                                  <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span className="truncate">{contact.email || '—'}</span>
                                </div>

                                {contact.email && (
                                  <button
                                    onClick={() => handleCopyEmail(contact.email, idx)}
                                    className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 shrink-0"
                                    title="Copy email"
                                  >
                                    {copiedEmail === idx ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* Deliverability Badge */}
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                  contact.email_status === 'SMTP_DELIVERABLE'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : contact.email_status === 'CATCH_ALL'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : contact.email_status === 'MX_VERIFIED'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-slate-200 text-slate-700'
                                }`}>
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  <span>
                                    {contact.email_status === 'SMTP_DELIVERABLE'
                                      ? `${contact.email_confidence || 98}% Deliverable • SMTP Confirmed`
                                      : contact.email_status === 'CATCH_ALL'
                                      ? `${contact.email_confidence || 70}% Confidence • Catch-All Domain`
                                      : contact.email_status === 'MX_VERIFIED'
                                      ? `${contact.email_confidence || 80}% Valid • DNS MX Active`
                                      : 'Pattern Derived'}
                                  </span>
                                </span>

                                {/* Permutations Toggle */}
                                {contact.email_permutations?.length > 1 && (
                                  <button
                                    onClick={() => togglePermutations(idx)}
                                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-0.5"
                                  >
                                    <span>বিকল্প ফরম্যাট ({contact.email_permutations.length})</span>
                                    {expandedPermutations[idx] ? (
                                      <ChevronUp className="w-3 h-3" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* Expanded Permutations Box */}
                              {expandedPermutations[idx] && (
                                <div className="mt-2 p-2.5 bg-white rounded border border-indigo-100 space-y-1.5">
                                  <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                    Hunter.io স্টাইল ইমেইল ফরম্যাট ভ্যারিয়েন্ট:
                                  </div>
                                  <div className="space-y-1">
                                    {contact.email_permutations.map((perm, pIdx) => {
                                      const pEmail = typeof perm === 'object' ? perm.email : perm;
                                      const pPattern = typeof perm === 'object' ? perm.pattern : '';
                                      const pConf = typeof perm === 'object' ? perm.confidence : 50;
                                      const key = `${idx}-${pIdx}`;

                                      return (
                                        <div
                                          key={pIdx}
                                          className="flex items-center justify-between text-[11px] font-mono p-1 rounded hover:bg-slate-50"
                                        >
                                          <div className="flex items-center gap-1.5 truncate">
                                            <span className="text-slate-700 truncate">{pEmail}</span>
                                            {pPattern && (
                                              <span className="text-[9px] font-sans px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                                {pPattern} ({pConf}%)
                                              </span>
                                            )}
                                          </div>
                                          <button
                                            onClick={() => handleCopyPermutation(pEmail, key)}
                                            className="p-0.5 text-slate-500 hover:text-slate-800"
                                            title="Copy permutation"
                                          >
                                            {copiedPermutation === key ? (
                                              <Check className="w-3 h-3 text-emerald-600" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Phone & WhatsApp Row */}
                            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-slate-600" />
                                <span className="font-medium text-slate-800">
                                  {contact.phone || result.phone || 'ফোন পাওয়া যায়নি'}
                                </span>
                                {contact.phone_type && (
                                  <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-bold rounded">
                                    {contact.phone_type}
                                  </span>
                                )}
                              </div>

                              {contact.whatsapp_url && (
                                <a
                                  href={contact.whatsapp_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded flex items-center gap-1 transition-colors shadow-2xs"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>সরাসরি WhatsApp</span>
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Footer Actions: LinkedIn & Role Pitch */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                            {contact.linkedin_url ? (
                              <a
                                href={contact.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900"
                              >
                                <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                                <span>LinkedIn প্রোফাইল</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-400">লিঙ্কডইন আনভেরিফায়েড</span>
                            )}

                            {contact.role_pitch && (
                              <button
                                onClick={() => toggleRolePitch(idx)}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 flex items-center gap-1 transition-colors"
                              >
                                <Sparkles className="w-3 h-3 text-indigo-600" />
                                <span>রোল-ভিত্তিক কোল্ড পিচ</span>
                                {expandedRolePitch[idx] ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Role-Adaptive Pitch Card */}
                          {expandedRolePitch[idx] && contact.role_pitch && (
                            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-200 text-slate-800 text-xs font-mono space-y-2 mt-2">
                              <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5 font-sans">
                                <span className="font-bold text-[11px] text-indigo-900">
                                  {contact.name}-এর জন্য নির্দিষ্ট ইমেজ এডিটিং পিচ ({contact.seniority_label}):
                                </span>
                                <button
                                  onClick={() => handleCopyRolePitch(contact.role_pitch, idx)}
                                  className="px-2 py-0.5 bg-white text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 text-[10px] font-bold flex items-center gap-1"
                                >
                                  {copiedRolePitch === idx ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span>কপি সম্পন্ন!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>পিচ কপি করুন</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="whitespace-pre-line leading-relaxed text-[11px] max-h-56 overflow-y-auto p-1 bg-white rounded border border-indigo-100">
                                {contact.role_pitch}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 py-4 text-center">
                    এই টিয়ারে কোনো ডিসিশন মেকার পাওয়া যায়নি।
                  </p>
                )}
              </div>

              {/* Master Company Cold Outreach Pitch */}
              {result.outreach_pitch && (
                <div className="p-6 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-sm font-bold text-slate-900">
                        কোম্পানি-ওয়াইড ইমেজ এডিটিং কোল্ড পিচ (Master Outreach Pitch)
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
                      <th className="px-4 py-3">সিনিয়রিটি টিয়ার</th>
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
                          <td className="px-4 py-3">
                            {firstContact.seniority_label ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                {firstContact.seniority_label}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {firstContact.email ? (
                              <div className="space-y-0.5">
                                <span className="text-emerald-700 font-semibold">{firstContact.email}</span>
                                {firstContact.email_status && (
                                  <div className="text-[9px] text-slate-500 font-sans">
                                    {firstContact.email_status}
                                  </div>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-slate-800">{firstContact.phone || lead.phone || '—'}</div>
                            {firstContact.whatsapp_url && (
                              <a
                                href={firstContact.whatsapp_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 font-bold hover:underline"
                              >
                                WhatsApp
                              </a>
                            )}
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
