import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Send, MessageSquare, Mail, Copy, Check, Phone,
  HelpCircle, ChevronDown, ChevronUp, Sparkles, Building2,
  Calendar, Clock, CheckCircle2, RefreshCw
} from 'lucide-react';

export default function OutreachAssistant({ companies, apiBase, setBanner }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [templates, setTemplates] = useState([]);
  const [cadenceSteps, setCadenceSteps] = useState([]);
  const [activeMode, setActiveMode] = useState('single'); // 'single' | 'cadence'
  const [selectedTemplateId, setSelectedTemplateId] = useState('trial_sample');
  const [selectedCadenceStep, setSelectedCadenceStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    // Fetch single templates
    axios.get(`${apiBase}/outreach/templates`)
      .then(res => {
        setTemplates(res.data);
        if (res.data.length > 0) setSelectedTemplateId(res.data[0].id);
      })
      .catch(err => console.error("Templates fetch error:", err));

    // Fetch multi-touch cadence templates
    axios.get(`${apiBase}/cadence/templates`)
      .then(res => {
        setCadenceSteps(res.data);
      })
      .catch(err => console.error("Cadence fetch error:", err));

    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id.toString());
    }
  }, [companies, apiBase]);

  const targetComp = companies.find(c => c.id.toString() === selectedCompanyId) || companies[0];
  const targetContact = targetComp?.contacts?.[0];
  
  const currentSingle = templates.find(t => t.id === selectedTemplateId) || templates[0];
  const currentCadence = cadenceSteps.find(s => s.step === selectedCadenceStep) || cadenceSteps[0];

  const currentTemplate = activeMode === 'single' ? currentSingle : currentCadence;

  const contactName = targetContact?.name || "Studio Director";
  const companyName = targetComp?.name || "your studio";
  const contactEmail = targetContact?.email || (targetComp?.website ? `contact@${targetComp?.domain || ''}` : '');
  const contactPhone = targetContact?.whatsapp || targetContact?.phone || targetComp?.phone || '';
  const cleanPhone = contactPhone.replace(/[^0-9]/g, '');

  const renderedSubject = currentTemplate?.subject
    ? currentTemplate.subject.replace('{company_name}', companyName).replace('{contact_name}', contactName)
    : '';

  const renderedBody = currentTemplate?.body
    ? currentTemplate.body.replace(/{company_name}/g, companyName).replace(/{contact_name}/g, contactName)
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(`${renderedSubject ? `Subject: ${renderedSubject}\n\n` : ''}${renderedBody}`);
    setCopied(true);
    setBanner({ text: 'Pitch copied to clipboard!', type: 'success' });
    setTimeout(() => setCopied(false), 2000);
  };

  const objectionFaqs = [
    {
      q: 'Client says: "We already have an in-house editor or studio team"',
      a: 'Response: "That is fantastic! In fact, most of our partner studios in the US & UK have in-house creative directors. They use us specifically as an overflow backup during high-volume shoots or for overnight turnaround—so their in-house team never burns out on repetitive clipping paths. Could we handle 5 test images for free to keep us in reserve?"'
    },
    {
      q: 'Client asks: "What is your pricing?"',
      a: 'Response: "Our simple clipping path starts from just $0.39/image, and high-end model/jewelry retouching starts from $1.50 with unlimited revisions. Because of our 24/7 shifts, you upload at the end of your day and wake up with finished images."'
    },
    {
      q: 'Client asks: "Where is your production facility based?"',
      a: 'Response: "Our production studio is in Dhaka, Bangladesh (picasalimited.com / stencilbangladesh.com) with over 150+ professional retouchers working around the clock under ISO-compliant data security protocols for international brands."'
    },
    {
      q: 'Client asks: "How do you handle QC (Quality Control) & revisions?"',
      a: 'Response: "We use a rigorous 3-layer QC protocol: First, the senior retoucher completes the work; second, a Quality Auditor verifies edge smoothness and clipping masks; third, the Art Director signs off before export. Plus, we offer 100% free unlimited revisions."'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Selector Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Target Lead Profile</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="mt-0.5 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.city || 'Global'} ({c.lead_score || 50}% Score)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveMode('single')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              activeMode === 'single' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Standalone Pitches
          </button>
          <button
            onClick={() => setActiveMode('cadence')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center space-x-1 ${
              activeMode === 'cadence' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>4-Touch Cadence</span>
          </button>
        </div>
      </div>

      {/* Main Pitching Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Template / Sequence Selection */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {activeMode === 'single' ? 'Sales Script Presets' : 'Cadence Timeline (14-Day)'}
            </h3>

            {activeMode === 'single' ? (
              <div className="space-y-2">
                {templates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`w-full text-left p-3 rounded-lg border text-xs font-bold transition-all ${
                      selectedTemplateId === tpl.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{tpl.name}</span>
                      <span className="text-[10px] font-mono opacity-80">{tpl.category}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {cadenceSteps.map(step => (
                  <button
                    key={step.step}
                    onClick={() => setSelectedCadenceStep(step.step)}
                    className={`w-full text-left p-3 rounded-lg border text-xs font-bold transition-all ${
                      selectedCadenceStep === step.step
                        ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-indigo-400 font-mono">{step.day}</span>
                      <span className="text-[10px] opacity-75">Touch #{step.step}</span>
                    </div>
                    <div className="text-xs">{step.title}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Target Details Pill */}
          {targetComp && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Recipient Overview</span>
              <div className="font-bold text-slate-900 text-sm">{contactName}</div>
              <div className="text-slate-500 text-[11px]">{targetContact?.designation || 'Key Decision Maker'}</div>
              <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-mono text-slate-800">{contactEmail || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-mono text-slate-800">{contactPhone || '—'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Middle & Right: Live Rendered Pitch & Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  {activeMode === 'single' ? currentTemplate?.category : currentCadence?.day}
                </span>
                <h3 className="text-base font-bold text-slate-900">{currentTemplate?.title || currentTemplate?.name}</h3>
              </div>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Script'}</span>
              </button>
            </div>

            {/* Subject Line */}
            {renderedSubject && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-500 block mb-1">EMAIL SUBJECT:</span>
                <p className="font-semibold text-slate-900 select-all font-mono">{renderedSubject}</p>
              </div>
            )}

            {/* Script Body */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono leading-relaxed whitespace-pre-wrap text-slate-800 select-all max-h-96 overflow-y-auto">
              {renderedBody}
            </div>

            {/* 1-Click Launch Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {cleanPhone ? (
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(renderedBody)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send via WhatsApp (+{cleanPhone})</span>
                </a>
              ) : (
                <button
                  disabled
                  className="py-3 px-4 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 cursor-not-allowed"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>No Phone/WhatsApp on file</span>
                </button>
              )}

              {contactEmail ? (
                <a
                  href={`mailto:${contactEmail}?subject=${encodeURIComponent(renderedSubject)}&body=${encodeURIComponent(renderedBody)}`}
                  className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>Open in Mail Client ({contactEmail})</span>
                </a>
              ) : (
                <button
                  disabled
                  className="py-3 px-4 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 cursor-not-allowed"
                >
                  <Mail className="w-4 h-4" />
                  <span>No verified email found</span>
                </button>
              )}
            </div>
          </div>

          {/* Telemarketing Objection Handling Accordion */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-slate-900" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Cold Call Objection Battlecards (Post-Production Specific)
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              {objectionFaqs.map((faq, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full text-left p-3.5 bg-slate-50 hover:bg-slate-100 font-bold text-slate-800 flex items-center justify-between transition-colors"
                  >
                    <span>{faq.q}</span>
                    {openFaq === idx ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {openFaq === idx && (
                    <div className="p-4 bg-white border-t border-slate-200 text-slate-700 leading-relaxed font-sans text-xs">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
