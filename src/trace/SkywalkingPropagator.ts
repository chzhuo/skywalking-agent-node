import { TextMapGetter, TextMapPropagator, TextMapSetter, Context, trace } from '@opentelemetry/api';
import { isTracingSuppressed } from '@opentelemetry/core';
import { ContextCarrier } from './context/ContextCarrier';
import Span from './Span';
import RemoteSpanContext from './RemoteSpanContext';
import { createLogger } from '../logging';
// import { SemanticAttributes } from '@opentelemetry/semantic-conventions';
// import {attribeValueToString} from './utility'

const logger = createLogger(__filename);

export default class SkywalkingPropagator implements TextMapPropagator {
  private readonly traceHeader = 'sw8';

  constructor(readonly serviceName: string, readonly instanceName: string) {}
  // 从 context 里获取信息，然后注入到carrier里，可以从trace.getSpan里获取即将要使用的span
  // 当然需要修改当前对应的 sw span 为 exitspan
  inject(context: Context, carrier: unknown, setter: TextMapSetter): void {
    if (isTracingSuppressed(context)) {
      return;
    }
    const span = trace.getSpan(context);
    if (span instanceof Span) {
      const segment = span.segment;
      const swCarrier = new ContextCarrier(
        segment.relatedTraces[0],
        segment.segmentId,
        span.segmentSpanId,
        this.serviceName,
        this.instanceName,
        span.getEndpoint(),
        // TODO: can't get peer info from attributes attribeValueToString(span.attributes[SemanticAttributes.NET_PEER_NAME]),
      );
      setter.set(carrier, this.traceHeader, swCarrier.value);
      if (logger.isDebugEnabled()) {
        logger.debug(`Inject Carrier: ${swCarrier.toString()} ${JSON.stringify(span.attributes)}`);
      }
    }
  }
  // 从 carrier 里获取信息，然后注入到 context 里, 这时候不能获取span里
  extract(context: Context, carrier: unknown, getter: TextMapGetter): Context {
    const value = getter.get(carrier, this.traceHeader);
    if (!value) {
      return context;
    }
    const swCarrier = ContextCarrier.from({
      [this.traceHeader]: Array.isArray(value) ? value[0] : value,
    });
    let newContext = context;
    if (swCarrier && swCarrier.isValid()) {
      const spanContext = new RemoteSpanContext(swCarrier);
      newContext = trace.setSpanContext(newContext, spanContext);
      if (logger.isDebugEnabled()) {
        logger.debug(`Extract Carrier: ${swCarrier.toString()}`);
      }
    }
    return newContext;
  }

  fields(): string[] {
    return [this.traceHeader];
  }
}
