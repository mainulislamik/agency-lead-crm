import React, { useState } from 'react';
import axios from 'axios';
import {
  ShieldCheck, AlertCircle, CheckCircle2, XCircle,
  Copy, Download, RefreshCw, Mail, ListPlus
} from 'lucide-react';

export default function DnsVerifierView({ apiBase }) {
  // Single email state
  const [singleEmail, setSingleEmail] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleResult, setSingleResult] = useState(null);

  // Bulk email state
  const [bulkInput, setBulkInput] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState([]);

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
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Intro Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Zero-Bounce DNS Email Verification Engine
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Live DNS MX record validation and disposable domain detection. Safeguards your email domain reputation when reaching out to international photography studios, fashion brands, and creative directors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Instant Single Email Check */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <Mail className="w-4 h-4 text-blue-600" />
            <h3>Instant Single Email Lookup</h3>
          </div>

          <form onSubmit={handleSingleVerify} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Target Email Address
              </label>
              <input
                type="email"
                value={singleEmail}
                onChange={(e) => setSingleEmail(e.target.value)}
                placeholder="e.g. contact@picasalimited.com"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={singleLoading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {singleLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking DNS MX Records...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verify Email Validity</span>
                </>
              )}
            </button>
          </form>

          {singleResult && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 mt-4 ${
              singleResult.status === 'VERIFIED'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : singleResult.status === 'CATCH_ALL'
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : 'bg-rose-50/70 border-rose-200 text-rose-950'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider">Status:</span>
                <span className={`px-2 py-0.5 rounded font-black text-[11px] ${
                  singleResult.status === 'VERIFIED'
                    ? 'bg-emerald-200 text-emerald-900'
                    : singleResult.status === 'CATCH_ALL'
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-rose-200 text-rose-900'
                }`}>
                  {singleResult.status}
                </span>
              </div>
              <p className="font-mono font-bold text-slate-900 truncate">{singleResult.email}</p>
              <p className="text-[11px]">{singleResult.message}</p>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                <span>MX Host: {singleResult.has_mx ? 'Active ✓' : 'Missing ✗'}</span>
                <span>Disposable: {singleResult.is_disposable ? 'Yes (Block)' : 'No (Safe)'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Bulk Paste & Verify */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <ListPlus className="w-4 h-4 text-emerald-600" />
              <h3>Bulk Email Batch Validator</h3>
            </div>
            {bulkResults.length > 0 && (
              <button
                onClick={exportVerifiedCSV}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-semibold flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export ({bulkResults.length})</span>
              </button>
            )}
          </div>

          <form onSubmit={handleBulkVerify} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Paste Multiple Emails (one per line or comma-separated)
              </label>
              <textarea
                rows={4}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="studio@fashionshoot.com&#10;director@commercialphoto.co.uk&#10;info@retouchingagency.de"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={bulkLoading || !bulkInput.trim()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {bulkLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating Batch MX Records...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verify Batch List</span>
                </>
              )}
            </button>
          </form>

          {/* Results List */}
          {bulkResults.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">MX Server</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {bulkResults.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-900 truncate max-w-[200px]">{r.email}</td>
                      <td className="py-2 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                          r.status === 'CATCH_ALL' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 font-sans">{r.has_mx ? 'Active ✓' : 'No MX ✗'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
