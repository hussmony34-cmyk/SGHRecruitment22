import { NextResponse } from "next/server";
import {
  createApplication,
  deleteStoredResume,
  listApplications,
  storeResume,
} from "@/lib/application-store";
import { authorizeHrRequest } from "@/lib/hr-auth";

export const runtime = "nodejs";

const sectors = new Set([
  "drs",
  "nursing",
  "nursing_support",
  "admin",
  "operation",
  "doctors",
  "operations",
  "administration",
]);
const canonicalSectors = {
  doctors: "drs",
  operations: "operation",
  administration: "admin",
};
const governorates = new Set(["Cairo", "Giza", "Alexandria", "Qalyubia", "Sharqia", "Other"]);
const branches = new Set(["Cairo", "Alexandria", "Riyadh", "Jeddah", "Dubai", "Other"]);
const clinicalDepartments = new Set(["ICU", "NICU", "CCU", "OR", "ER", "Inpatient"]);
const medicalDegrees = new Set(["resident", "specialist", "consultant", "fellow"]);
const maxRequestBytes = 6 * 1024 * 1024;
const maxResumeBytes = 5 * 1024 * 1024;

function jsonError(message, status) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function validText(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function validOptionalText(value, maxLength) {
  return value === undefined || value === "" ||
    (typeof value === "string" && value.length <= maxLength);
}

function validYear(value, { minimum = 1950, maximum = new Date().getFullYear() } = {}) {
  return /^\d{4}$/.test(String(value)) && Number(value) >= minimum && Number(value) <= maximum;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value &&
    date < new Date(new Date().toISOString().slice(0, 10));
}

async function readSubmission(request) {
  const contentType = request.headers.get("content-type") || "";
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxRequestBytes) {
    return { error: "The application exceeds the 6 MB upload limit.", status: 413 };
  }

  if (contentType.includes("multipart/form-data")) {
    let formData;
    try {
      formData = await request.formData();
    } catch (error) {
      if (error instanceof TypeError || error instanceof SyntaxError) {
        return { error: "Unable to read the application data.", status: 400 };
      }
      throw error;
    }

    const input = Object.fromEntries(
      [...formData.entries()].filter(([key, value]) => key !== "resume" && typeof value === "string"),
    );
    input.consent = input.consent === "true";
    input.hasBLS = input.hasBLS === "true";
    input.hasACLS = input.hasACLS === "true";
    const resume = formData.get("resume");
    return { input, resume: resume instanceof File && resume.size > 0 ? resume : null };
  }

  try {
    return { input: await request.json(), resume: null };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { error: "Unable to read the application data.", status: 400 };
    }
    throw error;
  }
}

function validateSubmission(input) {
  const experience = input.totalExperienceYears ?? input.experienceYears;
  const hasExperience =
    (typeof experience === "number" ||
      (typeof experience === "string" && experience.trim() !== "")) &&
    Number.isInteger(Number(experience)) &&
    Number(experience) >= 0 &&
    Number(experience) <= 60;
  const workedAtSGH = input.workedAtSGH ?? "no";
  const sector = canonicalSectors[input.sector] ?? input.sector;
  const currentYear = new Date().getFullYear();
  const sharedFieldsValid =
    validText(input.fullNameEn ?? input.fullName, 120) &&
    validOptionalText(input.fullNameAr, 120) &&
    validText(input.nationalId, 32) &&
    validDate(input.birthDate) &&
    new Set(["male", "female"]).has(input.gender) &&
    validText(input.nationality, 80) &&
    validText(input.phone, 30) &&
    validText(input.whatsapp, 30) &&
    validText(input.email, 254) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) &&
    governorates.has(input.governorate) &&
    validText(input.address, 250) &&
    sectors.has(sector) &&
    validText(input.qualification, 160) &&
    validYear(input.graduationYear, { minimum: 1950, maximum: currentYear }) &&
    validText(input.university, 160) &&
    hasExperience &&
    validText(input.noticePeriod, 30) &&
    validOptionalText(input.currentCompany, 160) &&
    validOptionalText(input.currentJobTitle, 120) &&
    new Set(["immediate", "one_month", "two_months", "three_months"]).has(input.noticePeriod) &&
    validOptionalText(input.expectedSalary, 30) &&
    /^\d{0,12}(?:\.\d{1,2})?$/.test(input.expectedSalary ?? "") &&
    new Set(["yes", "no"]).has(workedAtSGH) &&
    typeof input.consent === "boolean" &&
    input.consent;

  if (!sharedFieldsValid) return false;

  if (workedAtSGH === "yes") {
    if (
      !branches.has(input.sghBranch) ||
      !validText(input.sghJobTitle, 120) ||
      !validYear(input.sghFromYear) ||
      !validYear(input.sghToYear, { maximum: currentYear }) ||
      Number(input.sghToYear) < Number(input.sghFromYear) ||
      !validText(input.sghReasonLeaving, 300)
    ) {
      return false;
    }
  }

  if (
    !validText(input.specialty, 160) ||
    !validText(input.totalExperienceYears ?? input.experienceYears, 3) ||
    !validText(input.answer, 1200)
  ) {
    return false;
  }

  if (sector === "drs") {
    return medicalDegrees.has(input.medicalDegree) &&
      validText(input.syndicateNumber, 80);
  }
  if (sector === "nursing") {
    return clinicalDepartments.has(input.clinicalDepartment) &&
      validText(input.syndicateNumber, 80) &&
      typeof input.hasBLS === "boolean" &&
      typeof input.hasACLS === "boolean";
  }
  return validOptionalText(input.subSpecialty, 300);
}

