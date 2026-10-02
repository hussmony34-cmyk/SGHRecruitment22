"use client";

import { useState } from "react";

const departments = [
  { id: "drs", label: "Doctors" },
  { id: "nursing", label: "Nursing" },
  { id: "nursing_support", label: "Nursing Support Services" },
  { id: "admin", label: "Administrative Roles" },
  { id: "operation", label: "Operations" },
];

const branches = [
  ["Cairo", "Saudi German Hospital — Cairo"],
  ["Alexandria", "Saudi German Hospital — Alexandria"],
  ["Riyadh", "Saudi German Hospital — Riyadh"],
  ["Jeddah", "Saudi German Hospital — Jeddah"],
  ["Dubai", "Saudi German Hospital — Dubai"],
  ["Other", "Other"],
];

const governorates = [
  ["Cairo", "Cairo"],
  ["Giza", "Giza"],
  ["Alexandria", "Alexandria"],
  ["Qalyubia", "Qalyubia"],
  ["Sharqia", "Sharqia"],
  ["Other", "Other"],
];

const clinicalDepartments = [
  ["ICU", "Adult ICU"],
  ["NICU", "Neonatal ICU (NICU)"],
  ["CCU", "Cardiac Care Unit (CCU)"],
  ["OR", "Operating Room (OR)"],
  ["ER", "Emergency Room (ER)"],
  ["Inpatient", "Inpatient Units"],
];

const medicalDegrees = [
  ["resident", "Resident"],
  ["specialist", "Specialist"],
  ["consultant", "Consultant"],
  ["fellow", "Fellow"],
];

const legacySectorIds = {
  doctors: "drs",
  administration: "admin",
  operations: "operation",
};

const initialForm = {
  fullNameAr: "",
  fullNameEn: "",
  nationalId: "",
  birthDate: "",
  gender: "male",
  nationality: "",
  nationality: "",
  governorate: "Cairo",
  address: "",
  phone: "",
  whatsapp: "",
  email: "",
  workedAtSGH: "no",
  sghBranch: "",
  sghJobTitle: "",
  sghFromYear: "",
  sghToYear: "",
  sghReasonLeaving: "",
  qualification: "",
  graduationYear: "",
  university: "",
  specialty: "",
  subSpecialty: "",
  medicalDegree: "resident",
  syndicateNumber: "",
  clinicalDepartment: "ICU",
  hasBLS: false,
  hasACLS: false,
  totalExperienceYears: "",
  currentCompany: "",
  currentJobTitle: "",
  noticePeriod: "immediate",
  expectedSalary: "",
  answer: "",
  consent: false,
};

