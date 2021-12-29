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

import * as winston from 'winston';
import * as api from '@opentelemetry/api';
import { Logger } from 'winston';
import path from 'path';

const { splat, combine, printf } = winston.format;

type LoggerLevelAware = Logger;

const myFormat = printf(({ timestamp, level, message, metadata }) => {
  return `${timestamp} [APM] [${level}] ${message} ${metadata ? JSON.stringify(metadata) : ''}`;
});

export function createLogger(name: string): LoggerLevelAware {
  const loggingLevel = (process.env.SW_AGENT_LOGGING_LEVEL || 'error').toLowerCase();

  const logger = winston.createLogger({
    level: loggingLevel,
    defaultMeta: {
      file: path.basename(name),
    },
  });

  if (process.env.NODE_ENV !== 'production' || process.env.SW_LOGGING_TARGET === 'console') {
    logger.add(
      new winston.transports.Console({
        format: combine(winston.format.metadata(), winston.format.timestamp(), splat(), myFormat),
      }),
    );
  } else {
    logger.add(
      new winston.transports.File({
        filename: 'skywalking.log',
      }),
    );
  }

  return logger as LoggerLevelAware;
}

const getLogLevel = () => {
  return (process.env.SW_AGENT_LOGGING_LEVEL || 'error').toLowerCase();
};

const getOTLPLevel = () => {
  const level = getLogLevel();
  switch (level) {
    case 'verbose':
    case 'verb':
      return api.DiagLogLevel.VERBOSE;
    case 'debug':
      return api.DiagLogLevel.DEBUG;
    case 'info':
      return api.DiagLogLevel.INFO;
    case 'warn':
      return api.DiagLogLevel.WARN;
    case 'error':
      return api.DiagLogLevel.ERROR;
    default:
      return api.DiagLogLevel.NONE;
  }
};

const createOTLPLogger = () => {
  const log = createLogger('otlp');
  const concatArgs = (...args: any[]) => {
    return args.join('-');
  };
  return {
    verbose: (...args: any[]) => {
      log.verbose(concatArgs(...args));
    },
    debug: (...args: any[]) => {
      log.debug(concatArgs(...args));
    },
    info: (...args: any[]) => {
      log.info(concatArgs(...args));
    },
    warn: (...args: any[]) => {
      log.warn(concatArgs(...args));
    },
    error: (...args: any[]) => {
      log.error(concatArgs(...args));
    },
  };
};
api.diag.setLogger(createOTLPLogger(), getOTLPLevel());
