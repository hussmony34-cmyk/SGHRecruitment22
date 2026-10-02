"use client";

import { useState } from "react";

const recommendations = [
  { value: "strong_yes", label: "Strongly recommended" },
  { value: "yes", label: "Recommended" },
  { value: "hold", label: "On hold" },
  { value: "no", label: "Not recommended at this time" },
];

export default function EvaluationForm({ application, apiKey, onSaved, onCancel }) {
  const [form, setForm] = useState({
    score: application.evaluation?.score ?? 3,
    notes: application.evaluation?.notes ?? "",
    trainingNeeds: application.evaluation?.trainingNeeds ?? "",
    recommendation: application.evaluation?.recommendation ?? "yes",
    interviewer: application.evaluation?.interviewer ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...form, score: Number(form.score) }),
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
    <form className="evaluation-form" onSubmit={submit}>
      <div className="evaluation-heading">
        <h3>Interview evaluation</h3>
        <button className="text-button" onClick={onCancel} type="button">Close</button>
      </div>
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
                name={`score-${application.id}`}
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
        <span>Interview summary <b>*</b></span>
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
        <select
          onChange={(event) => update("recommendation", event.target.value)}
          value={form.recommendation}
        >
          {recommendations.map((recommendation) => (
            <option key={recommendation.value} value={recommendation.value}>
              {recommendation.label}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="evaluation-actions">
        <button className="button button-primary" disabled={saving}>
          {saving ? "Saving..." : "Save evaluation"}
        </button>
        <button className="button button-subtle" onClick={onCancel} type="button">Cancel</button>
      </div>
    </form>
  );
}
