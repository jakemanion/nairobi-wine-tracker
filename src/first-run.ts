process.env.ENRICH_BATCH_SIZE = '5'
process.env.ENRICH_REQUEST_DELAY_MIN_MS = '1000'
process.env.ENRICH_REQUEST_DELAY_MAX_MS = '1000'
process.env.ENRICH_MAX_BATCHES = '1'
process.env.ENRICH_ONLY_FULLY_MISSING = 'true'

import('./index')
