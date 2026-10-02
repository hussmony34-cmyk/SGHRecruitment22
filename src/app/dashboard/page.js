"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import EvaluationModal from "@/components/EvaluationModal";

const sectorLabels = {
  drs: "Doctors",
  nursing: "Nursing",
  nursing_support: "Nursing Support Services",
  admin: "Administrative Roles",
  operation: "Operations",
  doctors: "Doctors",
  operations: "Operations",
  administration: "Administrative Roles",
};

const stageLabels = {
  HR_INTERVIEW: "HR Interview",
  TECHNICAL_INTERVIEW: "Technical Interview",
  HR_MANAGER: "HR Manager Review",
  OFFERED: "Offer Issued",
  REJECTED: "Rejected",
};

const recommendationLabels = {
  strong_yes: "Strongly recommended",
  yes: "Recommended",
  hold: "On hold",
  no: "Not recommended",
};

const tabs = [
  { id: "ALL", label: "All candidates" },
  { id: "HR_INTERVIEW", label: "1. HR Interview" },
  { id: "TECHNICAL_INTERVIEW", label: "2. Technical Interview" },
  { id: "HR_MANAGER", label: "3. HR Manager Review" },
  { id: "OFFERED", label: "Offers" },
  { id: "REJECTED", label: "Rejected" },
];

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

function normalizeCandidate(application) {
  return {
    ...application,
    candidateCode: application.candidateCode || `SGH-${application.id.slice(0, 8).toUpperCase()}`,
    currentStage: application.currentStage || "HR_INTERVIEW",
    status: application.status === "OFFER_ISSUED" || application.status === "REJECTED"
      ? application.status
      : "PENDING",
    evaluations: Array.isArray(application.evaluations)
      ? application.evaluations
      : application.evaluation
        ? [{ ...application.evaluation, stage: application.evaluation.stage || "HR_INTERVIEW" }]
        : [],
  };
}

