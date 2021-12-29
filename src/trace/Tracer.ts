/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as api from '@opentelemetry/api';
import {
  InstrumentationLibrary,
  sanitizeAttributes,
  isTracingSuppressed,
  timeInputToHrTime,
} from '@opentelemetry/core';
import Span from './Span';
import RemoteSpanContext from './RemoteSpanContext';
import { GeneralLimits, SpanLimits, TracerConfig } from './types';
import { mergeConfig } from './utility';
import Segment from './context/Segment';
import SegmentRef from './context/SegmentRef';
import { createLogger } from '../logging';

const logger = createLogger(__filename);

/**
 * This class represents a basic tracer.
 */
export default class Tracer implements api.Tracer {
  private readonly _generalLimits: GeneralLimits;
  private readonly _spanLimits: SpanLimits;
  readonly instrumentationLibrary: InstrumentationLibrary;

  /**
   * Constructs a new Tracer instance.
   */
  constructor(instrumentationLibrary: InstrumentationLibrary, config: TracerConfig) {
    const localConfig = mergeConfig(config);
    this._generalLimits = localConfig.generalLimits;
    this._spanLimits = localConfig.spanLimits;
    this.instrumentationLibrary = instrumentationLibrary;
  }

  /**
   * Starts a new Span or returns the default NoopSpan based on the sampling
   * decision.
   */
  startSpan(name: string, options: api.SpanOptions = {}, context = api.context.active()): api.Span {
    if (logger.isDebugEnabled()) {
      logger.debug(`New span request: ${name}`);
    }
    if (isTracingSuppressed(context)) {
      if (logger.isDebugEnabled()) {
        logger.debug('Instrumentation suppressed, returning Noop Span');
      }
      return api.trace.wrapSpanContext(api.INVALID_SPAN_CONTEXT);
    }

    let traceState;
    let segmentParentSpanId = -1;
    let segment;
    let segmentRef;

    if (options.root) {
      segment = new Segment();
    } else {
      const spanContext = api.trace.getSpanContext(context);
      if (spanContext instanceof RemoteSpanContext) {
        segment = new Segment();
        const carrier = spanContext.carrier;
        if (carrier) {
          segmentRef = SegmentRef.fromCarrier(carrier);
          if (carrier.traceId) {
            segment.relate(carrier.traceId);
          }
        }
      } else {
        const parentSpan = api.trace.getSpan(context);
        if (parentSpan instanceof Span) {
          segment = parentSpan.segment;
          segmentParentSpanId = parentSpan.segmentSpanId;
          traceState = parentSpan.traceState;
        } else {
          segment = new Segment();
        }
      }
    }

    const spanKind = options.kind ?? api.SpanKind.INTERNAL;
    const attributes = sanitizeAttributes(options.attributes);
    const traceFlags = api.TraceFlags.SAMPLED; // 默认都采集

    const span = new Span(
      this,
      name,
      spanKind,
      segment,
      segmentParentSpanId,
      options.startTime ? timeInputToHrTime(options.startTime) : undefined,
      segmentRef,
      traceFlags,
      traceState,
    );
    // Set default attributes
    span.setAttributes(attributes);
    return span;
  }
  startActiveSpan<F extends (span: api.Span) => ReturnType<F>>(name: string, fn: F): ReturnType<F>;
  startActiveSpan<F extends (span: api.Span) => ReturnType<F>>(
    name: string,
    opts: api.SpanOptions,
    fn: F,
  ): ReturnType<F>;
  startActiveSpan<F extends (span: api.Span) => ReturnType<F>>(
    name: string,
    opts: api.SpanOptions,
    ctx: api.Context,
    fn: F,
  ): ReturnType<F>;
  startActiveSpan<F extends (span: api.Span) => ReturnType<F>>(
    name: string,
    arg2?: F | api.SpanOptions,
    arg3?: F | api.Context,
    arg4?: F,
  ): ReturnType<F> | undefined {
    let opts: api.SpanOptions | undefined;
    let ctx: api.Context | undefined;
    let fn: F;

    if (arguments.length < 2) {
      return;
    } else if (arguments.length === 2) {
      fn = arg2 as F;
    } else if (arguments.length === 3) {
      opts = arg2 as api.SpanOptions | undefined;
      fn = arg3 as F;
    } else {
      opts = arg2 as api.SpanOptions | undefined;
      ctx = arg3 as api.Context | undefined;
      fn = arg4 as F;
    }

    const parentContext = ctx ?? api.context.active();
    const span = this.startSpan(name, opts, parentContext);
    const contextWithSpanSet = api.trace.setSpan(parentContext, span);

    return api.context.with(contextWithSpanSet, fn, undefined, span);
  }

  /** Returns the active {@link GeneralLimits}. */
  getGeneralLimits(): GeneralLimits {
    return this._generalLimits;
  }

  /** Returns the active {@link SpanLimits}. */
  getSpanLimits(): SpanLimits {
    return this._spanLimits;
  }
}
