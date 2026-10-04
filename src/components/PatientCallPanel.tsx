import { useEffect, useRef, useState } from "react";
import { LANGUAGES } from "../../shared/i18n";
import { api } from "../services/api";
import type { DemoPatient, SessionState } from "../types";
import { AlertTriangle, Phone } from "./Icons";

interface Props {
  selectedId: string | null;
  onSelect: (patient: DemoPatient | null) => void;
}

const FINAL = new Set(["ended", "busy", "failed", "cancelled"]);
const STATUS_LABEL: Record<string, string> = {
  initiated: "Call requested…",
  queued: "Queued…",
  ringing: "Ringing…",
  answered: "In progress — Vital AI is talking with the patient",
  ended: "Call ended",
  busy: "Line busy",
  failed: "Call failed",
  cancelled: "Call cancelled",
};

export default function PatientCallPanel({ selectedId, onSelect }: Props) {
  const [patients, setPatients] = useState<DemoPatient[]>([]);
  const [purpose, setPurpose] = useState("");
  const [phone, setPhone] = useState("");
  const [testCall, setTestCall] = useState(true);
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callSession, setCallSession] = useState<SessionState | null>(null);
  const pollRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    api
      .patients()
      .then((r) => {
        setPatients(r.patients);
        setPurpose(r.defaultPurpose);
      })
      .catch(() => setError("Could not load demo patients."));
    return () => window.clearTimeout(pollRef.current);
  }, []);

  const patient = patients.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    setPhone(patient?.phoneNumber ?? "");
    setCallSession(null);
    setError(null);
    window.clearTimeout(pollRef.current);
  }, [patient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const poll = (callId: string) => {
    window.clearTimeout(pollRef.current);
    pollRef.current = window.setTimeout(async () => {
      try {
        const r = await api.callStatus(callId);
        if (r.session) setCallSession(r.session);
        if (!FINAL.has(r.status)) poll(callId);
      } catch {
        poll(callId);
      }
    }, 4000);
  };

  const call = async () => {
    if (!patient) return;
    setCalling(true);
    setError(null);
    try {
      const r = await api.call({ phoneNumber: phone, patientId: patient.id, purpose, testCall });
      setCallSession(r.session);
      poll(r.callId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to initiate call");
    } finally {
      setCalling(false);
    }
  };

  const c = callSession?.call;
  const active = c && !FINAL.has(c.status);
  const transcript = callSession?.history.filter((h) => h.role !== "system").slice(-4) ?? [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h2 className="text-base font-semibold text-slate-900">Patients</h2>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold tracking-wide text-amber-800 uppercase">Demo data</span>
      </header>
      <div className="space-y-3 px-5 py-4">
        <label className="block text-xs font-semibold text-slate-500" htmlFor="patient">
          Select patient
        </label>
        <select
          id="patient"
          value={selectedId ?? ""}
          onChange={(e) => onSelect(patients.find((p) => p.id === e.target.value) ?? null)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
        >
          <option value="">— No patient (anonymous chat) —</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.id}
            </option>
          ))}
        </select>

        {patient && (
          <>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-slate-500">Discharged</dt>
              <dd className="text-right font-medium text-slate-800">{patient.dischargeDate}</dd>
              <dt className="text-slate-500">Follow-up</dt>
              <dd className="text-right font-medium text-slate-800">{patient.followUpDate}</dd>
              <dt className="text-slate-500">Language</dt>
              <dd className="text-right font-medium text-slate-800">{LANGUAGES.find((l) => l.code === patient.preferredLanguage)?.label}</dd>
            </dl>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="phone">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 801 234 5678"
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input type="checkbox" checked={testCall} onChange={(e) => setTestCall(e.target.checked)} className="h-4 w-4 accent-teal-700" />
              Test call mode (Bimpe test call)
            </label>
            <button
              onClick={call}
              disabled={calling || !!active || !phone.trim()}
              data-testid="call-patient"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50"
            >
              <Phone className="h-4 w-4" />
              {calling ? "Starting call…" : active ? "Call in progress" : "Call Patient"}
            </button>
          </>
        )}

        {error && <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">{error}</p>}

        {c && (
          <div data-testid="call-status" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-800">{STATUS_LABEL[c.status] ?? c.status}</span>
              {c.isTestCall && <span className="rounded bg-slate-200 px-1.5 py-0.5 font-semibold text-slate-600">TEST</span>}
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-slate-500">
              {c.destinationMasked} · {c.callId}
              {c.durationSeconds != null && ` · ${c.durationSeconds}s`}
            </div>
            {callSession?.escalation && (
              <div className="mt-2 flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 font-bold text-white">
                <AlertTriangle className="h-3.5 w-3.5" /> CRITICAL · ESCALATED · {callSession.escalation.caseId} · {callSession.escalation.reason}
              </div>
            )}
            {transcript.length > 0 && (
              <ul className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                {transcript.map((h, i) => (
                  <li key={i} className="text-slate-700">
                    <span className="font-semibold">{h.role === "patient" ? "Patient" : "Vital AI"}:</span> {h.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
