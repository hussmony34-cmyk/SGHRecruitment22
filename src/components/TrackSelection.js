"use client";

import { useRouter } from "next/navigation";

const tracks = [
  {
    id: "drs",
    title: "Doctors",
    desc: "Consultants, specialists, residents, fellowships, and medical specialties",
    icon: "🩺",
    badge: "Medical",
  },
  {
    id: "nursing",
    title: "Nursing",
    desc: "Critical care, operating rooms, emergency, and inpatient units",
    icon: "💉",
    badge: "Nursing",
  },
  {
    id: "nursing_support",
    title: "Nursing Support Services",
    desc: "Nursing assistants, patient transport, and patient care",
    icon: "🤝",
    badge: "Clinical Support",
  },
  {
    id: "admin",
    title: "Administrative Roles",
    desc: "Human resources, finance, customer service, admissions, and IT",
    icon: "💼",
    badge: "Administration",
  },
  {
    id: "operation",
    title: "Operations",
    desc: "Facilities, biomedical equipment, security, food and beverage, and services",
    icon: "⚙️",
    badge: "Operations",
  },
];

export default function TrackSelection({ onSelectTrack }) {
  const router = useRouter();

  function selectTrack(trackId) {
    if (onSelectTrack) {
      onSelectTrack(trackId);
      return;
    }
    router.push(`/apply?sector=${encodeURIComponent(trackId)}`);
  }

  return (
    <div className="track-selection">
      <div className="track-selection-heading">
        <div className="track-selection-hospital" aria-hidden="true">🏥</div>
        <h2>Saudi German Hospital</h2>
        <p>Unified Careers Portal — Select a department to continue</p>
      </div>

      <div className="track-selection-list">
        {tracks.map((track) => (
          <button
            className="track-selection-card"
            key={track.id}
            onClick={() => selectTrack(track.id)}
            type="button"
          >
            <span className="track-selection-icon" aria-hidden="true">
              {track.icon}
            </span>
            <span className="track-selection-copy">
              <span className="track-selection-title">
                <strong>{track.title}</strong>
                <small>{track.badge}</small>
              </span>
              <span className="track-selection-description">{track.desc}</span>
            </span>
            <span className="track-selection-arrow" aria-hidden="true">→</span>
          </button>
        ))}
      </div>

      <p className="track-selection-footer">Saudi German Health — Cairo</p>
    </div>
  );
}
