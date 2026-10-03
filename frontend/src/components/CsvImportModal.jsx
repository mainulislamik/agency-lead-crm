import React, { useState } from 'react';
import axios from 'axios';
import { Upload, X, FileText, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function CsvImportModal({ apiBase, onClose, onSuccess, setBanner }) {
  const [csvText, setCsvText] = useState('');
  const [parsedLeads, setParsedLeads] = useState([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState('input'); // 'input' | 'preview'

  const handleParse = () => {
    if (!csvText.trim()) return alert("Please paste CSV data or content.");
    
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return alert("CSV must contain at least a header and one data row.");

    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    
    // Auto-detect columns
    const nameIdx = header.findIndex(h => h.includes('name') || h.includes('company') || h.includes('studio'));
    const webIdx = header.findIndex(h => h.includes('web') || h.includes('url') || h.includes('site'));
    const phoneIdx = header.findIndex(h => h.includes('phone') || h.includes('tel') || h.includes('mobile'));
    const cityIdx = header.findIndex(h => h.includes('city') || h.includes('location'));
    const countryIdx = header.findIndex(h => h.includes('country'));
    const contactNameIdx = header.findIndex(h => h.includes('contact') || h.includes('owner') || h.includes('person'));
    const emailIdx = header.findIndex(h => h.includes('email') || h.includes('mail'));

    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Simple CSV regex for quotes
      const row = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      const compName = nameIdx !== -1 ? row[nameIdx] : row[0];
      
      if (compName) {
        parsed.push({
          name: compName,
          website: webIdx !== -1 ? row[webIdx] : '',
          phone: phoneIdx !== -1 ? row[phoneIdx] : '',
          city: cityIdx !== -1 ? row[cityIdx] : 'New York',
          country: countryIdx !== -1 ? row[countryIdx] : 'USA',
          contact_name: contactNameIdx !== -1 ? row[contactNameIdx] : `${compName} Director`,
          contact_email: emailIdx !== -1 ? row[emailIdx] : '',
          contact_phone: phoneIdx !== -1 ? row[phoneIdx] : ''
        });
      }
    }

    if (parsed.length === 0) {
      return alert("Could not parse any valid company names from the CSV.");
    }

    setParsedLeads(parsed);
    setStep('preview');
  };

  const handleExecuteImport = async () => {
    setImporting(true);
    try {
      const res = await axios.post(`${apiBase}/leads/import-csv`, { leads: parsedLeads });
      setBanner({ text: res.data.message || `Imported ${parsedLeads.length} leads!`, type: 'success' });
      onSuccess();
      onClose();
      setTimeout(() => setBanner(null), 3000);
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const sampleCsvTemplate = `Company Name,Website,Phone,City,Country,Contact Name,Contact Email
Apex Commercial Studios,https://apexstudios.com,+1 212 555 0192,New York,USA,Sarah Jenkins,sarah@apexstudios.com
Luxe Fashion Imagery,https://luxefashion.co.uk,+44 20 7946 0912,London,UK,Oliver Scott,oliver@luxefashion.co.uk`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-slate-900" />
            <h3 className="font-bold text-slate-900 text-sm">Bulk CSV Lead Importer</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'input' ? (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-700 block">Expected CSV Headers:</span>
              <p className="text-slate-600 font-mono text-[11px]">
                Company Name, Website, Phone, City, Country, Contact Name, Contact Email
              </p>
              <button
                type="button"
                onClick={() => setCsvText(sampleCsvTemplate)}
                className="text-indigo-600 hover:underline font-bold text-[11px] pt-1 block"
              >
                + Paste Sample Photography Leads Template
              </button>
            </div>

            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste raw CSV text here..."
              className="w-full p-3 font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800 text-[11px]"
            />

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleParse}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center space-x-1.5"
              >
                <span>Parse & Preview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Previewing {parsedLeads.length} leads ready for import:</span>
              <button
                onClick={() => setStep('input')}
                className="text-slate-500 hover:underline text-[11px]"
              >
                Edit CSV Input
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {parsedLeads.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50/50 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-bold text-slate-900">{item.name}</span>
                    <span className="text-slate-500 ml-2">({item.city}, {item.country})</span>
                    <div className="text-slate-600 text-[10px]">{item.contact_name} • {item.contact_email || 'No email'}</div>
                  </div>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">Ready</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={importing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{importing ? 'Importing...' : `Import ${parsedLeads.length} Leads`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
