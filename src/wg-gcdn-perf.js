import {
    createHttpClient,
    createFilterOf,
    createPerfStatPackage,
    isFulfilledPerfStatPackage,
    takeTimingRecords,
} from "./perf-lib";

(function() {
    try {
        const httpClient = createHttpClient('https://insights-api.gcorelabs.com/collect-wg');
        const filter = createFilterOf(...[
            'http://bogdi.xyz',
            'https://bogdi.xyz',
        ]);
        const records = takeTimingRecords(filter);
        const pack = createPerfStatPackage(records);
        if (isFulfilledPerfStatPackage(pack)) {
            httpClient(pack);
        }
    } catch(e) {}
}())
