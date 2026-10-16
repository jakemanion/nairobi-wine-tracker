import { logs } from '@opentelemetry/api-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs'

let configured = false

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || configured) return

  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

  if (!projectToken || !posthogHost) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[PostHog] Server log export skipped — set NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN and NEXT_PUBLIC_POSTHOG_HOST.',
      )
    }
    return
  }

  const exporter = new OTLPLogExporter({
    url: new URL('/i/v1/logs', posthogHost).toString(),
    headers: { Authorization: `Bearer ${projectToken}` },
  })
  const loggerProvider = new LoggerProvider({
    processors: [new SimpleLogRecordProcessor({ exporter })],
  })

  logs.setGlobalLoggerProvider(loggerProvider)
  configured = true
}
