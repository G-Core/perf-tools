/**
 * @param {string} apiUrl
 */
export const createHttpClient = (apiUrl) => {
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

/**
 *
 * @param {string} patterns
 * @returns {function(*): boolean}
 */
export const createFilterOf = (...patterns) => {
    return name => patterns.some((pattern) => name.indexOf(pattern) === 0)
}

/**
 *
 * @param {PerformanceResourceTiming[]} records
 * @param {boolean} takeConnection
 * @returns {{resources: *[], conn: *}}
 */
export const createPerfStatPackage = (records, {
    takeConnection = true
} = {}) => {
    const data = {
        resources: []
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

/**
 *
 * @param data
 * @returns {boolean}
 */
export const isFulfilledPerfStatPackage = (data) => {
    return data && Array.isArray(data.resources) && data.resources.length > 0;
}

export const scheduleMacroTask = (callback) => {
    setTimeout(callback, 0);
};

export const onDomReady = (callback) => {
    if (document.readyState !== 'loading'){
        callback();
    } else {
        document.addEventListener('DOMContentLoaded', () => scheduleMacroTask(callback));
    }
};

export const createFuncWithTimeout = (callback, timeout = 1000) => {
    let called = false;
    const fn = () => {
        if (!called) {
            called = true;
            callback();
        }
    };
    setTimeout(fn, timeout);
    return fn;
};

/**
 *
 * @param {function(*)} rawCallback
 * @param {number} bufferCount
 * @param {number} bufferTime
 * @param {function(string): boolean} filter
 * @returns {(function(PerformanceResourceTiming[]): (boolean))|*}
 */
export const createBufferWhen = (rawCallback, bufferCount = 10, bufferTime = 1000, filter) => {
    const buffer = [];
    const callback = createFuncWithTimeout(() => rawCallback(buffer), bufferTime);

    return (rawRecords) => {
        const records = filter ? filterRecords(rawRecords, filter) : rawRecords;
        buffer.push(...records);

        if (buffer.length < bufferCount) {
            return false;
        } else {
            callback();
            return true;
        }
    }
}

/**
 *
 * @returns {boolean}
 */
export const isPerformanceSupportedBrowser = () => {
    return Boolean(window && window.performance && window.performance.getEntriesByType);
}

/**
 * @param {function(string): boolean} filter
 * @returns {PerformanceResourceTiming[]}
 */
export const takeTimingRecords = (filter) => {
    if (isPerformanceSupportedBrowser()) {
        const records = window.performance.getEntriesByType('resource');

        if ("function" == typeof window.performance.clearResourceTimings) {
            window.performance.clearResourceTimings()
        }

        return filter ? filterRecords(records, filter) : records;
    }

    return [];
}

/**
 *
 * @param {PerformanceResourceTiming[]} records
 * @param {function(string): boolean} filter
 * @returns {PerformanceResourceTiming[]}
 */
export const filterRecords = (records, filter) => {
    return records.filter((r) => filter(r.name) );
}

/**
 *
 * @param {function(PerformanceResourceTiming[]): boolean} callback
 * @param {string} type
 * @param {boolean} buffered
 */
export const startRecordsObserver = (callback, type = 'resource', buffered = true) => {
    if (isPerformanceSupportedBrowser() && PerformanceObserver.supportedEntryTypes.includes("resource")) {
        new PerformanceObserver((list, observer) => {
            if (callback(list.getEntries())) {
                observer.disconnect();
            }
        }).observe({type, buffered});
    }
}
