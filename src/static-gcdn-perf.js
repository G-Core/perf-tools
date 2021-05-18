(function(){
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

    const isFulfilledPerfStatPackage = (data) => {
        return data && Array.isArray(data.resources) && data.resources.length > 0;
    }

    const filterRecords = (records, filter) => {
        return records.filter((r) => filter(r.name) );
    }

    const isPerformanceSupportedBrowser = () => {
        return Boolean(window && window.performance && window.performance.getEntriesByType);
    }

    const takeTimingRecords = (filter) => {
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

    const collectPerfStat = (domains) => {
        try {
            const httpClient = createHttpClient('https://insights-api.gcorelabs.com/collect-wg');
            const filter = createFilterOf(domains);
            const records = takeTimingRecords(filter);
            const pack = createPerfStatPackage(records);
            if (isFulfilledPerfStatPackage(pack)) {
                httpClient(pack);
            }
        } catch(e) {}
    }

    collectPerfStat(['http://bogdi.xyz', 'https://bogdi.xyz', 'http://localhost']);
}())
