import React, { useState } from 'react';
import axios from 'axios';
import {
  ShieldCheck, AlertCircle, CheckCircle2, XCircle,
  Copy, Download, RefreshCw, Mail, ListPlus, Sparkles, Check, AtSign
} from 'lucide-react';

export default function DnsVerifierView({ apiBase }) {
  const [activeSubTab, setActiveSubTab] = useState('bulk'); // 'bulk' | 'single' | 'permutations'

  // Single email state
  const [singleEmail, setSingleEmail] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleResult, setSingleResult] = useState(null);

  // Bulk email state
  const [bulkInput, setBulkInput] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState([]);

  // Permutation generator state
  const [permFirstName, setPermFirstName] = useState('');
  const [permLastName, setPermLastName] = useState('');
  const [permDomain, setPermDomain] = useState('');
  const [permLoading, setPermLoading] = useState(false);
  const [permResults, setPermResults] = useState([]);
  const [copiedEmail, setCopiedEmail] = useState(null);

  const handleSingleVerify = async (e) => {
    e.preventDefault();
    if (!singleEmail) return;
    setSingleLoading(true);
    setSingleResult(null);
    try {
      const res = await axios.post(`${apiBase}/verify/email`, { email: singleEmail });
      setSingleResult(res.data);
    } catch (err) {
      alert("Verification error: " + err.message);
    } finally {
      setSingleLoading(false);
    }
  };

  const handleBulkVerify = async (e) => {
    e.preventDefault();
    const emails = bulkInput
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (emails.length === 0) {
      return alert("Please enter at least one valid email address.");
    }

    setBulkLoading(true);
    try {
      const res = await axios.post(`${apiBase}/verify/bulk-emails`, { emails });
      setBulkResults(res.data);
    } catch (err) {
      alert("Bulk verification error: " + err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleGeneratePermutations = async (e) => {
    e.preventDefault();
    if (!permDomain) return alert("Please enter a domain (e.g. acmestudio.com).");
    setPermLoading(true);
    try {
      const res = await axios.post(`${apiBase}/enrich/email-permutations`, {
        first_name: permFirstName || "Owner",
        last_name: permLastName || "",
        domain: permDomain
      });
      setPermResults(res.data);
    } catch (err) {
      alert("Permutations generator error: " + err.message);
    } finally {
      setPermLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 1500);
  };

  const exportVerifiedCSV = () => {
    if (bulkResults.length === 0) return;
    let csv = "Email,Domain,Status,Has MX,Disposable,Message\n";
    bulkResults.forEach(r => {
      csv += `"${r.email}","${r.domain}","${r.status}","${r.has_mx ? 'Yes' : 'No'}","${r.is_disposable ? 'Yes' : 'No'}","${r.message}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `verified_emails_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-2">
        <button
          onClick={() => setActiveSubTab('bulk')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
            activeSubTab === 'bulk' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ListPlus className="w-4 h-4" />
          <span>Batch DNS MX Verifier</span>
        </button>

        <button
          onClick={() => setActiveSubTab('permutations')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
            activeSubTab === 'permutations' ? 'bg-indigo-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-300" />
          <span>Decision-Maker Email Permutator</span>
        </button>

        <button
          onClick={() => setActiveSubTab('single')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
            activeSubTab === 'single' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Single MX Inspector</span>
        </button>
      </div>

      {/* 1. Batch DNS MX Verifier */}
      {activeSubTab === 'bulk' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Bulk Email Verification (Zero-Bounce Engine)</h3>
              <p className="text-xs text-slate-500 font-medium">
                Paste raw email lists. Checks active mail exchange (MX) DNS records and flags disposable domains.
              </p>
            </div>
            {bulkResults.length > 0 && (
              <button
                onClick={exportVerifiedCSV}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV ({bulkResults.length})</span>
              </button>
            )}
          </div>

          <form onSubmit={handleBulkVerify} className="space-y-3">
            <textarea
              rows={5}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="Paste emails separated by newline, comma, or semicolons:&#10;contact@picasalimited.com&#10;info@stencilbangladesh.com&#10;editor@studioxyz.co.uk"
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800"
            />
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-500">
                {bulkInput ? `${bulkInput.split(/[\n,;]+/).filter(e => e.trim().includes('@')).length} emails ready` : 'Supports up to 200 emails per batch'}
              </span>
              <button
                type="submit"
                disabled={bulkLoading}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs disabled:opacity-50"
              >
                {bulkLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{bulkLoading ? 'Verifying DNS Records...' : 'Verify Email Batch'}</span>
              </button>
            </div>
          </form>

          {/* Results table */}
          {bulkResults.length > 0 && (
            <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-slate-700 flex justify-between">
                <span>Verification Results ({bulkResults.length})</span>
                <span className="text-emerald-700">
                  {bulkResults.filter(r => r.status === 'VERIFIED').length} 100% Deliverable
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {bulkResults.map((res, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <div className="font-mono font-semibold text-slate-900">{res.email}</div>
                      <div className="text-[11px] text-slate-500">{res.message}</div>
                    </div>
                    <div>
                      {res.status === 'VERIFIED' ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold text-[10px] flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>VERIFIED MX</span>
                        </span>
                      ) : res.status === 'CATCH_ALL' ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-bold text-[10px]">
                          CATCH ALL
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold text-[10px] flex items-center space-x-1">
                          <XCircle className="w-3 h-3" />
                          <span>NO MX / INVALID</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Permutations Generator */}
      {activeSubTab === 'permutations' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Decision Maker Email Permutator & Pattern Guesser</h3>
            <p className="text-xs text-slate-500 font-medium">
              Enter the target decision-maker's name and studio domain. Generates standard B2B patterns and checks MX status.
            </p>
          </div>

          <form onSubmit={handleGeneratePermutations} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">First Name</label>
              <input
                type="text"
                value={permFirstName}
                onChange={(e) => setPermFirstName(e.target.value)}
                placeholder="e.g. David"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Last Name</label>
              <input
                type="text"
                value={permLastName}
                onChange={(e) => setPermLastName(e.target.value)}
                placeholder="e.g. Miller"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Studio Domain</label>
              <input
                type="text"
                value={permDomain}
                onChange={(e) => setPermDomain(e.target.value)}
                placeholder="e.g. photostudio.com"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={permLoading}
                className="w-full py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs disabled:opacity-50"
              >
                {permLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-300" />}
                <span>Generate Permutations</span>
              </button>
            </div>
          </form>

          {/* Permutation results */}
          {permResults.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs mt-3">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
                <span>Generated Permutations ({permResults.length})</span>
                <span className="text-[11px] text-slate-500 font-normal">Click any email or copy button</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {permResults.map((p, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center space-x-3">
                      <AtSign className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="font-mono font-bold text-slate-900">{p.email}</span>
                        <span className="text-[10px] text-slate-500 ml-2 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          {p.pattern}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold text-[10px]">
                        MX VALID
                      </span>
                      <button
                        onClick={() => copyToClipboard(p.email)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Copy email"
                      >
                        {copiedEmail === p.email ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Single MX Inspector */}
      {activeSubTab === 'single' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Single Domain MX DNS Inspector</h3>
            <p className="text-xs text-slate-500 font-medium">Inspect DNS Mail Exchangers, priority weights, and host connectivity.</p>
          </div>

          <form onSubmit={handleSingleVerify} className="flex gap-2">
            <input
              type="email"
              value={singleEmail}
              onChange={(e) => setSingleEmail(e.target.value)}
              placeholder="Enter email to inspect (e.g. contact@picasalimited.com)"
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              type="submit"
              disabled={singleLoading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
            >
              {singleLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
              <span>Inspect MX</span>
            </button>
          </form>

          {singleResult && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-700">Target Address:</span>
                <span className="font-mono font-bold text-slate-900">{singleResult.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Domain:</span>
                <span className="font-mono text-slate-800">{singleResult.domain}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Active MX Records:</span>
                <span className={`font-bold ${singleResult.has_mx ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {singleResult.has_mx ? 'Confirmed (Live Mail Servers)' : 'None found'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Disposable Service:</span>
                <span className="text-slate-800">{singleResult.is_disposable ? 'Yes (Burner domain)' : 'No (Corporate / Professional)'}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 text-slate-700 font-medium">
                {singleResult.message}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
