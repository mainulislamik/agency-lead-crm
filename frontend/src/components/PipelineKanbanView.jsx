import React from 'react';
import axios from 'axios';
import {
  Building2, Users, PhoneCall, ChevronLeft, ChevronRight,
  MessageSquare, ExternalLink, MapPin, Award
} from 'lucide-react';

export default function PipelineKanbanView({
  companies,
  apiBase,
  onSelectCompany,
  onOpenCallModal,
  onRefresh,
  setBanner
}) {
  const stages = [
    { key: 'New', label: 'New Leads', color: 'border-slate-300 bg-slate-50 text-slate-700' },
    { key: 'Verified', label: 'DNS Verified', color: 'border-sky-300 bg-sky-50 text-sky-800' },
    { key: 'Contacted', label: 'Contacted / Pitched', color: 'border-blue-300 bg-blue-50 text-blue-800' },
    { key: 'Sample Sent', label: 'Trial Sample Sent', color: 'border-indigo-300 bg-indigo-50 text-indigo-800' },
    { key: 'Converted', label: 'Converted Client', color: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
    { key: 'Lost', label: 'Lost / Closed', color: 'border-rose-300 bg-rose-50 text-rose-800' }
  ];

  const handleMoveStage = async (companyId, currentStage, direction) => {
    const stageKeys = stages.map(s => s.key);
    const currentIndex = stageKeys.indexOf(currentStage);
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (newIndex < 0 || newIndex >= stageKeys.length) return;
    const targetStage = stageKeys[newIndex];

    try {
      await axios.put(`${apiBase}/companies/${companyId}`, {
        lead_status: targetStage
      });
      setBanner({ text: `Lead stage updated to ${targetStage}`, type: 'success' });
      onRefresh();
      setTimeout(() => setBanner(null), 2500);
    } catch (err) {
      alert("Failed to update stage: " + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Interactive Sales Pipeline</h2>
          <p className="text-xs text-slate-500">Track client acquisition progress from raw discovery to paying contract</p>
        </div>
      </div>

      {/* 6 Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
        {stages.map((stage) => {
          const stageCompanies = companies.filter(c => c.lead_status === stage.key);
          return (
            <div
              key={stage.key}
              className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[450px]"
            >
              {/* Column Header */}
              <div className={`p-3 border-b rounded-t-xl flex items-center justify-between ${stage.color}`}>
                <span className="font-bold text-xs uppercase tracking-wider">{stage.label}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/80 font-black text-xs text-slate-900 shadow-xs">
                  {stageCompanies.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[620px]">
                {stageCompanies.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No leads in this stage
                  </div>
                ) : (
                  stageCompanies.map((comp) => {
                    const primary = comp.contacts?.[0];
                    const cleanPhone = (primary?.whatsapp || primary?.phone || comp.phone || '').replace(/[^0-9]/g, '');

                    return (
                      <div
                        key={comp.id}
                        onClick={() => onSelectCompany(comp)}
                        className="p-3 bg-white border border-slate-200 hover:border-slate-400 rounded-lg shadow-2xs hover:shadow-sm cursor-pointer transition-all space-y-2"
                      >
                        {/* Company & Score */}
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-xs text-slate-900 leading-tight truncate">
                            {comp.name}
                          </h4>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold whitespace-nowrap ${
                            (comp.lead_score || 50) >= 80 ? 'bg-emerald-100 text-emerald-800' :
                            (comp.lead_score || 50) >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {comp.lead_score || 50}%
                          </span>
                        </div>

                        {/* Location */}
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{comp.city || '—'}, {comp.country || '—'}</span>
                        </div>

                        {/* Contact Person */}
                        {primary && (
                          <div className="text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                            <p className="font-semibold text-slate-800 truncate">{primary.name}</p>
                            <p className="text-slate-400 text-[10px] truncate">{primary.designation || 'Lead Contact'}</p>
                          </div>
                        )}

                        {/* Actions & Move Buttons */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center space-x-1">
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Open WhatsApp"
                                className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => onOpenCallModal(comp)}
                              title="Log Call"
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-600 hover:bg-blue-50"
                            >
                              + Call
                            </button>
                          </div>

                          {/* Stage Transition Arrows */}
                          <div className="flex items-center space-x-1">
                            {stage.key !== 'New' && (
                              <button
                                onClick={() => handleMoveStage(comp.id, stage.key, 'prev')}
                                title="Move to previous stage"
                                className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {stage.key !== 'Lost' && (
                              <button
                                onClick={() => handleMoveStage(comp.id, stage.key, 'next')}
                                title="Advance to next stage"
                                className="p-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded font-bold"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
