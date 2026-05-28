import { useState, useRef } from 'react';
import { X, Upload, Download, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export default function BulkImportModal({ onClose, onImportComplete }) {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const expectedHeaders = [
    'Mobile Number', 
    'Person Name', 
    'Business Name', 
    'Category', 
    'State', 
    'City', 
    'Town', 
    'Notes'
  ];

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([expectedHeaders]);
    // Add some column widths for better UX
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, 
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "Bulk_Import_Template.xlsx");
  };

  const processFile = (file) => {
    if (!file) return;
    
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          toast.error("The uploaded file is empty.");
          setLoading(false);
          return;
        }

        // Transform data to match database schema
        const recordsToInsert = jsonData.map((row) => {
          // Find the mobile number column (case-insensitive)
          const mobileKey = Object.keys(row).find(key => key.toLowerCase().includes('mobile'));
          let mobile = mobileKey ? String(row[mobileKey]).trim() : '';
          
          // Clean mobile number (remove non-digits)
          mobile = mobile.replace(/\D/g, '');
          // Keep only last 10 digits if it has country code
          if (mobile.length > 10) mobile = mobile.slice(-10);

          return {
            mobile_number: mobile,
            person_name: row['Person Name'] || row['person_name'] || null,
            business_name: row['Business Name'] || row['business_name'] || 'Unknown Business',
            category: row['Category'] || row['category'] || null,
            state: row['State'] || row['state'] || null,
            city: row['City'] || row['city'] || null,
            town: row['Town'] || row['town'] || null,
            notes: row['Notes'] || row['notes'] || null
          };
        }).filter(r => r.mobile_number && r.mobile_number.length === 10); // Only keep valid numbers

        // Remove duplicates within the uploaded file itself
        const uniqueRecordsMap = new Map();
        recordsToInsert.forEach(r => {
           if (!uniqueRecordsMap.has(r.mobile_number)) {
              uniqueRecordsMap.set(r.mobile_number, r);
           }
        });
        const finalRecordsToInsert = Array.from(uniqueRecordsMap.values());

        if (finalRecordsToInsert.length === 0) {
          toast.error("No valid records found. Ensure 'Mobile Number' is filled correctly (10 digits).");
          setLoading(false);
          return;
        }

        // Chunk insertion to handle massive bulk uploads (e.g., 50,000+ rows) without crashing Supabase
        const CHUNK_SIZE = 500;
        for (let i = 0; i < finalRecordsToInsert.length; i += CHUNK_SIZE) {
          const chunk = finalRecordsToInsert.slice(i, i + CHUNK_SIZE);
          const { error } = await supabase
            .from('contacts')
            .upsert(chunk, { onConflict: 'mobile_number', ignoreDuplicates: true });

          if (error) throw error;
        }

        toast.success(`Successfully imported ${finalRecordsToInsert.length} unique records! (Duplicates skipped)`);
        onImportComplete();
        onClose();
      } catch (error) {
        console.error(error);
        toast.error("Error importing data. Make sure the file matches the template.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-green-500/20 p-2 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">Bulk Data Import</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-200 mb-2">Step 1: Download Template</h3>
            <p className="text-xs text-slate-400 mb-3">Download the Excel template to ensure your data is formatted correctly.</p>
            <button 
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm font-medium text-slate-200 transition-colors w-full justify-center"
            >
              <Download className="w-4 h-4 text-green-400" />
              Download Excel Template
            </button>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-2">Step 2: Upload Data</h3>
            <p className="text-xs text-slate-400 mb-3">Upload your filled `.xlsx` or `.csv` file. Duplicates will be updated.</p>
            
            <div 
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive ? 'border-purple-500 bg-purple-500/10' : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                onChange={handleFileUpload}
              />
              
              {loading ? (
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-3" />
                  <p className="text-sm font-medium text-slate-300">Processing file...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center cursor-pointer">
                  <Upload className={`w-10 h-10 mb-3 ${dragActive ? 'text-purple-400' : 'text-slate-400'}`} />
                  <p className="text-sm font-medium text-slate-200 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-slate-500">
                    XLSX, XLS, or CSV up to 10MB
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-5 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-xs text-yellow-200/80">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Ensure that all Mobile Numbers are valid 10-digit formats. Records with invalid or missing numbers will be skipped.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
