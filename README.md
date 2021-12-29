# SkyWalking NodeJS Agent

<img src="http://skywalking.apache.org/assets/logo.svg" alt="Sky Walking logo" height="90px" align="right" />

**SkyWalking-Agent-Node**: The NodeJS Agent for Apache SkyWalking, an
alternative to [skywalking-nodejs](https://github.com/apache/skywalking-nodejs),
which provides the native tracing abilities for NodeJS backend project. This
project is a fork of
[skywalking-nodejs](https://github.com/apache/skywalking-nodejs) and is based on
[opentelemetry-js](https://github.com/open-telemetry/opentelemetry-js)
instrumentations

**SkyWalking**: an APM(application performance monitor) system, especially
designed for microservices, cloud native and container-based (Docker,
Kubernetes, Mesos) architectures.

## Quick start

### Install Dependencies

```shell
npm install --save skywalking-agent-node
```

### Instantiate Agent

```js
// agent.js

"use strict";
const agent = require("skywalking-agent-node");

agent.start({
  //configurations
});
```

### Run Your Application

```shell
node -r ./agent.js app.js
```

This will use default configurations to start the SkyWalking agent above, if you
want to specify your own configurations, here are two methods.

**1. Pass configuration values to `agent.start` method**

Install Opentelemetry Instrumentations

```
npm install --save @opentelemetry/auto-instrumentations-node
npm install --save @opentelemetry/instrumentation-mysql2
```

**Note:** `auto-instrumentations-node` is a meta package from
[opentelemetry-js-contrib](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/metapackages/auto-instrumentations-node)
that provides a simple way to initialize multiple Node.js instrumentations.

```js
// agent.js

"use strict";
const agent = require("skywalking-agent-node");
const { getNodeAutoInstrumentations } = require(
  "@opentelemetry/auto-instrumentations-node",
);
const { MySQL2Instrumentation } = require(
  "@opentelemetry/instrumentation-mysql2",
);
const instrumentations = getNodeAutoInstrumentations();
instrumentations.push(new MySQL2Instrumentation());

agent.start({
  serviceName: "my-service-name",
  serviceInstance: "my-service-instance-name",
  collectorAddress: "my.collector.address:port",
  instrumentations: instrumentations, // custom instrumentations if you needed
});
```

**2. Use environment variables**

The supported environment variables are as follows:

| Environment Variable                  | Description                                                                                                                                                                                                                                                                                             | Default               |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------- |
| `SW_AGENT_NAME`                       | The name of the service                                                                                                                                                                                                                                                                                 | `your-nodejs-service` |
| `SW_AGENT_INSTANCE`                   | The name of the service instance                                                                                                                                                                                                                                                                        | Randomly generated    |
| `SW_AGENT_COLLECTOR_BACKEND_SERVICES` | The backend OAP server address                                                                                                                                                                                                                                                                          | `127.0.0.1:11800`     |
| `SW_AGENT_SECURE`                     | Whether to use secure connection to backend OAP server                                                                                                                                                                                                                                                  | `false`               |
| `SW_AGENT_AUTHENTICATION`             | The authentication token to verify that the agent is trusted by the backend OAP, as for how to configure the backend, refer to [the yaml](https://github.com/apache/skywalking/blob/4f0f39ffccdc9b41049903cc540b8904f7c9728e/oap-server/server-bootstrap/src/main/resources/application.yml#L155-L158). | not set               |
| `SW_AGENT_LOGGING_LEVEL`              | The logging level, could be one of `error`, `warn`, `info`, `debug`                                                                                                                                                                                                                                     | `info`                |
| `SW_AGENT_DISABLE_PLUGINS`            | Comma-delimited list of plugins to disable in the plugins directory (e.g. "mysql", "express")                                                                                                                                                                                                           | ``                    |
| `SW_COLD_ENDPOINT`                    | Cold start detection is as follows: First span to run within 1 second of skywalking init is considered a cold start. This span gets the tag `coldStart` set to 'true'. This span also optionally gets the text '\<cold\>' appended to the endpoint name if SW_COLD_ENDPOINT is set to 'true'.           | `false`               |
| `SW_AGENT_MAX_BUFFER_SIZE`            | The maximum buffer size before sending the segment data to backend                                                                                                                                                                                                                                      | `'1000'`              |
