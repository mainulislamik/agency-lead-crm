import React, { useState } from 'react';
import axios from 'axios';
import { PhoneCall, X, Calendar, User, FileText, CheckCircle2 } from 'lucide-react';

export default function CallLogModal({ company, apiBase, onClose, onSuccess, setBanner }) {
  const [callerName, setCallerName] = useState('Sales Rep');
  const [callStatus, setCallStatus] = useState('Sample Requested');
  const [nextFollowup, setNextFollowup] = useState('');
  const [notes, setNotes] = useState('');
  const [contactId, setContactId] = useState(company.contacts?.[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);

  const outcomes = [
    "Sample Requested",
    "Interested - Send Rate Card",
    "Follow Up Needed",
    "Left Voicemail / Message",
    "Busy - Call Later",
    "In-House Team Only",
    "Not Interested",
    "Converted to Client"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${apiBase}/companies/${company.id}/calls`, {
        company_id: company.id,
        contact_id: contactId ? parseInt(contactId, 10) : null,
        caller_name: callerName,
        call_status: callStatus,
        notes: notes,
        next_followup_date: nextFollowup || null
      });
      setBanner({ text: `Call log recorded for ${company.name}!`, type: 'success' });
      onSuccess();
      onClose();
      setTimeout(() => setBanner(null), 3000);
    } catch (err) {
      alert("Failed to save call log: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PhoneCall className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Log Sales Outreach Call</h3>
              <p className="text-[11px] text-slate-300 truncate max-w-xs">{company.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Outreach Rep</label>
              <input
                type="text"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Decision Maker</label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {company.contacts?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.designation || 'Lead'})
                  </option>
                ))}
                <option value="">General Studio Reception</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Call Outcome</label>
            <select
              value={callStatus}
              onChange={(e) => setCallStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {outcomes.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Next Follow-up Reminder</label>
            <input
              type="text"
              value={nextFollowup}
              onChange={(e) => setNextFollowup(e.target.value)}
              placeholder="e.g. Next Tuesday 3:00 PM EST"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Call Notes & Objection Discussion</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Client interested in clipping path for 500 apparel shots. Wants test sample first..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Call Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