function Field({ label, required, hint, children }) {
  return (
    <label className="field">
      <span>{label}{required && <> <b>*</b></>}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}

function OptionList({ options }) {
  return options.map(([value, label]) => (
    <option key={value} value={value}>{label}</option>
  ));
}

function SectionHeading({ number, children }) {
  return <legend><span>{number}</span>{children}</legend>;
}

export default function DynamicApplicationForm({ track, onBack }) {
  const normalizedSector = legacySectorIds[track] ?? track;
  const [sector, setSector] = useState(
    departments.some((department) => department.id === normalizedSector)
      ? normalizedSector
      : "",
  );
  const [form, setForm] = useState(initialForm);
  const [resume, setResume] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState(null);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.set("sector", sector);
      for (const [key, value] of Object.entries(form)) {
        payload.set(key, typeof value === "boolean" ? String(value) : value);
      }
      if (resume) payload.set("resume", resume);

      const response = await fetch("/api/applications", {
        method: "POST",
        body: payload,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "We couldn't submit your application. Please try again.");
      }
      setApplication(result.application);
    } catch (submissionError) {
      setError(submissionError.message || "Unable to connect to the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (application) {
    return (
      <section className="success-card" role="status">
        <span className="success-icon" aria-hidden="true">✓</span>
        <span className="eyebrow">APPLICATION RECEIVED</span>
        <h1>Thank you for your interest in joining us</h1>
        <p>
          Your application has been received and is pending initial HR screening.
          Our recruitment team will contact you if your qualifications match a
          suitable opportunity.
        </p>
        <div className="reference-number">
          <small>Application reference</small>
          <strong dir="ltr">SGH-{application.id.slice(0, 8).toUpperCase()}</strong>
        </div>
        <button className="button button-primary" onClick={onBack} type="button">
          Submit another application
        </button>
      </section>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="form-shell application-form-shell">
      <button className="back-link change-track-button" onClick={onBack} type="button">
        ← <span>Change department</span>
      </button>
      <div className="form-heading">
        <span className="eyebrow">CAREER APPLICATION</span>
        <h1>Start your journey with us</h1>
        <p>Complete the form below. Required fields are marked with an asterisk.</p>
      </div>
      <div className="form-progress" aria-label="Application form">
        <span />
        <small>Application details</small>
      </div>

      <form className="application-form extended-application-form" onSubmit={submit}>
        <fieldset className="form-section">
          <SectionHeading number="1">Personal information</SectionHeading>
          <div className="field-row">
            <Field label="Full name (Arabic)" required>
              <input autoComplete="name" maxLength={120} onChange={(event) => update("fullNameAr", event.target.value)} required value={form.fullNameAr} />
            </Field>
            <Field label="Full name (English)" required>
              <input autoComplete="name" dir="ltr" maxLength={120} onChange={(event) => update("fullNameEn", event.target.value)} required value={form.fullNameEn} />
            </Field>
          </div>
          <div className="field-row field-row-three">
            <Field label="National ID or passport number" required>
              <input autoComplete="off" dir="ltr" maxLength={32} onChange={(event) => update("nationalId", event.target.value)} required value={form.nationalId} />
            </Field>
            <Field label="Date of birth" required>
              <input autoComplete="bday" max={new Date().toISOString().slice(0, 10)} onChange={(event) => update("birthDate", event.target.value)} required type="date" value={form.birthDate} />
            </Field>
            <Field label="Gender" required>
              <select onChange={(event) => update("gender", event.target.value)} value={form.gender}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
          </div>
          <div className="field-row field-row-three">
            <Field label="Mobile phone" required>
              <input autoComplete="tel" dir="ltr" maxLength={30} onChange={(event) => update("phone", event.target.value)} placeholder="+20..." required type="tel" value={form.phone} />
            </Field>
            <Field label="WhatsApp number" required>
              <input autoComplete="tel" dir="ltr" maxLength={30} onChange={(event) => update("whatsapp", event.target.value)} placeholder="+20..." required type="tel" value={form.whatsapp} />
            </Field>
            <Field label="Email address" required>
              <input autoComplete="email" dir="ltr" maxLength={254} onChange={(event) => update("email", event.target.value)} placeholder="name@example.com" required type="email" value={form.email} />
            </Field>
          </div>
          <div className="field-row field-row-three">
            <Field label="Governorate" required>
              <select onChange={(event) => update("governorate", event.target.value)} value={form.governorate}>
                <OptionList options={governorates} />
              </select>
            </Field>
            <Field label="Nationality" required>
              <input autoComplete="country-name" maxLength={80} onChange={(event) => update("nationality", event.target.value)} required value={form.nationality} />
            </Field>
            <Field label="Full address" required>
              <input autoComplete="street-address" maxLength={250} onChange={(event) => update("address", event.target.value)} placeholder="District, street, city" required value={form.address} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="form-section sgh-history-section">
          <SectionHeading number="2">Previous Saudi German Health employment</SectionHeading>
          <p className="section-description">
            Have you previously worked or trained at any Saudi German Health facility, in any country?
          </p>
          <div className="choice-row">
            {["yes", "no"].map((choice) => (
              <label className="choice-option" key={choice}>
                <input checked={form.workedAtSGH === choice} name="workedAtSGH" onChange={() => update("workedAtSGH", choice)} type="radio" value={choice} />
                <span>{choice === "yes" ? "Yes" : "No"}</span>
              </label>
            ))}
          </div>
          {form.workedAtSGH === "yes" && (
            <div className="conditional-fields">
              <div className="field-row field-row-three">
                <Field label="Branch" required>
                  <select onChange={(event) => update("sghBranch", event.target.value)} required value={form.sghBranch}>
                    <option value="">Select a branch</option>
                    <OptionList options={branches} />
                  </select>
                </Field>
                <Field label="Previous job title" required>
                  <input maxLength={120} onChange={(event) => update("sghJobTitle", event.target.value)} required value={form.sghJobTitle} />
                </Field>
                <Field label="Reason for leaving" required>
                  <input maxLength={300} onChange={(event) => update("sghReasonLeaving", event.target.value)} required value={form.sghReasonLeaving} />
                </Field>
              </div>
              <div className="field-row">
                <Field label="From year" required>
                  <input max={currentYear} min="1950" onChange={(event) => update("sghFromYear", event.target.value)} required type="number" value={form.sghFromYear} />
                </Field>
                <Field label="To year" required>
                  <input max={currentYear} min="1950" onChange={(event) => update("sghToYear", event.target.value)} required type="number" value={form.sghToYear} />
                </Field>
              </div>
            </div>
          )}
        </fieldset>

        <fieldset className="form-section">
          <SectionHeading number="3">Career path and qualifications</SectionHeading>
          <div className="field-row">
            <Field label="Department" required>
              <select onChange={(event) => setSector(event.target.value)} required value={sector}>
                <option value="">Select a department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Specialty or desired role" required>
              <input maxLength={160} onChange={(event) => update("specialty", event.target.value)} placeholder={sector === "drs" ? "e.g. Cardiology, General Surgery" : sector === "nursing" ? "e.g. Critical Care, Emergency" : "e.g. Human Resources, Biomedical Maintenance"} required value={form.specialty} />
            </Field>
          </div>
          <div className="field-row field-row-three">
            <Field label="Highest qualification" required>
              <input maxLength={160} onChange={(event) => update("qualification", event.target.value)} placeholder="e.g. Bachelor's degree in Nursing" required value={form.qualification} />
            </Field>
            <Field label="Graduation year" required>
              <input max={currentYear} min="1950" onChange={(event) => update("graduationYear", event.target.value)} required type="number" value={form.graduationYear} />
            </Field>
            <Field label="University or institute" required>
              <input maxLength={160} onChange={(event) => update("university", event.target.value)} required value={form.university} />
            </Field>
          </div>
          {sector === "drs" && (
            <div className="sector-specific-panel field-row">
              <Field label="Current medical degree" required>
                <select onChange={(event) => update("medicalDegree", event.target.value)} value={form.medicalDegree}>
                  <OptionList options={medicalDegrees} />
                </select>
              </Field>
              <Field label="Medical license / syndicate number" required>
                <input maxLength={80} onChange={(event) => update("syndicateNumber", event.target.value)} required value={form.syndicateNumber} />
              </Field>
            </div>
          )}
          {sector === "nursing" && (
            <div className="sector-specific-panel">
              <div className="field-row">
                <Field label="Preferred clinical department" required>
                  <select onChange={(event) => update("clinicalDepartment", event.target.value)} value={form.clinicalDepartment}>
                    <OptionList options={clinicalDepartments} />
                  </select>
                </Field>
                <Field label="Nursing license number" required>
                  <input maxLength={80} onChange={(event) => update("syndicateNumber", event.target.value)} required value={form.syndicateNumber} />
                </Field>
              </div>
              <div className="choice-row certification-row">
                <label className="choice-option">
                  <input checked={form.hasBLS} onChange={(event) => update("hasBLS", event.target.checked)} type="checkbox" />
                  <span>Current BLS certification</span>
                </label>
                <label className="choice-option">
                  <input checked={form.hasACLS} onChange={(event) => update("hasACLS", event.target.checked)} type="checkbox" />
                  <span>Current ACLS certification</span>
                </label>
              </div>
            </div>
          )}
          {["admin", "operation", "nursing_support"].includes(sector) && (
            <div className="sector-specific-panel">
              <Field label="Technical skills, systems, or software">
                <input maxLength={300} onChange={(event) => update("subSpecialty", event.target.value)} placeholder="e.g. Excel, SAP, HIS" value={form.subSpecialty} />
              </Field>
            </div>
          )}
        </fieldset>

        <fieldset className="form-section">
          <SectionHeading number="4">Professional experience and availability</SectionHeading>
          <div className="field-row field-row-three">
            <Field label="Total years of experience" required>
              <input max="60" min="0" onChange={(event) => update("totalExperienceYears", event.target.value)} required type="number" value={form.totalExperienceYears} />
            </Field>
            <Field label="Current employer">
              <input maxLength={160} onChange={(event) => update("currentCompany", event.target.value)} value={form.currentCompany} />
            </Field>
            <Field label="Current job title">
              <input maxLength={120} onChange={(event) => update("currentJobTitle", event.target.value)} value={form.currentJobTitle} />
            </Field>
          </div>
          <div className="field-row">
            <Field label="Notice period" required>
              <select onChange={(event) => update("noticePeriod", event.target.value)} value={form.noticePeriod}>
                <option value="immediate">Available immediately</option>
                <option value="one_month">One month</option>
                <option value="two_months">Two months</option>
                <option value="three_months">Three months</option>
              </select>
            </Field>
            <Field label="Expected monthly salary (optional)" hint="Enter the amount in your local currency.">
              <input min="0" onChange={(event) => update("expectedSalary", event.target.value)} type="number" value={form.expectedSalary} />
            </Field>
          </div>
          <Field label="Relevant experience and professional interests" required hint={`${form.answer.length}/1200 characters`}>
            <textarea maxLength={1200} onChange={(event) => update("answer", event.target.value)} placeholder="Briefly describe your relevant experience and career interests." required rows={4} value={form.answer} />
          </Field>
        </fieldset>

        <fieldset className="form-section">
          <SectionHeading number="5">Resume</SectionHeading>
          <Field label="Upload your resume" hint={resume ? `${resume.name} · ${(resume.size / (1024 * 1024)).toFixed(2)} MB` : "PDF, DOC, or DOCX. Maximum file size: 5 MB."}>
            <input accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setResume(event.target.files?.[0] ?? null)} type="file" />
          </Field>
        </fieldset>

        <label className="consent-field">
          <input checked={form.consent} onChange={(event) => update("consent", event.target.checked)} required type="checkbox" />
          <span>I consent to the use of my information to process my application and contact me about career opportunities.</span>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary submit-button" disabled={submitting}>
          {submitting ? "Submitting your application..." : "Submit application"}
          {!submitting && <span aria-hidden="true">→</span>}
        </button>
        <p className="privacy-note">Your information is confidential and will only be used for recruitment.</p>
      </form>
    </div>
  );
}
