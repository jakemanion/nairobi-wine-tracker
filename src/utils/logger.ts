import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { FailureCategory, FailureDiagnostic, FailureStage } from './failureDiagnostics'

export type EnrichmentLogEntry = {
  timestamp: string
  wineId: string
  wineName: string | null
  producer: string | null
  vivinoUrl: string | null
  confidence: number | null
  status: string
  message?: string
  error?: string
  failureStage?: FailureStage
  failureCategory?: FailureCategory
  failureReason?: string
  failure?: FailureDiagnostic
}

export type LoggerOptions = {
  logToFile: boolean
  logFilePath: string
}

export class EnrichmentLogger {
  private readonly logToFile: boolean
  private readonly logFilePath: string
  private fileReady = false

  constructor(options: LoggerOptions) {
    this.logToFile = options.logToFile
    this.logFilePath = options.logFilePath
  }

  info(message: string, fields: Record<string, unknown> = {}) {
    this.write('info', message, fields)
  }

  warn(message: string, fields: Record<string, unknown> = {}) {
    this.write('warn', message, fields)
  }

  error(message: string, fields: Record<string, unknown> = {}) {
    this.write('error', message, fields)
  }

  failure(
    wine: {
      id: string
      wine_name: string | null
      producer: string | null
    },
    diagnostic: FailureDiagnostic,
    vivinoUrl: string | null = null,
  ) {
    this.warn('enrichment failed', {
      wineId: wine.id,
      wineName: wine.wine_name,
      producer: wine.producer,
      vivinoUrl: vivinoUrl ?? diagnostic.vivinoUrl ?? null,
      failureStage: diagnostic.stage,
      failureCategory: diagnostic.category,
      failureReason: diagnostic.reason,
      blocked: diagnostic.blocked ?? false,
      httpStatus: diagnostic.httpStatus,
      blockIndicators: diagnostic.blockIndicators,
      queriesTried: diagnostic.queriesTried,
      serpAttempts: diagnostic.serpAttempts,
      responseSnippet: diagnostic.responseSnippet,
      errorCode: diagnostic.errorCode,
      detail: diagnostic.detail,
    })

    this.result({
      timestamp: new Date().toISOString(),
      wineId: wine.id,
      wineName: wine.wine_name,
      producer: wine.producer,
      vivinoUrl: vivinoUrl ?? diagnostic.vivinoUrl ?? null,
      confidence: 0,
      status: 'failed',
      message: diagnostic.reason,
      error: diagnostic.detail ?? diagnostic.reason,
      failureStage: diagnostic.stage,
      failureCategory: diagnostic.category,
      failureReason: diagnostic.reason,
      failure: diagnostic,
    })
  }

  result(entry: EnrichmentLogEntry) {
    this.write('result', 'wine enrichment result', entry)
  }

  private write(level: string, message: string, fields: Record<string, unknown>) {
    const payload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...fields,
    }

    const line = JSON.stringify(payload)
    if (level === 'error') {
      console.error(line)
    } else if (level === 'warn') {
      console.warn(line)
    } else {
      console.log(line)
    }

    if (this.logToFile) {
      this.append(line)
    }
  }

  private append(line: string) {
    if (!this.fileReady) {
      mkdirSync(dirname(this.logFilePath), { recursive: true })
      this.fileReady = true
    }
    appendFileSync(this.logFilePath, `${line}\n`, 'utf8')
  }
}
