import type {
  RedmineCustomField,
  RedmineIssue,
  RedmineJournal,
  RedmineJournalDetail,
  RedmineReference,
  RedmineStatus,
} from '../data/types'
import { DATA_EXPORT_FORMAT, DATA_EXPORT_VERSION } from '../export/dataExport'

export type DataImportErrorKind =
  | 'invalid-json'
  | 'missing-format'
  | 'invalid-format'
  | 'missing-version'
  | 'unsupported-version'
  | 'missing-exported-at'
  | 'invalid-exported-at'
  | 'missing-issues'
  | 'invalid-issue'
  | 'invalid-journal'
  | 'invalid-journal-detail'

export class DataImportError extends Error {
  readonly kind: DataImportErrorKind
  readonly path?: string

  constructor(message: string, kind: DataImportErrorKind, path?: string) {
    super(message)
    this.name = 'DataImportError'
    this.kind = kind
    this.path = path
  }
}

export interface DataImportResult {
  format: typeof DATA_EXPORT_FORMAT
  version: typeof DATA_EXPORT_VERSION
  exportedAt: string
  issues: RedmineIssue[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) &&
    Number.isFinite(Date.parse(value))
  )
}

function hasValidOptionalStringOrNull(
  record: Record<string, unknown>,
  key: string,
): boolean {
  return (
    !(key in record) || record[key] === null || typeof record[key] === 'string'
  )
}

function hasValidOptionalNumberOrNull(
  record: Record<string, unknown>,
  key: string,
): boolean {
  return (
    !(key in record) || record[key] === null || typeof record[key] === 'number'
  )
}

function isReference(value: unknown): value is RedmineReference {
  return (
    isRecord(value) &&
    isInteger(value.id) &&
    value.id > 0 &&
    typeof value.name === 'string'
  )
}

function isStatus(value: unknown): value is RedmineStatus {
  return (
    isReference(value) &&
    isRecord(value) &&
    typeof value.is_closed === 'boolean'
  )
}

function isCustomField(value: unknown): value is RedmineCustomField {
  return (
    isRecord(value) &&
    isInteger(value.id) &&
    value.id > 0 &&
    typeof value.name === 'string' &&
    typeof value.value === 'string'
  )
}

function validateJournalDetail(
  value: unknown,
  path: string,
): asserts value is RedmineJournalDetail {
  if (
    !isRecord(value) ||
    typeof value.property !== 'string' ||
    typeof value.name !== 'string' ||
    !hasValidOptionalStringOrNull(value, 'old_value') ||
    !hasValidOptionalStringOrNull(value, 'new_value')
  ) {
    throw new DataImportError(
      `Invalid journal detail at ${path}.`,
      'invalid-journal-detail',
      path,
    )
  }
}

function validateJournal(
  value: unknown,
  path: string,
): asserts value is RedmineJournal {
  if (
    !isRecord(value) ||
    !isInteger(value.id) ||
    value.id < 1 ||
    !isReference(value.user) ||
    typeof value.notes !== 'string' ||
    !isIsoTimestamp(value.created_on) ||
    typeof value.private_notes !== 'boolean' ||
    !Array.isArray(value.details)
  ) {
    throw new DataImportError(
      `Invalid journal at ${path}.`,
      'invalid-journal',
      path,
    )
  }

  value.details.forEach((detail, index) =>
    validateJournalDetail(detail, `${path}.details[${index}]`),
  )
}

function validateIssue(
  value: unknown,
  path: string,
): asserts value is RedmineIssue {
  if (
    !isRecord(value) ||
    !isInteger(value.id) ||
    value.id < 1 ||
    !isReference(value.project) ||
    !isReference(value.tracker) ||
    !isStatus(value.status) ||
    !isReference(value.priority) ||
    !isReference(value.author) ||
    typeof value.subject !== 'string' ||
    typeof value.description !== 'string' ||
    !isIsoTimestamp(value.created_on) ||
    !isIsoTimestamp(value.updated_on) ||
    !('closed_on' in value) ||
    (value.closed_on !== null && !isIsoTimestamp(value.closed_on)) ||
    !Array.isArray(value.journals)
  ) {
    throw new DataImportError(
      `Invalid issue at ${path}.`,
      'invalid-issue',
      path,
    )
  }

  const optionalReferences = ['assigned_to', 'category', 'fixed_version']
  const referencesAreValid = optionalReferences.every(
    (key) => !(key in value) || isReference(value[key]),
  )
  const optionalNumbers = ['done_ratio', 'estimated_hours', 'spent_hours']
  const numbersAreValid = optionalNumbers.every(
    (key) => !(key in value) || typeof value[key] === 'number',
  )
  if (
    !referencesAreValid ||
    !hasValidOptionalStringOrNull(value, 'start_date') ||
    !hasValidOptionalStringOrNull(value, 'due_date') ||
    !numbersAreValid ||
    ('is_private' in value && typeof value.is_private !== 'boolean') ||
    !hasValidOptionalNumberOrNull(value, 'total_estimated_hours') ||
    !hasValidOptionalNumberOrNull(value, 'total_spent_hours') ||
    ('custom_fields' in value &&
      (!Array.isArray(value.custom_fields) ||
        !value.custom_fields.every(isCustomField)))
  ) {
    throw new DataImportError(
      `Invalid issue at ${path}.`,
      'invalid-issue',
      path,
    )
  }

  value.journals.forEach((journal, index) =>
    validateJournal(journal, `${path}.journals[${index}]`),
  )
}

export function parseDataImport(json: string): DataImportResult {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    throw new DataImportError(
      'The data import is not valid JSON.',
      'invalid-json',
    )
  }

  if (!isRecord(value) || !('format' in value)) {
    throw new DataImportError(
      'The data import is missing its format identifier.',
      'missing-format',
    )
  }
  if (value.format !== DATA_EXPORT_FORMAT) {
    throw new DataImportError(
      'The data import has an unsupported format.',
      'invalid-format',
      'format',
    )
  }
  if (!('version' in value)) {
    throw new DataImportError(
      'The data import is missing its version.',
      'missing-version',
    )
  }
  if (value.version !== DATA_EXPORT_VERSION) {
    throw new DataImportError(
      'The data import version is not supported.',
      'unsupported-version',
      'version',
    )
  }
  if (!('exportedAt' in value)) {
    throw new DataImportError(
      'The data import is missing its export timestamp.',
      'missing-exported-at',
    )
  }
  if (!isIsoTimestamp(value.exportedAt)) {
    throw new DataImportError(
      'The data import has an invalid export timestamp.',
      'invalid-exported-at',
      'exportedAt',
    )
  }
  if (!('issues' in value)) {
    throw new DataImportError(
      'The data import is missing its issues.',
      'missing-issues',
    )
  }
  if (!Array.isArray(value.issues)) {
    throw new DataImportError(
      'The data import has invalid issues.',
      'invalid-issue',
      'issues',
    )
  }

  value.issues.forEach((issue, index) =>
    validateIssue(issue, `issues[${index}]`),
  )

  return {
    format: DATA_EXPORT_FORMAT,
    version: DATA_EXPORT_VERSION,
    exportedAt: value.exportedAt,
    issues: value.issues,
  }
}