async function storeUploadedResume(file) {
  if (!file) return null;
  if (file.size > maxResumeBytes) {
    return { error: "The resume must be 5 MB or smaller.", status: 413 };
  }

  const extension = file.name.toLowerCase().split(".").pop();
  const supportedTypes = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  if (!supportedTypes[extension] || file.type !== supportedTypes[extension]) {
    return { error: "Upload your resume as a PDF, DOC, or DOCX file.", status: 400 };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const isPdf = extension === "pdf" && buffer.subarray(0, 5).toString() === "%PDF-";
  const isDoc = extension === "doc" &&
    buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  const isDocx = extension === "docx" && buffer.subarray(0, 2).toString() === "PK";
  if (!isPdf && !isDoc && !isDocx) {
    return { error: "The uploaded file does not match its declared document type.", status: 400 };
  }

  const filename = await storeResume(buffer, extension);
  return {
    filename,
    contentType: supportedTypes[extension],
    originalName: file.name.replace(/[\\/]/g, "_").slice(0, 180),
    size: file.size,
  };
}

export async function GET(request) {
  const access = authorizeHrRequest(request);
  if (access.unavailable) return jsonError("HR access is not configured on the server.", 503);
  if (!access.allowed) return jsonError("Invalid access credentials.", 401);

  const applications = await listApplications();
  return NextResponse.json(
    {
      applications: applications.map((application) => ({
        ...application,
        candidateCode:
          application.candidateCode || `SGH-${application.id.slice(0, 8).toUpperCase()}`,
        currentStage: application.currentStage || "HR_INTERVIEW",
        status:
          application.status === "OFFER_ISSUED" || application.status === "REJECTED"
            ? application.status
            : "PENDING",
        evaluations: Array.isArray(application.evaluations)
          ? application.evaluations
          : application.evaluation
            ? [{
                ...application.evaluation,
                stage: application.evaluation.stage || "HR_INTERVIEW",
              }]
            : [],
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request) {
  const submission = await readSubmission(request);
  if (submission.error) return jsonError(submission.error, submission.status);
  const { input, resume } = submission;

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return jsonError("Unable to read the application data.", 400);
  }
  if (!validateSubmission(input)) {
    return jsonError("Please review the required fields and make sure the information is valid.", 400);
  }

  const uploadedResume = await storeUploadedResume(resume);
  if (uploadedResume?.error) return jsonError(uploadedResume.error, uploadedResume.status);
  const resumeFile = uploadedResume
    ? {
        filename: uploadedResume.filename,
        contentType: uploadedResume.contentType,
        originalName: uploadedResume.originalName,
        size: uploadedResume.size,
      }
    : null;

  try {
    const application = await createApplication({
      fullName: (input.fullNameEn || input.fullName || input.fullNameAr).trim(),
      fullNameAr: (input.fullNameAr || "").trim(),
      fullNameEn: (input.fullNameEn || input.fullName || "").trim(),
      nationalId: input.nationalId.trim(),
      birthDate: input.birthDate,
      gender: input.gender,
      nationality: input.nationality.trim(),
      governorate: input.governorate,
      address: input.address.trim(),
      phone: input.phone.trim(),
      whatsapp: input.whatsapp.trim(),
      email: input.email.trim().toLowerCase(),
      sector: canonicalSectors[input.sector] ?? input.sector,
      specialty: input.specialty.trim(),
      qualification: input.qualification.trim(),
      graduationYear: Number(input.graduationYear),
      university: input.university.trim(),
      workedAtSGH: input.workedAtSGH ?? "no",
      sghBranch: input.sghBranch || "",
      sghJobTitle: input.sghJobTitle || "",
      sghFromYear: input.sghFromYear ? Number(input.sghFromYear) : null,
      sghToYear: input.sghToYear ? Number(input.sghToYear) : null,
      sghReasonLeaving: input.sghReasonLeaving || "",
      medicalDegree: input.medicalDegree || "",
      syndicateNumber: input.syndicateNumber || "",
      clinicalDepartment: input.clinicalDepartment || "",
      hasBLS: input.hasBLS,
      hasACLS: input.hasACLS,
      subSpecialty: (input.subSpecialty || "").trim(),
      experienceYears: Number(input.totalExperienceYears ?? input.experienceYears),
      currentCompany: (input.currentCompany || "").trim(),
      currentJobTitle: (input.currentJobTitle || "").trim(),
      noticePeriod: input.noticePeriod,
      expectedSalary: input.expectedSalary ? Number(input.expectedSalary) : null,
      answer: input.answer.trim(),
      resumeUrl: "",
      resumeFile,
    });
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    if (resumeFile) await deleteStoredResume(resumeFile.filename);
    throw error;
  }
}
