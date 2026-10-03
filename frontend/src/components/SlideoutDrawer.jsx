import React, { useState } from 'react';
import axios from 'axios';
import {
  X, Building2, Globe, MapPin, Phone, Mail, MessageSquare,
  Award, ShieldCheck, Users, PhoneCall, Plus, Trash2, ExternalLink
} from 'lucide-react';

export default function SlideoutDrawer({
  company,
  apiBase,
  onClose,
  onRefresh,
  onOpenCallModal,
  setBanner
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'contacts' | 'calls' | 'pitch'
  const [addingContact, setAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    designation: '',
    email: '',
    phone: '',
    whatsapp: '',
    linkedin_url: ''
  });

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.put(`${apiBase}/companies/${company.id}`, { lead_status: newStatus });
      setBanner({ text: `Lead stage updated to ${newStatus}`, type: 'success' });
      onRefresh();
      setTimeout(() => setBanner(null), 2500);
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${apiBase}/companies/${company.id}/contacts`, newContact);
      setBanner({ text: `Contact added to ${company.name}`, type: 'success' });
      setAddingContact(false);
      setNewContact({ name: '', designation: '', email: '', phone: '', whatsapp: '', linkedin_url: '' });
      onRefresh();
      setTimeout(() => setBanner(null), 2500);
    } catch (err) {
      alert("Failed to add contact: " + err.message);
    }
  };

  const handleDeleteCompany = async () => {
    if (!window.confirm(`Are you sure you want to delete ${company.name}?`)) return;
    try {
      await axios.delete(`${apiBase}/companies/${company.id}`);
      setBanner({ text: `Company deleted`, type: 'info' });
      onClose();
      onRefresh();
      setTimeout(() => setBanner(null), 2500);
    } catch (err) {
      alert("Failed to delete company: " + err.message);
    }
  };

  const primaryContact = company.contacts?.[0];
  const cleanPhone = (primaryContact?.whatsapp || primaryContact?.phone || company.phone || '').replace(/[^0-9]/g, '');

  const quickPitchText = `Hi ${primaryContact?.name || 'Studio Team'},\n\nI noticed your work at ${company.name}. We are an international post-production and image editing facility with 24/7 overnight delivery.\n\nCould we edit 3-5 trial RAW images for free as a quality test?\n\nwww.picasalimited.com | www.stencilbangladesh.com`;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
          <div className="space-y-1 pr-4">
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                (company.lead_score || 50) >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                'bg-slate-800 text-slate-300'
              }`}>
                {company.lead_score || 50}% Lead Viability
              </span>
              <span className="text-xs text-slate-400 font-mono">ID #{company.id}</span>
            </div>
            <h2 className="text-lg font-bold text-white truncate max-w-md">{company.name}</h2>
            <p className="text-xs text-slate-300 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{company.city || '—'}, {company.country || '—'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'overview' ? 'border-slate-900 text-slate-900' : 'border-transparent hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'contacts' ? 'border-slate-900 text-slate-900' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <span>Decision Makers</span>
            <span className="bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded-full text-[10px]">
              {company.contacts?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'calls' ? 'border-slate-900 text-slate-900' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <span>Call History</span>
            <span className="bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded-full text-[10px]">
              {company.call_logs?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('pitch')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'pitch' ? 'border-slate-900 text-slate-900' : 'border-transparent hover:text-slate-900'
            }`}
          >
            1-Click Pitch
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Pipeline Stage Controller */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Current Pipeline Milestone
                </label>
                <select
                  value={company.lead_status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {['New', 'Verified', 'Contacted', 'Sample Sent', 'Converted', 'Lost'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Company Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Website</span>
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline flex items-center space-x-1 truncate font-medium"
                    >
                      <span className="truncate">{company.website.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  ) : <span className="text-slate-400">—</span>}
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Industry / Niche</span>
                  <span className="font-bold text-slate-900">{company.industry || '—'}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Direct Phone</span>
                  <span className="font-mono font-bold text-slate-900">{company.phone || '—'}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Google Rating</span>
                  <span className="font-bold text-slate-900">
                    {company.rating ? `★ ${company.rating} (${company.reviews_count} reviews)` : '—'}
                  </span>
                </div>
              </div>

              {/* Full Address */}
              <div>
                <span className="text-xs font-semibold text-slate-500 block mb-1">Office / Studio Address</span>
                <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {company.address || '—'}
                </p>
              </div>

              {/* Danger Zone */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Remove from database</span>
                <button
                  onClick={handleDeleteCompany}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Lead</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DECISION MAKERS */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Verified Studio Contacts</h3>
                <button
                  onClick={() => setAddingContact(!addingContact)}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{addingContact ? 'Cancel' : 'Add Contact'}</span>
                </button>
              </div>

              {addingContact && (
                <form onSubmit={handleAddContact} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Contact Name *"
                      required
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-medium"
                    />
                    <input
                      type="text"
                      placeholder="Role (e.g. Creative Director)"
                      value={newContact.designation}
                      onChange={(e) => setNewContact({ ...newContact, designation: e.target.value })}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-medium"
                    />
                    <input
                      type="text"
                      placeholder="Phone / WhatsApp"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value, whatsapp: e.target.value })}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-slate-900 text-white font-bold rounded"
                  >
                    Save Contact Person
                  </button>
                </form>
              )}

              {/* Contact list */}
              <div className="space-y-3">
                {company.contacts?.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No decision makers added yet.</p>
                ) : (
                  company.contacts.map((c) => (
                    <div key={c.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2 text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                          <p className="text-slate-500 font-medium">{c.designation || 'Lead Contact'}</p>
                        </div>
                        {c.email_status && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.email_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                            c.email_status === 'CATCH_ALL' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {c.email_status}
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-4 text-[11px]">
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline flex items-center space-x-1 font-mono">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{c.email}</span>
                          </a>
                        )}
                        {(c.phone || c.whatsapp) && (
                          <span className="text-slate-700 flex items-center space-x-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{c.phone || c.whatsapp}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CALL LOGS */}
          {activeTab === 'calls' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Outreach Timeline</h3>
                <button
                  onClick={() => onOpenCallModal(company)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center space-x-1 shadow-sm"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>+ Record New Call</span>
                </button>
              </div>

              <div className="space-y-3">
                {company.call_logs?.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No sales calls recorded yet.</p>
                ) : (
                  company.call_logs.map((log) => (
                    <div key={log.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{log.call_status}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200 text-[11px] leading-relaxed">
                          {log.notes}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span>Rep: {log.caller_name}</span>
                        {log.next_followup_date && (
                          <span className="font-bold text-indigo-700">Next: {log.next_followup_date}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: 1-CLICK PITCH */}
          {activeTab === 'pitch' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Instant Outreach Pitch</h3>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-slate-700 font-mono whitespace-pre-wrap text-[11px] leading-relaxed">
                  {quickPitchText}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {cleanPhone && (
                  <a
                    href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(quickPitchText)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center space-x-2 text-center shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Open in WhatsApp</span>
                  </a>
                )}
                {primaryContact?.email && (
                  <a
                    href={`mailto:${primaryContact.email}?subject=Quick question for ${encodeURIComponent(company.name)}&body=${encodeURIComponent(quickPitchText)}`}
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center space-x-2 text-center shadow-sm"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Open in Email</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
