import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Send, MessageSquare, Mail, Copy, Check, Phone,
  HelpCircle, ChevronDown, ChevronUp, Sparkles, Building2
} from 'lucide-react';

export default function OutreachAssistant({ companies, apiBase, setBanner }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('trial_sample');
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    // Fetch templates from backend
    axios.get(`${apiBase}/outreach/templates`)
      .then(res => {
        setTemplates(res.data);
        if (res.data.length > 0) {
          setSelectedTemplateId(res.data[0].id);
        }
      })
      .catch(err => console.error("Templates fetch error:", err));

    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id.toString());
    }
  }, [companies, apiBase]);

  const targetComp = companies.find(c => c.id.toString() === selectedCompanyId) || companies[0];
  const targetContact = targetComp?.contacts?.[0];
  const currentTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  const contactName = targetContact?.name || "Studio Director";
  const companyName = targetComp?.name || "your studio";
  const contactEmail = targetContact?.email || targetComp?.website ? `contact@${targetComp?.domain || ''}` : '';
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
      a: 'Response: "That is fantastic! In fact, most of our partner studios in the US & UK have in-house creative directors. They use Picasa & Stencil specifically as an overflow backup during high-volume shoots or for overnight turnaround—so their in-house team never burns out on repetitive clipping paths. Could we handle 5 test images for free to keep us in reserve?"'
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
      a: 'Response: "Every single image passes through a three-tier QC check (Production -> Senior Retoucher -> Lead QC). We offer 100% free unlimited revisions until you are completely satisfied."'
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-xl">
            <Send className="w-5 h-5 text-blue-600" />
            <h2>Cold Outreach & Telemarketing Assistant</h2>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Generate customized WhatsApp messages, cold emails, and telemarketing scripts tailored for Picasa Limited & Stencil Bangladesh prospects.
          </p>
        </div>

        {companies.length > 0 && (
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Target Prospect:</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 w-full md:w-64"
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city || '—'}, {c.country || '—'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template Selection & Preview */}
        <div className="lg:col-span-7 space-y-4">
          {/* Template Chooser */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Select Outreach Angle & Pitch
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {templates.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`p-3 rounded-lg text-left border transition-all text-xs ${
                    selectedTemplateId === tpl.id
                      ? 'border-slate-900 bg-slate-900 text-white font-bold shadow'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <p className="truncate">{tpl.title}</p>
                  <span className={`text-[10px] mt-1 inline-block ${selectedTemplateId === tpl.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    {tpl.channel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Generated Pitch Message Box */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-900">Prospect: {targetComp?.name || 'Selected Studio'}</span>
                <span className="text-xs text-slate-500 ml-2">Contact: {contactName}</span>
              </div>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Script'}</span>
              </button>
            </div>

            {renderedSubject && (
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 mr-2">Email Subject:</span>
                <span className="text-slate-900 font-medium">{renderedSubject}</span>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[160px]">
              {renderedBody || 'Select a company and template to view customized message.'}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {cleanPhone ? (
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(renderedBody)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-2 transition-colors shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send via WhatsApp (+{cleanPhone})</span>
                </a>
              ) : (
                <span className="text-xs text-slate-400 py-2">No phone number on file for WhatsApp</span>
              )}

              {contactEmail ? (
                <a
                  href={`mailto:${contactEmail}?subject=${encodeURIComponent(renderedSubject)}&body=${encodeURIComponent(renderedBody)}`}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-2 transition-colors shadow-sm"
                >
                  <Mail className="w-4 h-4" />
                  <span>Open in Email ({contactEmail})</span>
                </a>
              ) : (
                <span className="text-xs text-slate-400 py-2">No email on file</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Telemarketing Objection Handling Assistant */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-200 text-slate-900 font-bold">
              <Phone className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm">Caller Objection-Handling Cheat Sheet</h3>
            </div>
            <p className="text-xs text-slate-600">
              When cold calling studios and marketing heads, use these proven responses to convert objections into free test samples.
            </p>

            <div className="space-y-3">
              {objectionFaqs.map((faq, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-900 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {openFaq === idx ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {openFaq === idx && (
                    <div className="p-3 bg-white border-t border-slate-200 text-xs text-slate-700 leading-relaxed font-normal">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Production Stats Card */}
          <div className="bg-slate-900 text-white p-5 rounded-xl shadow-sm space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">
              Why Global Studios Choose Us:
            </h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span><strong>Turnaround:</strong> 12-24 Hours Overnight Delivery</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span><strong>Starting Rate:</strong> $0.39 / clipping path | $1.50 retouch</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span><strong>Capacity:</strong> 5,000+ photos/day across 3 shifts</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span><strong>Security:</strong> ISO 27001 NDA & encrypted FTP/Drive storage</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
