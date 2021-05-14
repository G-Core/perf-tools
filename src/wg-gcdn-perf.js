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
            'https://ru-wotp.wgcdn.co',
            'https://sg-wotp.wgcdn.co',
            'https://eu-wotp.wgcdn.co',
            'https://us-wotp.wgcdn.co',
            'https://na-wotp.wgcdn.co',
        ]);
        const records = takeTimingRecords(filter);
        const pack = createPerfStatPackage(records);
        if (isFulfilledPerfStatPackage(pack)) {
            httpClient(pack);
        }
    } catch(e) {}
}())
