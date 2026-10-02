"use client";

import { useState } from "react";

const recommendations = [
  { value: "strong_yes", label: "Strongly recommended" },
  { value: "yes", label: "Recommended" },
  { value: "hold", label: "On hold" },
  { value: "no", label: "Not recommended" },
];

const stageLabels = {
  HR_INTERVIEW: "HR Interview",
  TECHNICAL_INTERVIEW: "Technical Interview",
  HR_MANAGER: "HR Manager Review",
};

export default function EvaluationModal({ candidate, stage, apiKey, onClose, onSaved }) {
  const existingEvaluation = candidate.evaluations?.find((item) => item.stage === stage);
  const [form, setForm] = useState({
    score: existingEvaluation?.score ?? 3,
    notes: existingEvaluation?.notes ?? "",
    trainingNeeds: existingEvaluation?.trainingNeeds ?? "",
    recommendation: existingEvaluation?.recommendation ?? "yes",
    interviewer: existingEvaluation?.interviewer ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    const action = event.nativeEvent.submitter?.value;
    if (!action) return;

    setError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/applications/${candidate.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          stage,
          action,
          evaluationData: { ...form, score: Number(form.score) },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save the evaluation.");
      onSaved(result.application);
    } catch (saveError) {
      setError(saveError.message || "Unable to connect to the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section
        aria-labelledby="evaluation-modal-title"
        aria-modal="true"
        className="evaluation-modal"
        role="dialog"
      >
        <div className="evaluation-modal-header">
          <div>
            <span className="eyebrow">{stageLabels[stage]}</span>
            <h2 id="evaluation-modal-title">Interview evaluation</h2>
            <p>{candidate.fullName} · {candidate.jobTitle || candidate.specialty}</p>
          </div>
          <button className="text-button" disabled={saving} onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form className="evaluation-modal-form" onSubmit={submit}>
          <label className="field">
            <span>Interviewer name</span>
            <input
              maxLength={120}
              onChange={(event) => update("interviewer", event.target.value)}
              value={form.interviewer}
            />
          </label>
          <fieldset className="score-field">
            <legend>Overall rating <b>*</b></legend>
            <div className="score-options">
              {[1, 2, 3, 4, 5].map((score) => (
                <label className={Number(form.score) === score ? "score-selected" : ""} key={score}>
                  <input
                    checked={Number(form.score) === score}
                    name={`score-${candidate.id}-${stage}`}
                    onChange={() => update("score", score)}
                    type="radio"
                    value={score}
                  />
                  {score}
                </label>
              ))}
            </div>
            <small className="field-hint">1: Needs improvement · 5: Outstanding</small>
          </fieldset>
          <label className="field">
            <span>Interview notes <b>*</b></span>
            <textarea
              maxLength={2000}
              onChange={(event) => update("notes", event.target.value)}
              required
              rows={3}
              value={form.notes}
            />
          </label>
          <label className="field">
            <span>Training needs analysis (TNA)</span>
            <textarea
              maxLength={1500}
              onChange={(event) => update("trainingNeeds", event.target.value)}
              rows={3}
              value={form.trainingNeeds}
            />
          </label>
          <label className="field">
            <span>Recommendation <b>*</b></span>
            <select onChange={(event) => update("recommendation", event.target.value)} value={form.recommendation}>
              {recommendations.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button className="button button-danger" disabled={saving} name="action" value="REJECT">
              Reject candidate
            </button>
            {stage === "HR_MANAGER" ? (
              <button className="button button-primary" disabled={saving} name="action" value="OFFER">
                {saving ? "Saving..." : "Issue offer"}
              </button>
            ) : (
              <button className="button button-primary" disabled={saving} name="action" value="MOVE_NEXT">
                {saving ? "Saving..." : stage === "HR_INTERVIEW" ? "Save & move to technical interview" : "Save & move to HR manager"}
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
