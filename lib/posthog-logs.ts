import { logs, SeverityNumber } from '@opentelemetry/api-logs'

const posthogLogger = logs.getLogger('nairobi-wine-list.posthog')

export function logPostHogInfo(message: string, attributes: Record<string, string | boolean>) {
  posthogLogger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: message,
    attributes,
  })
}
