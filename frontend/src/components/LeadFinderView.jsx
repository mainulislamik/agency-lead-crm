import React, { useState } from 'react';
import axios from 'axios';
import {
  Sparkles, Search, Globe, MapPin, ShieldCheck,
  CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Building2
} from 'lucide-react';

export default function LeadFinderView({ apiBase, onScrapeSuccess, setBanner }) {
  const [keyword, setKeyword] = useState('Product Photography Studio');
  const [city, setCity] = useState('New York');
  const [country, setCountry] = useState('USA');
  const [limit, setLimit] = useState(5);
  const [autoVerify, setAutoVerify] = useState(true);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const nichePresets = [
    "E-Commerce Product Photography",
    "Fashion & Apparel Retouching Studio",
    "Commercial Advertising Agency",
    "Real Estate Photo Studio",
    "Jewelry Photography & Retouching",
    "Amazon Brand Image Studio"
  ];

  const countryPresets = ["USA", "UK", "Germany", "Canada", "Australia", "France"];
  const cityPresets = {
    USA: ["New York", "Los Angeles", "Chicago", "Miami"],
    UK: ["London", "Manchester", "Birmingham"],
    Germany: ["Berlin", "Munich", "Hamburg"],
    Canada: ["Toronto", "Vancouver", "Montreal"],
    Australia: ["Sydney", "Melbourne", "Brisbane"],
    France: ["Paris", "Lyon", "Marseille"]
  };

  const handleStartSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);

    try {
      const res = await axios.post(`${apiBase}/leads/generate`, {
        keyword,
        city,
        country,
        limit: parseInt(limit, 10),
        auto_verify: autoVerify
      });
      setResults(res.data);
      setBanner({
        text: `Successfully generated & enriched ${res.data.length} new studio leads!`,
        type: 'success'
      });
      onScrapeSuccess();
      setTimeout(() => setBanner(null), 4000);
    } catch (err) {
      alert("Lead generation error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Intro Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
        <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
          <Sparkles className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Intelligent B2B Lead Generator & Web Crawler
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Automatically discover photography studios, e-commerce brands, and creative agencies worldwide. Deep-crawls official websites for emails, direct phones, social links, and runs zero-bounce DNS MX validation.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <form onSubmit={handleStartSearch} className="space-y-5">
          {/* Target Niche */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Target Studio Niche / Service
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
              {nichePresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setKeyword(preset)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-colors ${
                    keyword === preset
                      ? 'border-slate-900 bg-slate-900 text-white font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Or enter custom niche (e.g. High-End Beauty Retoucher)"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Geography */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                2. Target Country
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {countryPresets.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCountry(c);
                      if (cityPresets[c]) setCity(cityPresets[c][0]);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-md border font-semibold ${
                      country === c
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country Name"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                3. Target City
              </label>
              {cityPresets[country] && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {cityPresets[country].map((ct) => (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => setCity(ct)}
                      className={`px-2.5 py-1 text-xs rounded-md border font-semibold ${
                        city === ct
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {ct}
                    </button>
                  ))}
                </div>
              )}
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City Name"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Depth & Verification Controls */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <label className="text-xs font-bold text-slate-700">Leads Quantity:</label>
              <select
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
              >
                <option value={3}>3 Leads (Fast Test)</option>
                <option value={5}>5 Leads (Standard)</option>
                <option value={10}>10 Leads (Batch)</option>
                <option value={20}>20 Leads (Deep Scan)</option>
              </select>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoVerify}
                onChange={(e) => setAutoVerify(e.target.checked)}
                className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
              />
              <span className="text-xs font-bold text-slate-800">
                Auto-run DNS MX Verification (Zero-Bounce)
              </span>
            </label>
          </div>

          {/* Submit Trigger */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Scanning Google Maps, Websites & Validating MX...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Launch Live Lead Discovery</span>
              </>
            )}
          </button>
        </form>

        {/* Live Scan Results Feed */}
        {results && (
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Discovered {results.length} Qualified Studios</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.map((c) => (
                <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate">{c.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {c.lead_score}% Quality
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{c.city}, {c.country}</p>
                  <p className="text-[11px] font-mono text-slate-700 truncate">{c.contacts?.[0]?.email || 'No email'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
