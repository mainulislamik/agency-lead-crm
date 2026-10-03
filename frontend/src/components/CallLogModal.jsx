import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  PhoneCall, X, Calendar, User, FileText, CheckCircle2,
  Clock, Play, Pause, RotateCcw, Sparkles
} from 'lucide-react';

export default function CallLogModal({ company, apiBase, onClose, onSuccess, setBanner }) {
  const [callerName, setCallerName] = useState('Sales Agent');
  const [contactId, setContactId] = useState(company.contacts?.[0]?.id || '');
  const [callStatus, setCallStatus] = useState('Sample Requested');
  const [notes, setNotes] = useState('');
  const [nextFollowup, setNextFollowup] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Live Call Timer state
  const [seconds, setSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(true);

  useEffect(() => {
    let interval = null;
    if (timerActive) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else if (!timerActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive, seconds]);

  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const dispositions = [
    { label: 'Sample Requested', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
    { label: 'Follow Up Needed', color: 'bg-blue-50 text-blue-700 border-blue-300' },
    { label: 'Interested', color: 'bg-indigo-50 text-indigo-700 border-indigo-300' },
    { label: 'Price Inquiry', color: 'bg-amber-50 text-amber-700 border-amber-300' },
    { label: 'Left Voicemail', color: 'bg-slate-50 text-slate-700 border-slate-300' },
    { label: 'Busy / Callback', color: 'bg-purple-50 text-purple-700 border-purple-300' },
    { label: 'Not Interested', color: 'bg-rose-50 text-rose-700 border-rose-300' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${apiBase}/calls`, {
        company_id: company.id,
        contact_id: contactId ? parseInt(contactId) : null,
        caller_name: callerName,
        call_status: callStatus,
        notes: notes ? `[Duration: ${formatTime(seconds)}] ${notes}` : `[Duration: ${formatTime(seconds)}] Call completed.`,
        next_followup_date: nextFollowup || null
      });

      // If sample requested, optionally advance stage
      if (callStatus === 'Sample Requested') {
        await axios.put(`${apiBase}/companies/${company.id}`, {
          lead_status: 'Sample Sent'
        });
      }

      setBanner({ text: `Call log recorded (${formatTime(seconds)})!`, type: 'success' });
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header & Live Timer */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Active Call Dialing Assistant</h3>
              <p className="text-[11px] text-slate-500 font-medium">{company.name}</p>
            </div>
          </div>

          {/* Stopwatch Pill */}
          <div className="flex items-center space-x-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl font-mono text-xs shadow-xs">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold tracking-wider">{formatTime(seconds)}</span>
            <button
              type="button"
              onClick={() => setTimerActive(!timerActive)}
              className="text-slate-300 hover:text-white pl-1"
            >
              {timerActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-emerald-400" />}
            </button>
            <button
              type="button"
              onClick={() => { setSeconds(0); setTimerActive(false); }}
              className="text-slate-400 hover:text-white"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Quick Pitch Snippet Reminder */}
        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 space-y-1">
          <div className="flex items-center space-x-1 font-bold text-indigo-950">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Target Pitch Line:</span>
          </div>
          <p className="italic">
            "We provide 24/7 overnight RAW clipping and high-end retouching for commercial studios starting from $0.39. Can we process 3-5 test images for free today?"
          </p>
        </div>

        {/* Call Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Target Contact</label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
            >
              {company.contacts?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.designation || 'Contact'}) — {c.phone || c.email || 'Direct'}
                </option>
              ))}
              <option value="">General / Reception</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Call Disposition / Outcome</label>
            <div className="grid grid-cols-2 gap-2">
              {dispositions.map(d => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setCallStatus(d.label)}
                  className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] font-bold transition-all ${
                    callStatus === d.label
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Next Follow-Up Date & Time</label>
            <input
              type="date"
              value={nextFollowup}
              onChange={(e) => setNextFollowup(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Call Notes & Action Items</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Spoke with Studio Director, requested 5 test jewelry images via Dropbox, follow up Monday at 10 AM..."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{submitting ? 'Saving...' : 'Save Call & Finish'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
