import { LANGUAGES } from "../../shared/i18n";
import type { Language, SessionState } from "../types";
import { AlertTriangle, Mic, Phone, Shield } from "./Icons";

interface Props {
  session: SessionState | null;
  language: Language;
  onEscalate: () => void;
  escalating: boolean;
}

function Badge({ tone, children }: { tone: "green" | "red" | "blue" | "amber" | "gray"; children: React.ReactNode }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    blue: "bg-sky-50 text-sky-700 ring-sky-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    gray: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-800">{children}</dd>
    </div>
  );
}

export default function FollowUpSidebar({ session, language, onEscalate, escalating }: Props) {
  const status = session?.status ?? "active";
  const escalation = session?.escalation;
  const langLabel = LANGUAGES.find((l) => l.code === language)?.label ?? language;

  const statusBadge =
    status === "escalated" ? (
      <Badge tone="red">Escalated</Badge>
    ) : status === "completed" ? (
      <Badge tone="blue">Completed</Badge>
    ) : (
      <Badge tone="green">Active</Badge>
    );

  const followUp = session?.followUpStatus ?? "in_progress";
  const followUpBadge =
    followUp === "escalation_required" ? (
      <Badge tone="red">Escalation Required</Badge>
    ) : followUp === "routine_follow_up" ? (
      <Badge tone="green">Routine Follow-Up</Badge>
    ) : (
      <Badge tone="gray">In progress</Badge>
    );

  const tone = (value: string | undefined, good: string, bad: string) =>
    value === good ? "green" : value === bad ? "amber" : "gray";

  const symptoms = session?.symptoms ?? [];

  return (
    <aside className="flex flex-col gap-4">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Patient Follow-Up</h2>
            <p className="font-mono text-xs text-slate-400">{session?.id ?? "New session"}</p>
          </div>
          {statusBadge}
        </header>

        {status === "escalated" && escalation && (
          <div data-testid="critical-panel" className="border-b border-red-200 bg-red-50 px-5 py-4" role="alert">
            <div className="flex items-center gap-2 text-sm font-bold tracking-wide text-red-700">
              <AlertTriangle className="h-4 w-4" /> RISK: CRITICAL
            </div>
            <dl className="mt-2 space-y-1 text-xs text-red-800">
              <div className="flex justify-between gap-3">
                <dt className="text-red-700/80">Case ID</dt>
                <dd className="font-mono text-base font-bold text-red-700">{escalation.caseId}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-red-700/80">Reason</dt>
                <dd className="text-right font-semibold">{escalation.reason}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-red-700/80">Status</dt>
                <dd className="text-right font-semibold">
                  ESCALATED — {escalation.status === "clinician_notified" ? "healthcare professional notified" : "case created for a healthcare professional"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-red-700/80">Channel</dt>
                <dd className="text-right">{{ web_text: "Web chat", web_voice: "Browser voice", phone: "Phone call" }[escalation.channel] ?? escalation.channel}</dd>
              </div>
            </dl>
          </div>
        )}

        <dl className="divide-y divide-slate-100 px-5">
          <Row label="Risk level">
            {session?.riskLevel === "critical" ? (
              <Badge tone="red">CRITICAL</Badge>
            ) : session?.riskLevel === "watch" ? (
              <Badge tone="amber">WATCH — needs review</Badge>
            ) : (
              <Badge tone="green">ROUTINE</Badge>
            )}
          </Row>
          <Row label="Follow-up status">{followUpBadge}</Row>
          <Row label="Preferred language">{langLabel}</Row>
          <Row label="Recovery">
            <Badge tone={tone(session?.recovery, "Improving", "Not improving")}>{session?.recovery ?? "Not yet reported"}</Badge>
          </Row>
          <Row label="Medication">
            <Badge
              tone={
                !session || session.medication === "Not yet reported"
                  ? "gray"
                  : session.medication === "Taking as instructed"
                    ? "green"
                    : "amber"
              }
            >
              {session?.medication ?? "Not yet reported"}
            </Badge>
          </Row>
          <Row label="Symptoms">
            {symptoms.length > 0 ? (
              <div className="flex flex-col items-end gap-1">
                {symptoms.map((s) => (
                  <Badge key={s} tone={escalation?.redFlags.includes(s) ? "red" : "amber"}>
                    {escalation?.redFlags.includes(s) ? `⚠ ${s}` : s}
                  </Badge>
                ))}
              </div>
            ) : session?.symptomsReported ? (
              <Badge tone="green">No new symptoms</Badge>
            ) : (
              <Badge tone="gray">Not yet reported</Badge>
            )}
          </Row>
          <Row label="Follow-up appointment">
            <Badge tone={tone(session?.appointment, "Scheduled", "Needs help arranging")}>
              {session?.appointment ?? "Not yet reported"}
              {session?.appointmentNote ? ` · ${session.appointmentNote}` : ""}
            </Badge>
          </Row>
          <Row label="Escalation">
            {escalation ? (
              <Badge tone="red">{escalation.status === "clinician_notified" ? "Clinician notified" : "Case created"}</Badge>
            ) : (
              <Badge tone="gray">None</Badge>
            )}
          </Row>
        </dl>

        <div className="px-5 pt-2 pb-5">
          <button
            onClick={onEscalate}
            disabled={escalating || escalation?.status === "clinician_notified"}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-default ${
              status === "escalated"
                ? "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300"
                : "border border-red-300 bg-white text-red-700 hover:bg-red-50 disabled:opacity-60"
            }`}
          >
            <Phone className="h-4 w-4" />
            {escalation?.status === "clinician_notified"
              ? "Healthcare professional notified"
              : escalating
                ? "Connecting…"
                : "Escalate to Healthcare Professional"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Voice &amp; phone follow-up</h3>
            <p className="text-xs text-slate-500">
              Spoken messages go through the same safety checks as typed ones. Phone calls are placed by the BimpeAI agent from the
              Patients panel, and their transcripts are checked by the same red-flag detector.
            </p>
          </div>
        </div>
      </section>

      <section className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
        <p>Vital AI provides general follow-up support and does not replace a healthcare professional.</p>
      </section>
    </aside>
  );
}
