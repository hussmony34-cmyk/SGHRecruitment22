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

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url && !serviceRoleKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Supabase must be configured before running the application in production.");
    }
    return null;
  }
  if (!url || !serviceRoleKey) {
    throw new Error("Both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.");
  }
  return { url: url.replace(/\/+$/, ""), serviceRoleKey };
}

async function supabaseRequest(endpoint, options = {}) {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase storage is not configured.");
  const { raw = false, ...requestOptions } = options;

  const response = await fetch(`${config.url}${endpoint}`, {
    ...requestOptions,
    headers: {
      apikey: config.serviceRoleKey,
      ...(config.serviceRoleKey.startsWith("sb_secret_")
        ? {}
        : { Authorization: `Bearer ${config.serviceRoleKey}` }),
      ...options.headers,
    },
    cache: "no-store",
  });
  if (raw) {
    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`Supabase request failed (${response.status})${responseText ? `: ${responseText}` : ""}`);
    }
    return { response, result: null };
  }
  const responseText = await response.text();
  let result;
  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      result = responseText;
    }
  }
  if (!response.ok) {
    const message = typeof result === "object" && result
      ? result.message || result.error || result.msg
      : result;
    throw new Error(`Supabase request failed (${response.status})${message ? `: ${message}` : ""}`);
  }
  return { response, result };
}

function applicationFromRow(row) {
  const legacyApplication = {
    fullName: row.full_name,
    fullNameAr: row.full_name_ar,
    fullNameEn: row.full_name_en,
    nationalId: row.national_id,
    birthDate: row.birth_date,
    gender: row.gender,
    nationality: row.nationality,
    governorate: row.governorate,
    address: row.address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    sector: row.sector,
    specialty: row.specialty,
    qualification: row.qualification,
    graduationYear: row.graduation_year,
    university: row.university,
    workedAtSGH: row.worked_at_sgh ? "yes" : "no",
    sghBranch: row.sgh_branch,
    sghJobTitle: row.sgh_job_title,
    sghFromYear: row.sgh_from_year,
    sghToYear: row.sgh_to_year,
    sghReasonLeaving: row.sgh_reason_leaving,
    medicalDegree: row.medical_degree,
    syndicateNumber: row.syndicate_number,
    clinicalDepartment: row.clinical_department,
    hasBLS: row.has_bls,
    hasACLS: row.has_acls,
    subSpecialty: row.sub_specialty,
    experienceYears: row.experience_years,
    currentCompany: row.current_company,
    currentJobTitle: row.current_job_title,
    noticePeriod: row.notice_period,
    expectedSalary: row.expected_salary,
    answer: row.answer,
    resumeFile: row.resume_path
      ? {
          filename: row.resume_path,
          originalName: row.resume_original_name,
          contentType: row.resume_content_type,
          size: row.resume_size,
        }
      : null,
  };
  const storedApplication = row.application &&
    typeof row.application === "object" &&
    Object.keys(row.application).length > 0
    ? row.application
    : legacyApplication;
  const currentStage = row.current_stage || "HR_INTERVIEW";
  const evaluations = Array.isArray(row.evaluations)
    ? row.evaluations
    : row.evaluation
      ? [{ ...row.evaluation, stage: row.evaluation.stage || currentStage }]
      : [];
  return {
    ...storedApplication,
    id: row.id,
    candidateCode: row.candidate_code || `SGH-${row.id.replaceAll("-", "").slice(0, 8).toUpperCase()}`,
    currentStage,
    status: row.status,
    createdAt: row.created_at,
    evaluation: row.evaluation,
    lastEvaluation: row.evaluation,
    evaluations,
  };
}

