import * as api from '@opentelemetry/api';
import { ContextCarrier } from './context/ContextCarrier';

import { traceIdFakedButValid, SpanIdFakedButValid } from './utility';

export default class RemoteSpanContext implements api.SpanContext {
  traceId: string = traceIdFakedButValid;
  spanId: string = SpanIdFakedButValid;
  isRemote = true;
  traceFlags: number = 0;
  traceState?: api.TraceState | undefined;

  constructor(readonly carrier: ContextCarrier) {}
}
