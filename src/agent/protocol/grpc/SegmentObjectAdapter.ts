/*!
 *
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import config from '../../../config/AgentConfig';
import { KeyStringValuePair } from '../../../proto/common/Common_pb';
import Segment from '../../../trace/context/Segment';
import Span from '../../../trace/Span';
import { Component } from './Component';
import {
  Log,
  RefType,
  SegmentObject,
  SegmentReference,
  SpanObject,
  SpanType,
  SpanLayer,
} from '../../../proto/language-agent/Tracing_pb';
import * as api from '@opentelemetry/api';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';

/**
 * An adapter that adapts {@link Segment} objects to gRPC object {@link SegmentObject}.
 */
export default class SegmentObjectAdapter extends SegmentObject {
  constructor(segment: Segment) {
    super();
    super
      .setService(config.serviceName)
      .setServiceinstance(config.serviceInstance)
      .setTraceid(segment.relatedTraces[0].toString())
      .setTracesegmentid(segment.segmentId.toString())
      .setSpansList(
        segment.spans.map((span) => {
          const obj = new SpanObject()
            .setSpanid(span.segmentSpanId)
            .setParentspanid(span.segmentParentSpanId)
            .setStarttime(getMilliseconds(span.startTime))
            .setEndtime(getMilliseconds(span.endTime))
            .setOperationname(span.getEndpoint())
            .setSpantype(getSpanType(span))
            .setSpanlayer(getSpanLayer(span))
            .setComponentid(getComponentid(span))
            .setIserror(isError(span))
            .setLogsList(getLogList(span))
            .setTagsList(getTagsList(span))
            .setRefsList(
              span.refs.map((ref) =>
                new SegmentReference()
                  .setReftype(RefType.CROSSPROCESS)
                  .setTraceid(ref.traceId.toString())
                  .setParenttracesegmentid(ref.segmentId.toString())
                  .setParentspanid(ref.spanId)
                  .setParentservice(ref.service)
                  .setParentserviceinstance(ref.serviceInstance)
                  .setNetworkaddressusedatpeer(ref.clientAddress),
              ),
            );

          const spanType = obj.getSpantype();
          if (spanType == SpanType.EXIT || spanType == SpanType.ENTRY) {
            const ip = span.attributes[SemanticAttributes.NET_PEER_IP];
            const port = span.attributes[SemanticAttributes.NET_PEER_PORT];
            if (ip && port) {
              obj.setPeer(ip + ':' + port);
            }
          }
          return obj;
        }),
      );
  }
}

function getMilliseconds(time: api.HrTime): number {
  return time[0] * 1000 + Math.floor(time[1] / 1000000);
}
function getSpanType(span: Span): SpanType {
  switch (span.kind) {
    case api.SpanKind.CLIENT:
    case api.SpanKind.PRODUCER:
      return SpanType.EXIT;
    case api.SpanKind.CONSUMER:
    case api.SpanKind.SERVER:
      return SpanType.ENTRY;
    default:
      return SpanType.LOCAL;
  }
}

function getSpanLayer(span: Span): SpanLayer {
  switch (span.instrumentationLibrary.name) {
    case '@opentelemetry/instrumentation-mysql':
    case '@opentelemetry/instrumentation-mysql2':
    case '@opentelemetry/instrumentation-pg':
    case '@opentelemetry/instrumentation-ioredis':
    case '@opentelemetry/instrumentation-redis':
    case '@opentelemetry/instrumentation-mongodb':
      return SpanLayer.DATABASE;
    case '@opentelemetry/instrumentation-graphql':
    case '@opentelemetry/instrumentation-grpc':
    case '@opentelemetry/instrumentation-dns':
      return SpanLayer.RPCFRAMEWORK;
    case '@opentelemetry/instrumentation-express':
    case '@opentelemetry/instrumentation-koa':
    case '@opentelemetry/instrumentation-http':
      return SpanLayer.HTTP;
    // case '@opentelemetry/node':
    //   return SpanLayer.MQ
    // case '@opentelemetry/node':
    //   return SpanLayer.CACHE
  }
  return SpanLayer.UNKNOWN;
}

function getComponentid(span: Span): number {
  const isServer = span.kind === api.SpanKind.SERVER;
  switch (span.instrumentationLibrary.name) {
    case '@opentelemetry/instrumentation-mysql':
    case '@opentelemetry/instrumentation-mysql2':
      return Component.MYSQL.id;
    case '@opentelemetry/instrumentation-pg':
      return Component.POSTGRESQL.id;
    case '@opentelemetry/instrumentation-ioredis':
    case '@opentelemetry/instrumentation-redis':
      return Component.REDIS.id;

    case '@opentelemetry/instrumentation-mongodb':
      return Component.MONGODB.id;
    case '@opentelemetry/instrumentation-express':
      return Component.EXPRESS.id;
    case '@opentelemetry/instrumentation-koa':
      return Component.HTTP_SERVER.id;
    case '@opentelemetry/instrumentation-http':
      return isServer ? Component.HTTP_SERVER.id : Component.HTTP.id;
    // case '@opentelemetry/instrumentation-graphql':
    //   return 0
    // case '@opentelemetry/instrumentation-grpc':
    //   return 0
    // case '@opentelemetry/instrumentation-dns':
    //   return 0
  }
  return 0; // TODO: implement
}

function isError(span: Span): boolean {
  return span.status.code === api.SpanStatusCode.ERROR;
}

function getLogList(span: Span): Array<Log> {
  return span.events.map((event) => {
    const log = new Log().setTime(getMilliseconds(event.time));
    if (event.attributes) {
      const pairs = attributeToPairs(event.attributes);
      pairs.unshift(new KeyStringValuePair().setKey('event_name').setValue(event.name));
      log.setDataList(pairs);
    }
    return log;
  });
}

function getTagsList(span: Span): Array<KeyStringValuePair> {
  return attributeToPairs(span.attributes);
}
function attributeToPairs(attributes: api.SpanAttributes | undefined): Array<KeyStringValuePair> {
  if (!attributes) {
    return [];
  }
  const pairs = [];
  for (const key in attributes) {
    if (attributes.hasOwnProperty(key)) {
      const value = attributes[key];
      if (value !== undefined && value != null) {
        let str;
        if (Array.isArray(value)) {
          str = value.join(',');
        } else {
          str = value.toString();
        }
        const pair = new KeyStringValuePair().setKey(key).setValue(str);
        pairs.push(pair);
      }
    }
  }
  return pairs;
}
