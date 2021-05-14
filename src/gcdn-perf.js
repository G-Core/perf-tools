import {
    createHttpClient,
    takeTimingRecordsAsync,
    createPerfStatPackage,
    isFulfilledPerfStatPackage,
    createFilterOf
} from './perf-lib';

(function() {
    try {
        const httpClient = createHttpClient('https://insights-api.gcorelabs.com/collect-wg');
        const filter = createFilterOf('http://bogdi.xyz', 'https://bogdi.xyz', 'https://static.gcore.pro');
        takeTimingRecordsAsync((records) => {
            const pack = createPerfStatPackage(records);
            if (isFulfilledPerfStatPackage(pack)) {
                httpClient(pack);
            }
        }, 10, 1000, filter);
    } catch(e) {}
}())
