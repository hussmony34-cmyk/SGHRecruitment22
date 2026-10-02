import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const dataDirectory = path.join(process.cwd(), "data");
const dataFile = path.join(dataDirectory, "applications.json");
const resumeDirectory = path.join(dataDirectory, "private-resumes");
let writeQueue = Promise.resolve();

async function readApplications() {
  try {
    const contents = await readFile(dataFile, "utf8");
    const applications = JSON.parse(contents);
    if (!Array.isArray(applications)) {
      throw new Error("Application data must be a JSON array.");
    }
    return applications;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function withWriteLock(operation) {
  const pending = writeQueue.then(operation);
  writeQueue = pending.catch(() => {});
  return pending;
}

async function persistApplications(applications) {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryFile = path.join(dataDirectory, `.${randomUUID()}.tmp`);
  await writeFile(temporaryFile, JSON.stringify(applications, null, 2), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  await rename(temporaryFile, dataFile);
}

export async function listApplications() {
  await writeQueue;
  return readApplications();
}

export async function createApplication(input) {
  return withWriteLock(async () => {
    const applications = await readApplications();
    const application = {
      id: randomUUID(),
      ...input,
      candidateCode: `SGH-${randomUUID().slice(0, 8).toUpperCase()}`,
      currentStage: "HR_INTERVIEW",
      status: "PENDING",
      createdAt: new Date().toISOString(),
      evaluation: null,
      evaluations: [],
    };
    applications.unshift(application);
    await persistApplications(applications);
    return application;
  });
}

export async function saveEvaluation(id, { stage, action, evaluationData }) {
  return withWriteLock(async () => {
    const applications = await readApplications();
    const index = applications.findIndex((application) => application.id === id);
    if (index === -1) return null;

    const current = applications[index];
    const currentStage = current.currentStage || "HR_INTERVIEW";
    if (currentStage !== stage || !["HR_INTERVIEW", "TECHNICAL_INTERVIEW", "HR_MANAGER"].includes(stage)) {
      const error = new Error("The candidate stage has changed. Refresh and try again.");
      error.code = "STAGE_CONFLICT";
      throw error;
    }
    const nextStageByAction = {
      MOVE_NEXT: {
        HR_INTERVIEW: "TECHNICAL_INTERVIEW",
        TECHNICAL_INTERVIEW: "HR_MANAGER",
      },
      OFFER: { HR_MANAGER: "OFFERED" },
      REJECT: {
        HR_INTERVIEW: "REJECTED",
        TECHNICAL_INTERVIEW: "REJECTED",
        HR_MANAGER: "REJECTED",
      },
    };
    const nextStage = nextStageByAction[action]?.[stage];
    if (!nextStage) {
      const error = new Error("This action is not allowed at the current stage.");
      error.code = "INVALID_STAGE_ACTION";
      throw error;
    }

    const evaluation = {
      ...evaluationData,
      stage,
      action,
      evaluatedAt: new Date().toISOString(),
    };
    const previousEvaluations = Array.isArray(current.evaluations)
      ? current.evaluations
      : current.evaluation
        ? [{ ...current.evaluation, stage: currentStage }]
        : [];
    const updated = {
      ...current,
      currentStage: nextStage,
      status: nextStage === "OFFERED" ? "OFFER_ISSUED" : nextStage === "REJECTED" ? "REJECTED" : "PENDING",
      lastEvaluation: evaluation,
      evaluations: [...previousEvaluations, evaluation],
      evaluation,
    };
    applications[index] = updated;
    await persistApplications(applications);
    return updated;
  });
}

export async function storeResume(buffer, extension) {
  const filename = `${randomUUID()}.${extension}`;
  await mkdir(resumeDirectory, { recursive: true });
  await writeFile(path.join(resumeDirectory, filename), buffer, {
    flag: "wx",
    mode: 0o600,
  });
  return filename;
}

export async function deleteStoredResume(filename) {
  if (!/^[0-9a-f-]+\.(pdf|doc|docx)$/.test(filename)) {
    throw new Error("Invalid stored resume filename.");
  }
  try {
    await unlink(path.join(resumeDirectory, filename));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export async function readStoredResume(filename) {
  if (!/^[0-9a-f-]+\.(pdf|doc|docx)$/.test(filename)) {
    throw new Error("Invalid stored resume filename.");
  }
  return readFile(path.join(resumeDirectory, filename));
}
