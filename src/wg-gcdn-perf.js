import {
    createHttpClient,
    createFilterPaths,
    createPerfStatPackage,
    isFulfilledPerfStatPackage,
    takeTimingRecords,
} from "./perf-lib";

(function() {
    try {
        const httpClient = createHttpClient('https://api.gcdn.co/collect-wg');
        const filter = createFilterPaths(...[
            'https://ru-wotp.wgcdn.co',
            'https://sg-wotp.wgcdn.co',
            'https://eu-wotp.wgcdn.co',
            'https://us-wotp.wgcdn.co',
            'https://na-wotp.wgcdn.co',
        ]);
        const pack = createPerfStatPackage(takeTimingRecords(), {filter});
        if (isFulfilledPerfStatPackage(pack)) {
            httpClient(pack);
        }
    } catch(e) {}
}())
