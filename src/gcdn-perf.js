(function() {
    const defaultPrefix = ['static.gcore.pro'];

    const isPerformanceSupportedBrowser = () => {
        return Boolean(window && window.performance && window.performance.getEntriesByType);
    }

    const createHttpClient = (apiUrl) => {
        return  (rawData) => {
            const json = JSON.stringify(rawData);

            if (navigator && "function" == typeof navigator.sendBeacon) {
                navigator.sendBeacon(apiUrl, new Blob([json],{
                    type: "application/json"
                }))
            } else {
                const req = new XMLHttpRequest();
                req.open("POST", apiUrl, true);
                req.setRequestHeader("content-type", "application/json");
                req.send(json);
            }
        }
    }

    const createFilterOf = (patterns) => {
        return name => patterns.some((pattern) => name.indexOf(pattern) === 0)
    }

    const createPerfStatPackage = (records, {
        takeConnection = true,
        token = '',
    } = {}) => {
        const data = {
            token,
            resources: [],
        };

        const fixed = v => null == v ? 0 : Math.round(v);

        for (let i = 0; i <= records.length - 1; i++) {
            const e = records[i];
            data.resources.push({
                metrics: {
                    ds: fixed(e.domainLookupStart),
                    de: fixed(e.domainLookupEnd),
                    cs: fixed(e.connectStart),
                    ss: fixed(e.secureConnectionStart),
                    ce: fixed(e.connectEnd),
                    qs: fixed(e.requestStart),
                    ps: fixed(e.responseStart),
                    pe: fixed(e.responseEnd),
                    ts: e.transferSize,
                },
                meta: {
                    n: e.name,
                    i: e.initiatorType,
                    p: e.nextHopProtocol,
                }
            })
        }

        if (takeConnection && window.navigator && window.navigator.connection) {
            const c = window.navigator.connection;
            data.conn = {
                d: fixed(c.downlink * 1000),
                et: c.effectiveType,
                rtt: fixed(c.rtt),
            }
        }

        return data;
    }

    const isFulfilledPerfStatPackage = (data) => {
        return data && Array.isArray(data.resources) && data.resources.length > 0;
    }

    const uniqueRecords = (r, idx, arr) => arr.findIndex((t) => t.name === r.name) === idx;

    const filterRecords = (records, filter) => {
        return records
            .filter((r) => filter(r.name))
            .filter(uniqueRecords);
    }

    const createFuncWithTimeout = (callback, timeout = 1000) => {
        let called = false;
        let timer;
        const fn = () => {
            if (!called) {
                called = true;
                callback();
                clearInterval(timer);
            }
        };

        if (timeout > 0) {
            timer = setTimeout(fn, timeout);
        }
        return fn;
    };

    const scheduleMacroTask = (callback) => {
        setTimeout(callback, 0);
    };

    const onDomReady = (callback) => {
        if (document.readyState !== 'loading'){
            scheduleMacroTask(callback);
        } else {
            document.addEventListener('DOMContentLoaded', () => scheduleMacroTask(callback));
        }
    };

    const takeTimingRecords = (filter) => {
        if (isPerformanceSupportedBrowser()) {
            const resourceRecords = window.performance.getEntriesByType('resource');
            const navigationRecords = window.performance.getEntriesByType('navigation');
            const records = navigationRecords
                .concat(resourceRecords);

            if ("function" == typeof window.performance.clearResourceTimings) {
                window.performance.clearResourceTimings()
            }

            return filter ? filterRecords(records, filter) : records;
        }

        return [];
    }

    const takeTimingRecordsAsync = (callback, timeout, filter) => {
        if (isPerformanceSupportedBrowser()
            && PerformanceObserver.supportedEntryTypes.includes("resource")
            && PerformanceObserver.supportedEntryTypes.includes("navigation")
        ) {
            onDomReady(() => createFuncWithTimeout(() => {
                callback(takeTimingRecords(filter));
            }, timeout));
        }
    }

    const collectStatPerf = (prefix, backend, token) => {
        const httpClient = createHttpClient(`https://insights-api.gcorelabs.com${backend}`);
        const filter = prefix.length > 0 ? createFilterOf(prefix) : null;
        takeTimingRecordsAsync((records) => {
            const pack = createPerfStatPackage(records, {token});
            if (isFulfilledPerfStatPackage(pack)) {
                httpClient(pack);
            }
        }, 1000, filter);
    }

    const takeScriptArguments = () => {
        if ("function" == typeof document.querySelector) {
            const getAttribute = (node, qualifiedName) => (node.getAttribute(qualifiedName) || '').trim();
            const node = document.querySelector("script[data-gcdn-token]");

            if (node) {
                const token = getAttribute(node, 'data-gcdn-token');
                const prefix = getAttribute(node,'data-gcdn-prefix');
                const backend = getAttribute(node,'data-gcdn-backend');

                if (token && prefix && backend) {
                    return {
                        token: token,
                        backend,
                        prefix: prefix.split(',').map((v) => v.trim()),
                    }
                }
            }
        }
        throw new Error('InvalidArgumentException');
    }

    const transformPrefix = (rawPrefix) => {
        return [...defaultPrefix, ...rawPrefix].reduce((acc, item) => {
                if (!item.startsWith('http')) {
                    acc.push(`https://${item}`, `http://${item}`);
                } else {
                    acc.push(item);
                }
                return acc;
            }, []);
    }

    try {
        const args = takeScriptArguments();
        const {prefix, backend, token} = args;
        const transformedPrefix = transformPrefix(prefix);
        collectStatPerf(transformedPrefix, backend, token);
    } catch (e) {}
}())

