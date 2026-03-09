/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { SCENARIOS, Scenario } from "./constants.ts";
import { 
  Phone, 
  Play, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  MessageSquare,
  Bug
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Call {
  id: string;
  scenario_id: string;
  status: string;
  transcript: string;
  recording_url: string;
  bug_report: string;
  created_at: string;
}

export default function App() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [activeTab, setActiveTab] = useState<'scenarios' | 'history'>('scenarios');
  const [bugReport, setBugReport] = useState("");

  const fetchCalls = async () => {
    try {
      const res = await fetch("/api/calls");
      const data = await res.json();
      setCalls(data);
      // Update selected call if it's currently open to show live transcript
      if (selectedCall) {
        const updated = data.find((c: Call) => c.id === selectedCall.id);
        if (updated) setSelectedCall(updated);
      }
    } catch (err) {
      console.error("Failed to fetch calls", err);
    }
  };

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 3000);
    return () => clearInterval(interval);
  }, [selectedCall?.id]);

  useEffect(() => {
    if (selectedCall) {
      setBugReport(selectedCall.bug_report || "");
    }
  }, [selectedCall?.id]);

  const saveBugReport = async () => {
    if (!selectedCall) return;
    try {
      await fetch(`/api/calls/${selectedCall.id}/bug-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bugReport }),
      });
      alert("Bug report saved!");
    } catch (err) {
      alert("Failed to save bug report");
    }
  };

  const downloadTranscript = (id: string) => {
    window.open(`/api/calls/${id}/download`, '_blank');
  };

  const startCall = async (scenarioId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveTab('history');
        fetchCalls();
      } else {
        alert("Error starting call: " + data.error);
      }
    } catch (err) {
      alert("Failed to trigger call");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans">
      {/* Header */}
      <header className="border-b border-[#141414]/10 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#141414] rounded-xl flex items-center justify-center">
              <Phone className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">PatientAI Voice Tester</h1>
              <p className="text-xs opacity-50 uppercase tracking-widest font-medium">Engineering Challenge Dashboard</p>
            </div>
          </div>
          <nav className="flex gap-1 bg-black/5 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('scenarios')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'scenarios' ? 'bg-white shadow-sm' : 'opacity-60 hover:opacity-100'}`}
            >
              Scenarios
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white shadow-sm' : 'opacity-60 hover:opacity-100'}`}
            >
              Call History
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {activeTab === 'scenarios' ? (
            <motion.div 
              key="scenarios"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {SCENARIOS.map((scenario) => (
                <div key={scenario.id} className="bg-white border border-[#141414]/5 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                      <Play className="w-5 h-5" />
                    </div>
                    <button 
                      onClick={() => startCall(scenario.id)}
                      disabled={loading}
                      className="bg-[#141414] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-black/80 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                      Start Test Call
                    </button>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{scenario.name}</h3>
                  <p className="text-sm opacity-60 leading-relaxed mb-6">{scenario.description}</p>
                  <div className="pt-6 border-t border-black/5">
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-30 mb-2">System Instruction</p>
                    <p className="text-xs font-mono opacity-50 line-clamp-3">{scenario.systemInstruction}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* History List */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest opacity-30 mb-6 flex items-center gap-2">
                  <History className="w-4 h-4" /> Recent Calls
                </h2>
                {calls.length === 0 && (
                  <div className="bg-white/50 border border-dashed border-black/10 rounded-2xl p-12 text-center">
                    <p className="text-sm opacity-40">No calls recorded yet.</p>
                  </div>
                )}
                {calls.map((call) => (
                  <button
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className={`w-full text-left bg-white border rounded-2xl p-5 transition-all hover:shadow-sm ${selectedCall?.id === call.id ? 'border-[#141414] ring-1 ring-[#141414]' : 'border-black/5'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                        {new Date(call.created_at).toLocaleTimeString()}
                      </span>
                      {call.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      )}
                    </div>
                    <h4 className="font-semibold text-sm mb-1">
                      {SCENARIOS.find(s => s.id === call.scenario_id)?.name || 'Unknown Scenario'}
                    </h4>
                    <p className="text-xs opacity-40 font-mono truncate">{call.id}</p>
                  </button>
                ))}
              </div>

              {/* Detail View */}
              <div className="lg:col-span-2">
                {selectedCall ? (
                  <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm h-full flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h2 className="text-2xl font-semibold mb-1">Call Details</h2>
                        <p className="text-sm opacity-40">{selectedCall.id}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => downloadTranscript(selectedCall.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10 transition-colors text-xs font-medium"
                        >
                          <History className="w-4 h-4" /> Download
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
                      {selectedCall.recording_url && (
                        <div className="bg-[#141414] text-white rounded-2xl p-6">
                          <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4">Call Recording</h3>
                          <audio controls src={selectedCall.recording_url} className="w-full h-10" />
                        </div>
                      )}
                      
                      <div className="bg-[#F5F5F0] rounded-2xl p-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4 flex items-center gap-2">
                          <MessageSquare className="w-3 h-3" /> Transcript
                        </h3>
                        <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap opacity-80">
                          {selectedCall.transcript || "Waiting for transcript..."}
                        </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-4 flex items-center gap-2">
                          <Bug className="w-3 h-3" /> Bug Report / Observations
                        </h3>
                        <textarea 
                          value={bugReport}
                          onChange={(e) => setBugReport(e.target.value)}
                          placeholder="Describe any issues found in the agent's response..."
                          className="w-full bg-transparent border-none focus:ring-0 text-sm font-sans min-h-[100px] placeholder:opacity-30"
                        />
                        <button 
                          onClick={saveBugReport}
                          className="mt-4 bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-amber-700 transition-all"
                        >
                          Save Observations
                        </button>
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-black/5 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedCall.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {selectedCall.status}
                        </div>
                        <span className="text-xs opacity-40">
                          {new Date(selectedCall.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/50 border border-dashed border-black/10 rounded-3xl h-full flex flex-center items-center justify-center p-12 text-center">
                    <div>
                      <AlertCircle className="w-8 h-8 opacity-10 mx-auto mb-4" />
                      <p className="text-sm opacity-40">Select a call to view details and transcript.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
