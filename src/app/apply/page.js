"use client";

import { useState } from "react";
import DynamicApplicationForm from "@/components/DynamicApplicationForm";
import TrackSelection from "@/components/TrackSelection";

export default function ApplyPage() {
  const [selectedTrack, setSelectedTrack] = useState(null);

  return (
    <main className="application-page">
      {!selectedTrack ? (
        <TrackSelection onSelectTrack={setSelectedTrack} />
      ) : (
        <DynamicApplicationForm
          key={selectedTrack}
          track={selectedTrack}
          onBack={() => setSelectedTrack(null)}
        />
      )}
    </main>
  );
}
