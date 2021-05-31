(function(){
    const createHttpClient = (apiUrl) => {
        return (rawData) => {
            const json = JSON.stringify(rawData);
            const req = new XMLHttpRequest();
            req.open("POST", apiUrl, true);
            req.setRequestHeader("content-type", "application/json");
            req.send(json);
        }
    }

    const createFilterOf = (patterns) => name => patterns.some((pattern) => name.indexOf(pattern) === 0)

    const createPerfStatPackage = (records, {takeConnection = true, token = ''} = {}) => {
        const data = {
            token,
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

    const isFulfilledPerfStatPackage = (data) => data && Array.isArray(data.resources) && data.resources.length > 0

    const filterRecords = (records, filter) => records.filter((r) => filter(r.name))

    const isPerformanceSupportedBrowser = () => Boolean(window && window.performance && window.performance.getEntriesByType)

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

    const transformPrefix = (rawPrefix) =>
        rawPrefix.reduce((acc, item) => {
            if (!item.startsWith('http')) {
                acc.push(`https://${item}`, `http://${item}`);
            } else {
                acc.push(item);
            }
            return acc;
        }, [])

    const collectPerfStat = (prefix, token) => {
        try {
            const httpClient = createHttpClient('https://insights-api.gcorelabs.com/collect');
            const transformedPrefix = transformPrefix(prefix);
            const filter = createFilterOf(transformedPrefix);
            const records = takeTimingRecords(filter);
            const pack = createPerfStatPackage(records, {token, takeConnection: true});
            if (isFulfilledPerfStatPackage(pack)) {
                httpClient(pack);
            }
        } catch(e) {}
    }

    collectPerfStat(['bogdi.xyz', 'http://localhost'], 'cc00d656-2754-4dc6-9d4b-8ef5c56a40be');
}())
