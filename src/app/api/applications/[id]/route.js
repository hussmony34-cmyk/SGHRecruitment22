import { NextResponse } from "next/server";
import {
  listApplications,
  readStoredResume,
  saveEvaluation,
} from "@/lib/application-store";
import { authorizeHrRequest } from "@/lib/hr-auth";

export const runtime = "nodejs";

function jsonError(message, status) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request, { params }) {
  const access = authorizeHrRequest(request);
  if (access.unavailable) {
    return jsonError("HR access is not configured on the server.", 503);
  }
  if (!access.allowed) return jsonError("Invalid access credentials.", 401);

  const { id } = await params;
  const application = (await listApplications()).find((item) => item.id === id);
  if (!application) return jsonError("Application not found.", 404);
  if (!application.resumeFile) return jsonError("No resume is attached to this application.", 404);

  const resume = await readStoredResume(application.resumeFile.filename);
  const extension = application.resumeFile.filename.split(".").pop();
  const contentType = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }[extension];

  return new NextResponse(resume, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="resume-${id}.${extension}"`,
      "Content-Length": String(resume.length),
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function PATCH(request, { params }) {
  const access = authorizeHrRequest(request);
  if (access.unavailable) {
    return jsonError("HR access is not configured on the server.", 503);
  }
  if (!access.allowed) return jsonError("Invalid access credentials.", 401);

  let input;
  try {
    input = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Unable to read the evaluation data.", 400);
    throw error;
  }

  const recommendations = new Set(["strong_yes", "yes", "hold", "no"]);
  const stages = new Set(["HR_INTERVIEW", "TECHNICAL_INTERVIEW", "HR_MANAGER"]);
  const actions = new Set(["MOVE_NEXT", "OFFER", "REJECT"]);
  const evaluation = input?.evaluationData;
  if (
    !input ||
    typeof input !== "object" ||
    !stages.has(input.stage) ||
    !actions.has(input.action) ||
    !evaluation ||
    typeof evaluation !== "object" ||
    !Number.isInteger(evaluation.score) ||
    evaluation.score < 1 ||
    evaluation.score > 5 ||
    typeof evaluation.notes !== "string" ||
    evaluation.notes.length > 2000 ||
    evaluation.notes.trim().length === 0 ||
    typeof evaluation.trainingNeeds !== "string" ||
    evaluation.trainingNeeds.length > 1500 ||
    typeof evaluation.recommendation !== "string" ||
    !recommendations.has(evaluation.recommendation) ||
    (evaluation.interviewer !== undefined &&
      (typeof evaluation.interviewer !== "string" || evaluation.interviewer.length > 120))
  ) {
    return jsonError("Please provide a valid rating and complete the required fields.", 400);
  }

  const { id } = await params;
  let application;
  try {
    application = await saveEvaluation(id, {
      stage: input.stage,
      action: input.action,
      evaluationData: {
        score: evaluation.score,
        notes: evaluation.notes.trim(),
        trainingNeeds: evaluation.trainingNeeds.trim(),
        recommendation: evaluation.recommendation,
        interviewer: (evaluation.interviewer || "").trim(),
      },
    });
  } catch (error) {
    if (error.code === "STAGE_CONFLICT" || error.code === "INVALID_STAGE_ACTION") {
      return jsonError(error.message, 409);
    }
    throw error;
  }

  if (!application) return jsonError("Application not found.", 404);
  return NextResponse.json(
    { application },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
