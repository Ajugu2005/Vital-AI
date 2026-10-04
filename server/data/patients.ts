// DEMO DATA — fictional patients for the hackathon demo. No real people, medication, diagnosis or
// hospital information. Phone numbers are NOT hard-coded: set DEMO_PATIENT_PHONE in .env, or enter
// a number in the UI before calling.
import type { DemoPatient } from "../../shared/types";

function daysFromToday(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function listPatients(): DemoPatient[] {
  const phone = process.env.DEMO_PATIENT_PHONE ?? "";
  return [
    { id: "DEMO-001", name: "Demo Patient A", phoneNumber: phone, dischargeDate: daysFromToday(-3), preferredLanguage: "en", followUpDate: daysFromToday(4), isDemo: true },
    { id: "DEMO-002", name: "Demo Patient B", phoneNumber: phone, dischargeDate: daysFromToday(-2), preferredLanguage: "pidgin", followUpDate: daysFromToday(5), isDemo: true },
    { id: "DEMO-003", name: "Demo Patient C", phoneNumber: phone, dischargeDate: daysFromToday(-5), preferredLanguage: "yoruba", followUpDate: daysFromToday(2), isDemo: true },
  ];
}

export function getPatient(id: string | null | undefined): DemoPatient | null {
  return id ? (listPatients().find((p) => p.id === id) ?? null) : null;
}
