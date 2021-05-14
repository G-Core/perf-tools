/**
 * @param {string} apiUrl
 * @returns {function({resources: *[], conn: *})}
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
 * @returns {function(string): boolean}
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
 * @param {{resources: *[], conn: *}} data
 * @returns {boolean}
 */
export const isFulfilledPerfStatPackage = (data) => {
    return data && Array.isArray(data.resources) && data.resources.length > 0;
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
        const resourceRecords = window.performance.getEntriesByType('resource');
        const navigationRecords = window.performance.getEntriesByType('navigation');
        const records = resourceRecords.concat(navigationRecords);

        if ("function" == typeof window.performance.clearResourceTimings) {
            window.performance.clearResourceTimings()
        }

        return filter ? filterRecords(records, filter) : records;
    }

    return [];
}

/**
 *
 * @param {function()} callback
 * @param {number} timeout
 * @returns {function()}
 */
export const createFuncWithTimeout = (callback, timeout = 1000) => {
    let called = false;
    const fn = () => {
        if (!called) {
            called = true;
            callback();
        }
    };

    if (timeout > 0) {
        setTimeout(fn, timeout);
    }
    return fn;
};

/**
 *
 * @param {function(*)} callback
 */
export const scheduleMacroTask = (callback) => {
    setTimeout(callback, 0);
};

/**
 *
 * @param {function(*)} callback
 */
export const onDomReady = (callback) => {
    if (document.readyState !== 'loading'){
        callback();
    } else {
        document.addEventListener('DOMContentLoaded', () => scheduleMacroTask(callback));
    }
};

/**
 *
 * @param {function(*)} callback
 * @param {number} bufferCount
 * @param {number} bufferAlive
 * @param {function(string): boolean} filter
 * @returns {(function(PerformanceResourceTiming[]): (boolean))|*}
 */
export const createBufferWhen = (callback, bufferCount = 10, bufferAlive = 1000, filter) => {
    const buffer = [];
    const callbackWithTimeout = createFuncWithTimeout(() => callback(buffer), bufferAlive);

    return (rawRecords) => {
        const records = filter ? filterRecords(rawRecords, filter) : rawRecords;
        buffer.push(...records);

        if (buffer.length < bufferCount) {
            return false;
        } else {
            callbackWithTimeout();
            return true;
        }
    }
}

/**
 *
 * @param {function(PerformanceResourceTiming[])} callback
 * @param {number} bufferCount
 * @param {number} bufferAlive
 * @param {function(string): boolean} filter
 */
export const takeTimingRecordsAsync = (callback, bufferCount, bufferAlive, filter) => {
    if (isPerformanceSupportedBrowser()
        && PerformanceObserver.supportedEntryTypes.includes("resource")
        && PerformanceObserver.supportedEntryTypes.includes("navigation")
    ) {
        onDomReady(() => {
            const buffer = createBufferWhen(callback, bufferCount, bufferAlive, filter)
            new PerformanceObserver((list, observer) => {
                const records = list.getEntries();
                if (buffer(records)) {
                    observer.disconnect();
                }
            }).observe({entryTypes: ['resource', 'navigation']});
        });
    }
}
