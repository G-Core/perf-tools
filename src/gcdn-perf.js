(function() {
    const defaultPrefix = ['static.gcore.pro'];
    const defaultBackend = '/collect';
    const defaultDelay = 1000;
    const defaultResolveRandom = true;
    const defaultApiURL = 'https://insights-api.gcorelabs.com';

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

        if (Array.isArray(records)) {
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

    const takeTimingByName = (name) => {
        if (isPerformanceSupportedBrowser()) {
            return Promise.resolve(window.performance.getEntriesByName(name));
        }
        return Promise.resolve([]);
    }

    const takeTimingRecords = (filter) => {
        if (isPerformanceSupportedBrowser()) {
            const resourceRecords = window.performance.getEntriesByType('resource');
            const navigationRecords = window.performance.getEntriesByType('navigation');
            const records = [].concat(navigationRecords, resourceRecords);
            return Promise.resolve(filter ? filterRecords(records, filter) : records);
        }

        return Promise.resolve([]);
    }

    const takeTimingRecordsAsync = (timeout, filter) => {
        return new Promise((resolve) => {
            onDomReady(() => createFuncWithTimeout(() => {
                resolve(takeTimingRecords(filter));
            }, timeout));
        })
    }

    const takeTimingResolveRandom = () => {
        const ts = Date.now();
        const url = `https://${ts}-${makeRandomLetter(5)}.gcdn.co/`;
        const handler = () => takeTimingByName(url);
        return fetch(url).then(handler, handler);
    }

    const collectStatPerf = (prefix, backend, token, delay, resolveRandom) => {
        const httpClient = createHttpClient(`${defaultApiURL}${backend}`);
        const filter = prefix.length > 0 ? createFilterOf(prefix) : null;
        const handler = (records) => {
            const pack = createPerfStatPackage(records, {token});
            if (isFulfilledPerfStatPackage(pack)) {
                httpClient(pack);
            }
        };

        const tasks = [];
        if (delay > 0) {
            tasks.push(takeTimingRecordsAsync(delay, filter));
        } else {
            tasks.push(takeTimingRecords(filter))
        }

        if (resolveRandom) {
            tasks.push(takeTimingResolveRandom());
        }

        return Promise.all(tasks)
            .then((records) => [].concat(...records))
            .then(handler);
    }

    const getAttribute = (node, qualifiedName, defaultValue) => {
        const value = (node.getAttribute(qualifiedName) || '').trim();
        return value === '' ? defaultValue : value;
    };

    const getAttributeNumber = (node, qualifiedName, defaultValue = '') => parseInt(getAttribute(node, qualifiedName), 10) || defaultValue;

    const getAttributeStrings = (node, qualifiedName, format = 'csv') => getAttribute(node, qualifiedName).split(',').map((v) => v.trim());

    const takeScriptArguments = () => {
        if ("function" == typeof document.querySelector) {
            const node = document.querySelector("script[data-gcdn-token]");

            if (node) {
                const token = getAttribute(node, 'data-gcdn-token');
                const prefix = getAttributeStrings(node,'data-gcdn-prefix');
                const backend = getAttribute(node,'data-gcdn-backend', defaultBackend);
                const delay = getAttributeNumber(node,'data-gcdn-delay', defaultDelay);
                const resolveRandom = getAttribute(node,'data-resolve-random', defaultResolveRandom);

                if (token) {
                    return {
                        token,
                        backend,
                        delay,
                        resolveRandom,
                        prefix,
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

    const makeRandomLetter = length => {
        let result = '';
        const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    };

    try {
        if (isPerformanceSupportedBrowser()) {
            const args = takeScriptArguments();
            const {prefix, backend, token, delay, resolveRandom} = args;
            const transformedPrefix = transformPrefix(prefix);
            collectStatPerf(transformedPrefix, backend, token, delay, resolveRandom).then();
        }
    } catch (e) {}
}())

