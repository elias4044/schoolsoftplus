import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';

type GeneratedFunction = (...args: never[]) => unknown;

type CodeBuilder = {
  (format: string, ...args: unknown[]): CodeBuilder;
  (scope?: Record<string, unknown>): GeneratedFunction;
  toString(): string;
};

type ProtoNamespace = {
  nestedArray?: ProtoNamespace[];
  setup?: () => void;
};

// Firestore's REST client still uses protobufjs to translate protobuf messages to
// and from JSON. Compile the installed SDK's schemas on the build host, where
// protobufjs can use new Function, and use those same functions in workerd.
function compileFirestoreSchemas() {
  const require = createRequire(import.meta.url);
  const adminRequire = createRequire(require.resolve('firebase-admin/firestore'));
  const firestoreRequire = createRequire(adminRequire.resolve('@google-cloud/firestore'));
  const gaxRequire = createRequire(firestoreRequire.resolve('google-gax'));
  const protobuf = gaxRequire('protobufjs') as {
    util: { codegen: (...args: string[]) => CodeBuilder };
    Root: { fromJSON: (schema: unknown) => ProtoNamespace };
  };
  const firestoreProtos = join(
    dirname(firestoreRequire.resolve('@google-cloud/firestore/package.json')),
    'build/protos'
  );
  const gaxProtos = join(dirname(gaxRequire.resolve('google-gax/package.json')), 'build/protos');
  const factories = new Map<string, string>();
  const codegen = protobuf.util.codegen;

  protobuf.util.codegen = (...parameters) => {
    const builder = codegen(...parameters);
    function append(format: string, ...args: unknown[]): CodeBuilder;
    function append(scope?: Record<string, unknown>): GeneratedFunction;
    function append(formatOrScope?: string | Record<string, unknown>, ...args: unknown[]) {
      if (typeof formatOrScope === 'string') {
        builder(formatOrScope, ...args);
        return append;
      }
      const source = builder.toString();
      const scopeKeys = Object.keys(formatOrScope ?? {});
      factories.set(source, `({${scopeKeys.join(',')}}) => (${source})`);
      return builder(formatOrScope);
    }
    append.toString = builder.toString;
    return append;
  };

  function compile(namespace: ProtoNamespace) {
    namespace.setup?.();
    for (const child of namespace.nestedArray ?? []) compile(child);
  }

  try {
    for (const file of [
      ...['v1.json', 'v1beta1.json', 'admin_v1.json'].map((file) => join(firestoreProtos, file)),
      ...['iam_service.json', 'locations.json', 'operations.json', 'status.json'].map((file) =>
        join(gaxProtos, file)
      ),
      gaxRequire.resolve('protobufjs/google/protobuf/descriptor.json'),
    ]) {
      compile(protobuf.Root.fromJSON(require(file)));
    }
  } finally {
    protobuf.util.codegen = codegen;
  }

  return [...factories]
    .map(([source, factory]) => `[${JSON.stringify(source)}, ${factory}]`)
    .join(',\n');
}

export function firestoreWorkerCodegen(): Plugin {
  let factories: string | undefined;
  const codegenTransform = {
    name: 'schoolsoftplus:firestore-worker-codegen',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      // The REST client still needs Node streams, but its HTTP requests must use
      // workerd's fetch. The bundled node-fetch adapter fails on POST requests.
      if (/[/\\]google-gax[/\\]build[/\\]src[/\\]fallbackServiceStub\.js$/.test(id)) {
        const fetchSelection =
          /const fetch = \(0, featureDetection_1\.hasWindowFetch\)\(\)\s*\? window\.fetch\s*:\s*node_fetch_1\.default;/;
        if (fetchSelection.test(code)) {
          return code
            .replace('const node_fetch_1 = require("node-fetch");', '')
            .replace(fetchSelection, 'const fetch = globalThis.fetch;')
            .replace(
              'pipeline)(response.body,',
              'pipeline)(stream_1.Readable.fromWeb(response.body),'
            );
        }
      }
      if (/[/\\]gaxios[/\\]build[/\\].*[/\\]gaxios\.js$/.test(id)) {
        return code
          .replace(
            'const fetch = hasFetch() ? window.fetch : node_fetch_1.default;',
            'const fetch = globalThis.fetch;'
          )
          .replace(/\(await import\(['"]node-fetch['"]\)\)\.default/g, 'globalThis.fetch');
      }
      if (/[/\\]protobufjs[/\\]src[/\\]util[/\\]minimal\.js$/.test(id)) {
        // protobufjs normally discovers these with eval("require"). Keep the
        // same integer and buffer behavior on the build host and in Workers.
        return code
          .replace('util.inquire("buffer")', 'require("node:buffer")')
          .replace('util.inquire("long")', 'require("long")');
      }
      if (/[/\\]proto3-json-serializer[/\\]build[/\\]src[/\\]toproto3json\.js$/.test(id)) {
        // Long's marker survives bundling and minification of its constructor.
        return code.replace(
          /\(\(_a = value [^\n]+\) === 'Long'/,
          'value?.__isLong__ === true'
        );
      }
      if (!/[/\\]@protobufjs[/\\]codegen[/\\]index\.js$/.test(id)) return;
      const start = code.indexOf('            source = "return " + source;');
      const end = code.indexOf('\n        }', start);
      if (start < 0 || end < 0)
        throw new Error('The installed protobufjs code generator has changed.');

      factories ??= compileFirestoreSchemas();
      const replacement = `            const factory = firestoreProtoFactories.get(source);
            if (!factory) throw new Error("Missing precompiled Firestore protobuf function: " + functionName);
            return factory(formatStringOrScope || {});`;
      const patched = code.slice(0, start) + replacement + code.slice(end);
      return patched.replace(
        '"use strict";',
        `"use strict";\nconst firestoreProtoFactories = new Map([${factories}]);`
      );
    },
  };

  return {
    ...codegenTransform,
    config() {
      const optimizeDeps = { rolldownOptions: { plugins: [codegenTransform] } };
      return { environments: { rsc: { optimizeDeps }, ssr: { optimizeDeps } } };
    },
  };
}
