import { ApiError } from "./errors.mjs";

export function normalizeRepositorySlug(value) {
  return value.trim().replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "").toLowerCase();
}

export function canonicalProjectIdFromRepositorySlug(value) {
  const normalizedSlug = normalizeRepositorySlug(value);
  const repositoryName = normalizedSlug.split("/").filter(Boolean).at(-1);
  if (!repositoryName || !/^(?!\.{1,2}$)[a-z0-9._-]+$/.test(repositoryName)) {
    throw new ApiError(400, "VALIDATION_ERROR", "repository_slug must end with a safe Git repository name.", {
      issues: [
        {
          path: "repository_slug",
          message: "repository_slug must end with one repository-name segment using letters, digits, dots, underscores, or hyphens.",
          code: "custom"
        }
      ]
    });
  }
  return repositoryName;
}

export function ensureMatchingProjectRepository(existingProject, incomingProject) {
  if (
    existingProject &&
    normalizeRepositorySlug(existingProject.repository_slug) !== normalizeRepositorySlug(incomingProject.repository_slug)
  ) {
    throw new ApiError(
      409,
      "PROJECT_ID_REPOSITORY_CONFLICT",
      `Canonical project id '${incomingProject.project_id}' is already assigned to a different repository.`,
      {
        project_id: incomingProject.project_id,
        existing_repository_slug: existingProject.repository_slug,
        incoming_repository_slug: incomingProject.repository_slug
      }
    );
  }
}