export default function DashboardPage() {
  const [apiKey, setApiKey] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadCandidates(key) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/applications", {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load applications.");
      setApiKey(key);
      setCandidates(result.applications.map(normalizeCandidate));
      setKeyDraft("");
    } catch (loadError) {
      setError(loadError.message || "Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadResume(candidate) {
    setError("");
    try {
      const response = await fetch(`/api/applications/${candidate.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Unable to download the resume.");
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = candidate.resumeFile.originalName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(downloadError.message || "Unable to download the resume.");
    }
  }

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return candidates.filter((candidate) => {
      const matchesTab = activeTab === "ALL" || candidate.currentStage === activeTab;
      const searchable = [
        candidate.candidateCode,
        candidate.fullNameEn,
        candidate.fullNameAr,
        candidate.email,
        candidate.phone,
        candidate.jobTitle,
        candidate.specialty,
        sectorLabels[candidate.sector],
      ].filter(Boolean).join(" ").toLocaleLowerCase();
      return matchesTab && searchable.includes(normalizedQuery);
    });
  }, [activeTab, candidates, query]);

  function handleSaveEvaluation(updatedApplication) {
    const updatedCandidate = normalizeCandidate(updatedApplication);
    setCandidates((current) =>
      current.map((candidate) => candidate.id === updatedCandidate.id ? updatedCandidate : candidate),
    );
    setSelectedCandidate(null);
  }

  function signOut() {
    setApiKey("");
    setKeyDraft("");
    setCandidates([]);
    setSelectedCandidate(null);
  }

  if (!apiKey) {
    return (
      <main className="dashboard-login-page">
        <Link className="back-link" href="/">← <span>Back to home</span></Link>
        <form className="login-card" onSubmit={(event) => {
          event.preventDefault();
          void loadCandidates(keyDraft.trim());
        }}>
          <span className="login-icon" aria-hidden="true">⌘</span>
          <span className="eyebrow">HUMAN RESOURCES PORTAL</span>
          <h1>Recruitment pipeline</h1>
          <p>Enter the HR access key configured on the server to manage candidate interviews.</p>
          <label className="field">
            <span>Access key</span>
            <input
              autoComplete="current-password"
              onChange={(event) => setKeyDraft(event.target.value)}
              required
              type="password"
              value={keyDraft}
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary submit-button" disabled={loading}>
            {loading ? "Verifying..." : "Secure sign in"}
          </button>
          <small className="login-note">
            The <code>HR_API_KEY</code> environment variable must be configured on the server.
          </small>
        </form>
      </main>
    );
  }

  const offeredCount = candidates.filter((candidate) => candidate.currentStage === "OFFERED").length;
  const pendingCount = candidates.filter((candidate) =>
    ["HR_INTERVIEW", "TECHNICAL_INTERVIEW", "HR_MANAGER"].includes(candidate.currentStage),
  ).length;

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link className="brand" href="/">
          <span className="brand-mark">SG</span>
          <span><strong>Saudi German Health</strong><small>Recruitment & Interviews</small></span>
        </Link>
        <button className="text-button" onClick={signOut} type="button">Sign out</button>
      </header>

      <div className="dashboard-content pipeline-content">
        <div className="dashboard-title-row">
          <div>
            <span className="eyebrow">TALENT ACQUISITION</span>
            <h1>Recruitment pipeline</h1>
            <p>Manage candidate progress through interviews, review, and offers.</p>
          </div>
          <div className="pipeline-summary">
            <span className="pipeline-total">Total applications: <strong>{candidates.length}</strong></span>
            <span className="pipeline-offers">Offers issued: <strong>{offeredCount}</strong></span>
          </div>
        </div>

        <section className="pipeline-tabs" aria-label="Filter candidates by stage">
          {tabs.map((tab) => {
            const count = tab.id === "ALL"
              ? candidates.length
              : candidates.filter((candidate) => candidate.currentStage === tab.id).length;
            return (
              <button
                aria-pressed={activeTab === tab.id}
                className={`pipeline-tab ${activeTab === tab.id ? "pipeline-tab-active" : ""}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}<span>{count}</span>
              </button>
            );
          })}
        </section>

        <section className="applications-panel pipeline-panel">
          <div className="panel-heading">
            <div><h2>Candidate applications</h2><span>{filteredCandidates.length} shown</span></div>
            <button className="button button-subtle refresh-button" disabled={loading} onClick={() => void loadCandidates(apiKey)} type="button">
              ↻ Refresh
            </button>
          </div>
          <label className="search-field pipeline-search">
            <span aria-hidden="true">⌕</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by candidate, code, role, or email..."
              value={query}
            />
          </label>
          {error && <p className="form-error dashboard-error" role="alert">{error}</p>}
          {filteredCandidates.length === 0 ? (
            <div className="empty-state">
              <span aria-hidden="true">▤</span>
              <strong>{candidates.length ? "No matching candidates" : "No applications yet"}</strong>
              <p>{candidates.length ? "Try a different stage or search term." : "Submitted applications will appear here for review."}</p>
            </div>
          ) : (
            <div className="pipeline-table-wrap">
              <table className="pipeline-table">
                <thead>
                  <tr>
                    <th>Candidate code</th>
                    <th>Candidate</th>
                    <th>Department / role</th>
                    <th>Previous SGH employment</th>
                    <th>Current stage</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => {
                    const terminal = ["OFFERED", "REJECTED"].includes(candidate.currentStage);
                    return (
                      <tr key={candidate.id}>
                        <td className="candidate-code">{candidate.candidateCode}</td>
                        <td>
                          <strong className="pipeline-candidate-name">
                            {candidate.fullNameEn || candidate.fullName || candidate.fullNameAr || "Unnamed applicant"}
                          </strong>
                          {candidate.fullNameAr && candidate.fullNameEn && (
                            <span className="pipeline-secondary-name" dir="rtl">{candidate.fullNameAr}</span>
                          )}
                          <span className="pipeline-contact">{candidate.phone} · {candidate.email}</span>
                          <span className="pipeline-contact">{candidate.experienceYears ?? 0} years · Applied {formatDate(candidate.createdAt)}</span>
                          <details className="pipeline-candidate-details">
                            <summary>Application & interview history</summary>
                            <div className="pipeline-detail-grid">
                              <p><strong>Nationality</strong><span>{candidate.nationality || "—"}</span></p>
                              <p><strong>Qualification</strong><span>{candidate.qualification || "—"}</span></p>
                              <p><strong>University</strong><span>{candidate.university || "—"}</span></p>
                              <p><strong>Graduation year</strong><span>{candidate.graduationYear || "—"}</span></p>
                              <p><strong>Current employer</strong><span>{candidate.currentCompany || "—"}</span></p>
                              <p><strong>Current job title</strong><span>{candidate.currentJobTitle || "—"}</span></p>
                              <p><strong>Notice period</strong><span>{candidate.noticePeriod?.replaceAll("_", " ") || "—"}</span></p>
                              <p><strong>Expected salary</strong><span>{candidate.expectedSalary ?? "—"}</span></p>
                              {(candidate.workedAtSGH === "yes" || candidate.workedAtSGH === true) && (
                                <>
                                  <p><strong>Previous SGH role</strong><span>{candidate.sghJobTitle || "—"}</span></p>
                                  <p><strong>SGH employment dates</strong><span>{candidate.sghFromYear || "—"}–{candidate.sghToYear || "—"}</span></p>
                                  <p className="pipeline-detail-wide"><strong>Reason for leaving SGH</strong><span>{candidate.sghReasonLeaving || "—"}</span></p>
                                </>
                              )}
                              <p className="pipeline-detail-wide"><strong>Applicant summary</strong><span>{candidate.answer || "—"}</span></p>
                              {candidate.evaluations.length === 0 ? (
                                <p className="pipeline-detail-wide"><strong>Interview history</strong><span>No evaluations yet.</span></p>
                              ) : candidate.evaluations.map((evaluation, index) => (
                                <div className="pipeline-evaluation-history" key={`${evaluation.stage}-${evaluation.evaluatedAt || index}`}>
                                  <strong>{stageLabels[evaluation.stage] || evaluation.stage} · {evaluation.score}/5</strong>
                                  <span>{evaluation.interviewer || "Interviewer not specified"} · {formatDate(evaluation.evaluatedAt)}</span>
                                  <span>{evaluation.notes}</span>
                                  {evaluation.recommendation && <span>Recommendation: {recommendationLabels[evaluation.recommendation] || evaluation.recommendation}</span>}
                                  {evaluation.trainingNeeds && <span>Training needs: {evaluation.trainingNeeds}</span>}
                                </div>
                              ))}
                            </div>
                          </details>
                        </td>
                        <td>
                          <strong>{candidate.specialty || candidate.qualification || "—"}</strong>
                          <span className="pipeline-track">{sectorLabels[candidate.sector] || candidate.sector}</span>
                        </td>
                        <td>
                          {candidate.workedAtSGH === "yes" || candidate.workedAtSGH === true ? (
                            <div>
                              <span className="sgh-history-badge">
                                Former employee · {candidate.sghBranch || "Branch not specified"}
                              </span>
                              {candidate.sghJobTitle && <span className="pipeline-contact">{candidate.sghJobTitle}</span>}
                              {candidate.sghFromYear && <span className="pipeline-contact">{candidate.sghFromYear}–{candidate.sghToYear}</span>}
                            </div>
                          ) : (
                            <span className="pipeline-no-history">No previous SGH employment</span>
                          )}
                        </td>
                        <td><span className={`stage-badge stage-${candidate.currentStage.toLowerCase()}`}>{stageLabels[candidate.currentStage] || candidate.currentStage}</span></td>
                        <td>
                          <span className={`status-pill ${candidate.status === "OFFER_ISSUED" ? "status-done" : candidate.status === "REJECTED" ? "status-rejected" : "status-pending"}`}>
                            {candidate.status === "OFFER_ISSUED" ? "OFFER ISSUED" : candidate.status}
                          </span>
                        </td>
                        <td className="pipeline-action-cell">
                          {!terminal ? (
                            <div className="pipeline-actions">
                              <button className="button button-primary" onClick={() => setSelectedCandidate(candidate)} type="button">
                                Evaluate interview
                              </button>
                              {candidate.resumeFile && (
                                <button className="button button-subtle" onClick={() => void downloadResume(candidate)} type="button">
                                  Download resume
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="pipeline-actions">
                              <span className="pipeline-complete">Complete</span>
                              {candidate.resumeFile && (
                                <button className="button button-subtle" onClick={() => void downloadResume(candidate)} type="button">
                                  Download resume
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="pipeline-footer-stats" aria-label="Pipeline totals">
          <span>Active in pipeline <strong>{pendingCount}</strong></span>
          <span>Offers issued <strong>{offeredCount}</strong></span>
          <span>Rejected <strong>{candidates.filter((candidate) => candidate.currentStage === "REJECTED").length}</strong></span>
        </section>
        <p className="storage-warning">
          Candidate records include personal information. Restrict dashboard access and use encrypted, persistent storage before production.
        </p>
      </div>

      {selectedCandidate && (
        <EvaluationModal
          apiKey={apiKey}
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onSaved={handleSaveEvaluation}
          stage={selectedCandidate.currentStage}
        />
      )}
    </main>
  );
}