function supabaseRowFromApplication(application) {
  return {
    id: application.id,
    candidate_code: application.candidateCode,
    current_stage: application.currentStage,
    status: application.status,
    created_at: application.createdAt,
    application: application,
    full_name: application.fullName,
    full_name_ar: application.fullNameAr,
    full_name_en: application.fullNameEn,
    national_id: application.nationalId,
    birth_date: application.birthDate,
    gender: application.gender,
    nationality: application.nationality,
    governorate: application.governorate,
    address: application.address,
    phone: application.phone,
    whatsapp: application.whatsapp,
    email: application.email,
    sector: application.sector,
    specialty: application.specialty,
    qualification: application.qualification,
    graduation_year: application.graduationYear,
    university: application.university,
    worked_at_sgh: application.workedAtSGH === "yes" || application.workedAtSGH === true,
    sgh_branch: application.sghBranch,
    sgh_job_title: application.sghJobTitle,
    sgh_from_year: application.sghFromYear,
    sgh_to_year: application.sghToYear,
    sgh_reason_leaving: application.sghReasonLeaving,
    medical_degree: application.medicalDegree || "",
    syndicate_number: application.syndicateNumber || "",
    clinical_department: application.clinicalDepartment || "",
    has_bls: application.hasBLS === true,
    has_acls: application.hasACLS === true,
    sub_specialty: application.subSpecialty || "",
    experience_years: application.experienceYears,
    current_company: application.currentCompany || "",
    current_job_title: application.currentJobTitle || "",
    notice_period: application.noticePeriod,
    expected_salary: application.expectedSalary,
    answer: application.answer,
    resume_path: application.resumeFile?.filename || null,
    resume_original_name: application.resumeFile?.originalName || null,
    resume_content_type: application.resumeFile?.contentType || null,
    resume_size: application.resumeFile?.size || null,
    evaluation: application.evaluation,
    evaluations: application.evaluations,
  };
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
  if (getSupabaseConfig()) {
    const { result } = await supabaseRequest(
      "/rest/v1/applications?select=*&order=created_at.desc",
    );
    return result.map(applicationFromRow);
  }
  await writeQueue;
  return readApplications();
}

export async function getApplication(id) {
  if (getSupabaseConfig()) {
    const { result: rows } = await supabaseRequest(
      `/rest/v1/applications?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    );
    return rows[0] ? applicationFromRow(rows[0]) : null;
  }
  await writeQueue;
  const applications = await readApplications();
  return applications.find((application) => application.id === id) || null;
}

export async function createApplication(input) {
  if (getSupabaseConfig()) {
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
    await supabaseRequest("/rest/v1/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(supabaseRowFromApplication(application)),
    });
    return application;
  }
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
  if (getSupabaseConfig()) {
    const { result: rows } = await supabaseRequest(
      `/rest/v1/applications?id=eq.${encodeURIComponent(id)}&select=*`,
    );
    const currentRow = rows[0];
    if (!currentRow) return null;

    const current = applicationFromRow(currentRow);
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
    const updated = {
      ...current,
      currentStage: nextStage,
      status: nextStage === "OFFERED" ? "OFFER_ISSUED" : nextStage === "REJECTED" ? "REJECTED" : "PENDING",
      lastEvaluation: evaluation,
      evaluations: [...current.evaluations, evaluation],
      evaluation,
    };
    const { result: updatedRows } = await supabaseRequest(
      `/rest/v1/applications?id=eq.${encodeURIComponent(id)}&current_stage=eq.${encodeURIComponent(stage)}&select=*`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({
          current_stage: updated.currentStage,
          status: updated.status,
          evaluation,
          evaluations: updated.evaluations,
        }),
      },
    );
    if (updatedRows.length === 0) {
      const error = new Error("The candidate stage has changed. Refresh and try again.");
      error.code = "STAGE_CONFLICT";
      throw error;
    }
    return applicationFromRow(updatedRows[0]);
  }

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
  if (getSupabaseConfig()) {
    await supabaseRequest(`/storage/v1/object/private-resumes/${encodeURIComponent(filename)}`, {
      method: "POST",
      headers: {
        "Content-Type": {
          pdf: "application/pdf",
          doc: "application/msword",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }[extension],
        "x-upsert": "false",
      },
      body: buffer,
    });
    return filename;
  }
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
  if (getSupabaseConfig()) {
    await supabaseRequest("/storage/v1/object/private-resumes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [filename] }),
    });
    return;
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
  if (getSupabaseConfig()) {
    const { response } = await supabaseRequest(
      `/storage/v1/object/private-resumes/${encodeURIComponent(filename)}`,
      { raw: true },
    );
    return Buffer.from(await response.arrayBuffer());
  }
  return readFile(path.join(resumeDirectory, filename));
}
