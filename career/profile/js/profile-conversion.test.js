// Tests for profile conversion and validation logic.
// Run with: node profile/js/profile-conversion.test.js

const currentYear = new Date().getFullYear();

// --- Conversion functions (mirrors profile.js logic) ---

function convertLegacyToV2(data) {
    if (data.version !== 2 && data.seeking) {
        if (data.seeking === 'N/A') data.seeking = 'None';
        if (data.job_status === true) data.job_status = 'YES';
        else if (data.job_status === false) data.job_status = 'NO';
        if (data.job_status === 'N/A') data.job_status = 'None';
        const recruitingYear = '2026';
        if (data.seeking && data.seeking !== 'None') {
            const raw = data.company != null ? String(data.company).trim() : '';
            const company = (raw && raw.toLowerCase() !== 'n/a' && raw.toLowerCase() !== 'none' && raw.toLowerCase() !== 'na') ? raw : 'None';
            const jobStatus = company !== 'None' ? 'YES' : 'NO';
            data.job_search = {};
            data.job_search[recruitingYear] = {
                seeking: data.seeking,
                job_status: jobStatus,
                company: company
            };
        }
        delete data.seeking;
        delete data.job_status;
        delete data.company;
    }
    return data;
}

function convertV2Unified(data) {
    // Rename full_time_company → company before internship merge so the merge can overwrite it
    for (const entry of Object.values(data.job_search || {})) {
        if ('full_time_company' in entry) {
            entry.company = entry.full_time_company;
            delete entry.full_time_company;
        }
    }
    if (data.internships) {
        if (!data.job_search) data.job_search = {};
        for (const [year, company] of Object.entries(data.internships)) {
            if (data.job_search[year] && data.job_search[year].seeking === 'IN') {
                data.job_search[year].company = company;
            } else if (!data.job_search[year]) {
                data.job_search[year] = { seeking: 'IN', company: company };
            }
        }
        delete data.internships;
    }
    return data;
}

function normalizeCompany(val) {
    const v = (val || '').trim();
    if (!v || v.toLowerCase() === 'none' || v.toLowerCase() === 'n/a' || v.toLowerCase() === 'na') return 'None';
    return v;
}

function isRealCompany(val) {
    return !!(val && val !== 'None');
}

// --- Test harness ---

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, name) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) {
        passed++;
        console.log(`  PASS: ${name}`);
    } else {
        failed++;
        console.log(`  FAIL: ${name}`);
        console.log(`    expected: ${e}`);
        console.log(`    actual:   ${a}`);
    }
}

// =====================================================================
// V1 → unified conversion
// =====================================================================

console.log('Case 1: FT seeking, job found, with company');
{
    const data = { graduation_year: 2026, seeking: 'FT', job_status: 'YES', company: 'Citi' };
    convertLegacyToV2(data);
    assertEqual(data.job_search['2026'].seeking, 'FT', 'seeking');
    assertEqual(data.job_search['2026'].job_status, 'YES', 'job_status');
    assertEqual(data.job_search['2026'].company, 'Citi', 'company');
    assertEqual(data.seeking, undefined, 'legacy seeking removed');
    assertEqual(data.company, undefined, 'legacy company removed');
}

console.log('Case 1b: boolean true job_status (YAML 1.1)');
{
    const data = { graduation_year: 2026, seeking: 'FT', job_status: true, company: 'Citi' };
    convertLegacyToV2(data);
    assertEqual(data.job_search['2026'].company, 'Citi', 'company preserved');
    assertEqual(data.job_search['2026'].job_status, 'YES', 'status from company');
}

console.log('Case 1c: FT + missing job_status + company');
{
    const data = { graduation_year: 2026, seeking: 'FT', company: 'Citi' };
    convertLegacyToV2(data);
    assertEqual(data.job_search['2026'].company, 'Citi', 'company mapped');
    assertEqual(data.job_search['2026'].job_status, 'YES', 'status inferred from company');
}

console.log('Case 2: FT seeking, no job yet');
{
    const data = { graduation_year: 2026, seeking: 'FT', job_status: 'NO' };
    convertLegacyToV2(data);
    assertEqual(data.job_search['2026'].job_status, 'NO', 'job_status');
    assertEqual(data.job_search['2026'].company, 'None', 'no company');
}

console.log('Case 3: Internship seeking');
{
    const data = { graduation_year: 2026, seeking: 'IN', job_status: 'YES' };
    convertLegacyToV2(data);
    assertEqual(data.job_search['2026'].seeking, 'IN', 'seeking');
    assertEqual(data.job_search['2026'].company, 'None', 'no company for internship (V1 has none)');
}

console.log('Case 3b: IN seeking with real company');
{
    const data = { graduation_year: 2026, seeking: 'IN', job_status: 'YES', company: 'MSK' };
    convertLegacyToV2(data);
    assertEqual(data.job_search['2026'].seeking, 'IN', 'seeking preserved');
    assertEqual(data.job_search['2026'].company, 'MSK', 'real company preserved for IN');
    assertEqual(data.job_search['2026'].job_status, 'YES', 'job_status YES from real company');
}

console.log('V1 with internships (convertLegacyToV2 + convertV2Unified combined)');
{
    const data = {
        seeking: 'IN', job_status: 'YES', company: 'MSK',
        internships: { '2024': 'Reflective Distance Analytics', '2025': 'Sense Education' }
    };
    convertLegacyToV2(data);
    convertV2Unified(data);
    assertEqual(data.job_search['2026'] !== undefined, true, '2026 entry from top-level seeking');
    assertEqual(data.job_search['2026'].company, 'MSK', '2026: company from V1 top-level');
    assertEqual(data.job_search['2026'].job_status, 'YES', '2026: job_status YES from real company');
    assertEqual(data.job_search['2024'] !== undefined, true, '2024 entry from internships');
    assertEqual(data.job_search['2024'].seeking, 'IN', '2024: seeking IN');
    assertEqual(data.job_search['2024'].company, 'Reflective Distance Analytics', '2024: company preserved');
    assertEqual(data.job_search['2025'] !== undefined, true, '2025 entry from internships');
    assertEqual(data.job_search['2025'].company, 'Sense Education', '2025: company preserved');
    assertEqual(data.internships, undefined, 'internships removed');
}

console.log('Migration year is always 2026, not graduation_year');
{
    // 2027 graduate: V1 FT data goes under 2026, not 2027
    const data = { graduation_year: 2027, seeking: 'FT', company: 'Google' };
    convertLegacyToV2(data);
    assertEqual(data.job_search['2027'], undefined, 'no 2027 entry for 2027 graduate');
    assertEqual(data.job_search['2026'] !== undefined, true, 'V1 data keyed under 2026');
    assertEqual(data.job_search['2026'].company, 'Google', 'company under 2026');
}
{
    // 2028 graduate: V1 IN data goes under 2026, not 2028
    const data = { graduation_year: 2028, seeking: 'IN', job_status: 'NO', company: 'N/A' };
    convertLegacyToV2(data);
    assertEqual(data.job_search['2028'], undefined, 'no 2028 entry for 2028 graduate');
    assertEqual(data.job_search['2026'] !== undefined, true, 'V1 IN data keyed under 2026');
    assertEqual(data.job_search['2026'].seeking, 'IN', 'seeking preserved under 2026');
    assertEqual(data.job_search['2026'].company, 'None', 'N/A company normalizes to None');
}

console.log('N/A seeking → no job_search');
{
    const data = { graduation_year: 2026, seeking: 'N/A', job_status: 'N/A' };
    convertLegacyToV2(data);
    assertEqual(data.job_search, undefined, 'no job_search');
}

// =====================================================================
// V2 → unified conversion (separate internships merged)
// =====================================================================

console.log('\nV2 with separate internships → unified');
{
    const data = {
        version: 2,
        job_search: {
            '2026': { seeking: 'FT', job_status: 'YES', full_time_company: 'Meta' }
        },
        internships: {
            '2024': 'Google',
            '2025': 'Microsoft'
        }
    };
    convertV2Unified(data);
    assertEqual(data.internships, undefined, 'internships section removed');
    assertEqual(data.job_search['2026'].company, 'Meta', 'FT company renamed');
    assertEqual(data.job_search['2026'].full_time_company, undefined, 'full_time_company removed');
    assertEqual(data.job_search['2024'].seeking, 'IN', 'internship 2024 created as IN');
    assertEqual(data.job_search['2024'].company, 'Google', 'internship 2024 company preserved');
    assertEqual(data.job_search['2025'].seeking, 'IN', 'internship 2025 created as IN');
    assertEqual(data.job_search['2025'].company, 'Microsoft', 'internship 2025 company preserved');
}

console.log('V2 internship year matches existing IN job_search entry');
{
    const data = {
        version: 2,
        job_search: {
            '2025': { seeking: 'IN', job_status: 'NO', full_time_company: 'None' }
        },
        internships: {
            '2025': 'Amazon'
        }
    };
    convertV2Unified(data);
    assertEqual(data.job_search['2025'].company, 'Amazon', 'company filled from internships');
    assertEqual(data.job_search['2025'].seeking, 'IN', 'seeking unchanged');
    assertEqual(data.internships, undefined, 'internships removed');
}

console.log('V2 profile with no internships passes through');
{
    const data = {
        version: 2,
        job_search: { '2026': { seeking: 'FT', job_status: 'YES', full_time_company: 'Meta' } }
    };
    convertV2Unified(data);
    assertEqual(data.job_search['2026'].company, 'Meta', 'company renamed from full_time_company');
    assertEqual(data.job_search['2026'].full_time_company, undefined, 'full_time_company removed');
}

console.log('Already-unified V2 profile passes through');
{
    const data = {
        version: 2,
        job_search: { '2026': { seeking: 'FT', job_status: 'YES', company: 'Meta' } }
    };
    convertV2Unified(data);
    assertEqual(data.job_search['2026'].company, 'Meta', 'company preserved');
}

// =====================================================================
// Company normalization
// =====================================================================

console.log('\nCompany normalization');
{
    assertEqual(normalizeCompany(''), 'None', 'blank → None');
    assertEqual(normalizeCompany('  '), 'None', 'whitespace → None');
    assertEqual(normalizeCompany('None'), 'None', 'None → None');
    assertEqual(normalizeCompany('NA'), 'None', 'NA → None');
    assertEqual(normalizeCompany('N/A'), 'None', 'N/A → None');
    assertEqual(normalizeCompany('n/a'), 'None', 'n/a → None');
    assertEqual(normalizeCompany('na'), 'None', 'na → None');
    assertEqual(normalizeCompany('Google'), 'Google', 'real company preserved');
    assertEqual(normalizeCompany('  citi  '), 'citi', 'real company trimmed');
}

console.log('Derived job_status from company');
{
    assertEqual(isRealCompany('Google'), true, 'real company → YES');
    assertEqual(isRealCompany('None'), false, 'None → NO');
    assertEqual(isRealCompany(''), false, 'blank → NO');
    assertEqual(isRealCompany(null), false, 'null → NO');
    assertEqual(isRealCompany(undefined), false, 'undefined → NO');
}

// =====================================================================
// FT eligibility
// =====================================================================

console.log('\nFT eligibility');
{
    const gradYear = '2026';
    assertEqual('2026' === gradYear, true, 'FT allowed for grad year');
    assertEqual('2025' === gradYear, false, 'FT not allowed for earlier year');
    assertEqual('2027' === gradYear, false, 'FT not allowed for later year');
}

// =====================================================================
// Duplicate year detection
// =====================================================================

console.log('\nDuplicate year detection');
{
    const years = ['2025', '2026', '2025'];
    const seen = [];
    const dupes = [];
    for (const y of years) {
        if (seen.includes(y)) dupes.push(y);
        else seen.push(y);
    }
    assertEqual(dupes.length, 1, 'one duplicate found');
    assertEqual(dupes[0], '2025', 'duplicate year is 2025');
}

// =====================================================================
// Tracker normalizeCompanyValue (mirrors tracker/js/app-htmx.js)
// =====================================================================

function normalizeCompanyValue(val) {
    const v = (val == null ? '' : String(val)).trim();
    if (!v || v.toLowerCase() === 'none' || v.toLowerCase() === 'n/a' || v.toLowerCase() === 'na') return 'None';
    return v;
}

console.log('\nTracker: normalizeCompanyValue');
{
    assertEqual(normalizeCompanyValue(''), 'None', 'blank → None');
    assertEqual(normalizeCompanyValue(null), 'None', 'null → None');
    assertEqual(normalizeCompanyValue(undefined), 'None', 'undefined → None');
    assertEqual(normalizeCompanyValue('None'), 'None', 'None → None');
    assertEqual(normalizeCompanyValue('NA'), 'None', 'NA → None');
    assertEqual(normalizeCompanyValue('N/A'), 'None', 'N/A → None');
    assertEqual(normalizeCompanyValue('n/a'), 'None', 'n/a → None');
    assertEqual(normalizeCompanyValue('na'), 'None', 'na → None');
    assertEqual(normalizeCompanyValue('  '), 'None', 'whitespace → None');
    assertEqual(normalizeCompanyValue('Google'), 'Google', 'real company preserved');
    assertEqual(normalizeCompanyValue('  Citi  '), 'Citi', 'trimmed');
}

// =====================================================================
// Tracker: V2 job_status derived from seeking + company
// =====================================================================

function deriveJobStatus(seeking, rawCompany) {
    const company = normalizeCompanyValue(rawCompany);
    if ((seeking === 'IN' || seeking === 'FT') && company !== 'None') return 'YES';
    return 'NO';
}

console.log('\nTracker: V2 job_status derivation');
{
    assertEqual(deriveJobStatus('FT', 'Google'), 'YES', 'FT + real company → YES');
    assertEqual(deriveJobStatus('FT', ''), 'NO', 'FT + blank → NO');
    assertEqual(deriveJobStatus('FT', 'None'), 'NO', 'FT + None → NO');
    assertEqual(deriveJobStatus('FT', 'N/A'), 'NO', 'FT + N/A → NO');
    assertEqual(deriveJobStatus('FT', 'NA'), 'NO', 'FT + NA → NO');
    assertEqual(deriveJobStatus('FT', 'n/a'), 'NO', 'FT + n/a → NO');
    assertEqual(deriveJobStatus('IN', 'Amazon'), 'YES', 'IN + real company → YES');
    assertEqual(deriveJobStatus('IN', ''), 'NO', 'IN + blank → NO');
    assertEqual(deriveJobStatus('None', 'Google'), 'NO', 'None seeking → NO');
    assertEqual(deriveJobStatus('', 'Google'), 'NO', 'empty seeking → NO');
}

// =====================================================================
// Tracker: FT rejected unless recruiting year === graduation year
// =====================================================================

function enforceFTEligibility(seeking, recruitingYear, gradYear) {
    if (seeking === 'FT' && String(recruitingYear) !== String(gradYear)) return 'None';
    return seeking;
}

console.log('\nTracker: FT eligibility enforcement');
{
    assertEqual(enforceFTEligibility('FT', '2026', '2026'), 'FT', 'FT allowed for grad year');
    assertEqual(enforceFTEligibility('FT', '2025', '2026'), 'None', 'FT rejected for non-grad year');
    assertEqual(enforceFTEligibility('IN', '2025', '2026'), 'IN', 'IN allowed for any year');
}

// =====================================================================
// Tracker: V1 legacy conversion with derived job_status
// =====================================================================

function convertLegacyForTracker(profile) {
    const recruitingYear = 2026;
    let seeking = profile.seeking || '';
    if (seeking === 'N/A') seeking = 'None';

    const result = { seeking: 'None', company: 'None', job_status: 'NO', recruiting_year: recruitingYear };
    if (seeking && seeking !== 'None') {
        let rawCompany = '';
        if (seeking === 'FT') {
            rawCompany = profile.company != null ? String(profile.company).trim() : '';
        }
        const company = normalizeCompanyValue(rawCompany);
        result.seeking = seeking;
        result.company = company;
        result.job_status = company !== 'None' ? 'YES' : 'NO';
    }
    return result;
}

console.log('\nTracker: V1 legacy → V2 conversion');
{
    // FT with company
    const r1 = convertLegacyForTracker({ seeking: 'FT', job_status: 'YES', company: 'Citi' });
    assertEqual(r1.seeking, 'FT', 'FT seeking preserved');
    assertEqual(r1.company, 'Citi', 'company preserved');
    assertEqual(r1.job_status, 'YES', 'job_status derived from company');
    assertEqual(r1.recruiting_year, 2026, 'hardcoded 2026');

    // FT with boolean true + company
    const r2 = convertLegacyForTracker({ seeking: 'FT', job_status: true, company: 'Google' });
    assertEqual(r2.job_status, 'YES', 'boolean true + company → YES');
    assertEqual(r2.company, 'Google', 'company preserved');

    // FT without company
    const r3 = convertLegacyForTracker({ seeking: 'FT', job_status: 'NO' });
    assertEqual(r3.job_status, 'NO', 'no company → NO');
    assertEqual(r3.company, 'None', 'no company → None');

    // FT with N/A company
    const r4 = convertLegacyForTracker({ seeking: 'FT', company: 'N/A' });
    assertEqual(r4.company, 'None', 'N/A company → None');
    assertEqual(r4.job_status, 'NO', 'N/A company → NO');

    // FT with NA company
    const r5 = convertLegacyForTracker({ seeking: 'FT', company: 'NA' });
    assertEqual(r5.company, 'None', 'NA company → None');

    // IN seeking (no company in V1)
    const r6 = convertLegacyForTracker({ seeking: 'IN', job_status: 'YES' });
    assertEqual(r6.seeking, 'IN', 'IN preserved');
    assertEqual(r6.company, 'None', 'no company for V1 internship');
    assertEqual(r6.job_status, 'NO', 'IN without company → NO');

    // N/A seeking → not searching
    const r7 = convertLegacyForTracker({ seeking: 'N/A', job_status: 'N/A' });
    assertEqual(r7.seeking, 'None', 'N/A → None');
}

// =====================================================================
// V2 seeking empty/None/Not Looking → not searching
// =====================================================================

console.log('\nTracker: V2 seeking normalization');
{
    function normalizeSeeking(seeking) {
        if (!seeking || seeking === 'None' || seeking === 'Not Looking') return 'None';
        return seeking;
    }
    assertEqual(normalizeSeeking(''), 'None', 'empty → None');
    assertEqual(normalizeSeeking(null), 'None', 'null → None');
    assertEqual(normalizeSeeking(undefined), 'None', 'undefined → None');
    assertEqual(normalizeSeeking('None'), 'None', 'None → None');
    assertEqual(normalizeSeeking('Not Looking'), 'None', 'Not Looking → None');
    assertEqual(normalizeSeeking('FT'), 'FT', 'FT preserved');
    assertEqual(normalizeSeeking('IN'), 'IN', 'IN preserved');
}

// =====================================================================
// Tracker: convertProfileV1ToV2 (mirrors app-htmx.js logic)
// =====================================================================

function convertProfileV1ToV2(data) {
    const profile = data && data.student_profile;
    if (!profile || profile.version === 2 || (!profile.seeking && !profile.internships)) return false;

    if (profile.seeking === 'N/A') profile.seeking = 'None';
    if (profile.job_status === true) profile.job_status = 'YES';
    else if (profile.job_status === false) profile.job_status = 'NO';
    if (profile.job_status === 'N/A') profile.job_status = 'None';

    // Convert legacy internships entries to job_search by year
    if (profile.internships) {
        if (!profile.job_search) profile.job_search = {};
        for (const [year, company] of Object.entries(profile.internships)) {
            const normalizedCompany = normalizeCompanyValue(company);
            profile.job_search[year] = {
                seeking: 'IN',
                job_status: normalizedCompany !== 'None' ? 'YES' : 'NO',
                company: normalizedCompany
            };
        }
        delete profile.internships;
    }

    // Convert legacy top-level seeking/company to recruiting year 2026
    if (profile.seeking && profile.seeking !== 'None') {
        if (!profile.job_search) profile.job_search = {};
        const company = normalizeCompanyValue(profile.company);
        const jobStatus = company !== 'None' ? 'YES' : 'NO';
        profile.job_search['2026'] = { seeking: profile.seeking, job_status: jobStatus, company };
    }

    delete profile.seeking;
    delete profile.job_status;
    delete profile.company;
    profile.version = 2;
    return true;
}

console.log('\nTracker: convertProfileV1ToV2');
{
    // V1 FT profile → V2 with job_search
    const d1 = { student_profile: { graduation_year: 2026, seeking: 'FT', company: 'Citi', job_status: 'YES' } };
    const r1 = convertProfileV1ToV2(d1);
    assertEqual(r1, true, 'V1 FT: returns true');
    assertEqual(d1.student_profile.version, 2, 'V1 FT: version set to 2');
    assertEqual(d1.student_profile.job_search['2026'].seeking, 'FT', 'V1 FT: seeking in job_search');
    assertEqual(d1.student_profile.job_search['2026'].company, 'Citi', 'V1 FT: company in job_search');
    assertEqual(d1.student_profile.job_search['2026'].job_status, 'YES', 'V1 FT: job_status derived from company');
    assertEqual(d1.student_profile.seeking, undefined, 'V1 FT: legacy seeking removed');
    assertEqual(d1.student_profile.company, undefined, 'V1 FT: legacy company removed');

    // V1 IN profile → V2 (no company for internship in V1)
    const d2 = { student_profile: { graduation_year: 2026, seeking: 'IN', job_status: 'YES' } };
    const r2 = convertProfileV1ToV2(d2);
    assertEqual(r2, true, 'V1 IN: returns true');
    assertEqual(d2.student_profile.job_search['2026'].seeking, 'IN', 'V1 IN: seeking in job_search');
    assertEqual(d2.student_profile.job_search['2026'].company, 'None', 'V1 IN: no company → None');
    assertEqual(d2.student_profile.job_search['2026'].job_status, 'NO', 'V1 IN: no company → NO');

    // V1 boolean job_status (YAML 1.1)
    const d3 = { student_profile: { graduation_year: 2026, seeking: 'FT', job_status: true, company: 'Google' } };
    convertProfileV1ToV2(d3);
    assertEqual(d3.student_profile.job_search['2026'].job_status, 'YES', 'V1 bool true: job_status YES');
    assertEqual(d3.student_profile.job_search['2026'].company, 'Google', 'V1 bool true: company preserved');

    // V1 N/A seeking → no job_search created
    const d4 = { student_profile: { graduation_year: 2026, seeking: 'N/A', job_status: 'N/A' } };
    const r4 = convertProfileV1ToV2(d4);
    assertEqual(r4, true, 'V1 N/A: returns true (was V1)');
    assertEqual(d4.student_profile.job_search, undefined, 'V1 N/A: no job_search created');
    assertEqual(d4.student_profile.version, 2, 'V1 N/A: version still set to 2');

    // V2 profile → not touched, returns false
    const d5 = { student_profile: { version: 2, graduation_year: 2026, job_search: { '2026': { seeking: 'FT', company: 'Meta' } } } };
    const r5 = convertProfileV1ToV2(d5);
    assertEqual(r5, false, 'V2: returns false');
    assertEqual(d5.student_profile.job_search['2026'].company, 'Meta', 'V2: data unchanged');

    // Profile with no seeking field → not touched, returns false
    const d6 = { student_profile: { graduation_year: 2026 } };
    const r6 = convertProfileV1ToV2(d6);
    assertEqual(r6, false, 'No seeking: returns false');
    assertEqual(d6.student_profile.version, undefined, 'No seeking: no version added');

    // 2027 graduate V1 → job_search keyed under 2026, not 2027
    const d7 = { student_profile: { graduation_year: 2027, seeking: 'FT', company: 'Citi', job_status: 'YES' } };
    convertProfileV1ToV2(d7);
    assertEqual(d7.student_profile.job_search['2027'], undefined, '2027 grad: no 2027 entry created');
    assertEqual(d7.student_profile.job_search['2026'] !== undefined, true, '2027 grad: entry created under 2026');
    assertEqual(d7.student_profile.job_search['2026'].company, 'Citi', '2027 grad: company under 2026');
    assertEqual(d7.student_profile.version, 2, '2027 grad: version set to 2');

    // 2028 graduate V1 → job_search keyed under 2026, not 2028
    const d8 = { student_profile: { graduation_year: 2028, seeking: 'IN', job_status: 'NO', company: 'N/A' } };
    convertProfileV1ToV2(d8);
    assertEqual(d8.student_profile.job_search['2028'], undefined, '2028 grad: no 2028 entry created');
    assertEqual(d8.student_profile.job_search['2026'] !== undefined, true, '2028 grad: entry created under 2026');
    assertEqual(d8.student_profile.job_search['2026'].seeking, 'IN', '2028 grad: seeking preserved');
    assertEqual(d8.student_profile.job_search['2026'].company, 'None', '2028 grad: N/A company → None');
    assertEqual(d8.student_profile.version, 2, '2028 grad: version set to 2');

    // V1 IN profile with real company (no internships)
    const d_in = { student_profile: { graduation_year: 2026, seeking: 'IN', job_status: 'YES', company: 'MSK' } };
    convertProfileV1ToV2(d_in);
    assertEqual(d_in.student_profile.job_search['2026'].seeking, 'IN', 'V1 IN real company: seeking');
    assertEqual(d_in.student_profile.job_search['2026'].company, 'MSK', 'V1 IN real company: company preserved');
    assertEqual(d_in.student_profile.job_search['2026'].job_status, 'YES', 'V1 IN real company: job_status YES');

    // V1 profile with internships + top-level IN seeking
    const d9 = {
        student_profile: {
            graduation_year: 2028,
            seeking: 'IN',
            job_status: 'YES',
            company: 'MSK',
            internships: { '2024': 'Reflective Distance Analytics', '2025': 'Sense Education' }
        }
    };
    convertProfileV1ToV2(d9);
    assertEqual(d9.student_profile.job_search['2024'] !== undefined, true, 'internship 2024 created');
    assertEqual(d9.student_profile.job_search['2024'].seeking, 'IN', '2024: seeking IN');
    assertEqual(d9.student_profile.job_search['2024'].company, 'Reflective Distance Analytics', '2024: company');
    assertEqual(d9.student_profile.job_search['2024'].job_status, 'YES', '2024: job_status YES from real company');
    assertEqual(d9.student_profile.job_search['2025'] !== undefined, true, 'internship 2025 created');
    assertEqual(d9.student_profile.job_search['2025'].company, 'Sense Education', '2025: company');
    assertEqual(d9.student_profile.job_search['2025'].job_status, 'YES', '2025: job_status YES from real company');
    assertEqual(d9.student_profile.job_search['2026'] !== undefined, true, '2026 from top-level seeking');
    assertEqual(d9.student_profile.job_search['2026'].seeking, 'IN', '2026: seeking');
    assertEqual(d9.student_profile.job_search['2026'].company, 'MSK', '2026: company preserved for IN');
    assertEqual(d9.student_profile.job_search['2026'].job_status, 'YES', '2026: job_status YES from real company');
    assertEqual(d9.student_profile.job_search['2028'], undefined, 'no 2028 entry from graduation_year');
    assertEqual(d9.student_profile.internships, undefined, 'internships removed after conversion');
    assertEqual(d9.student_profile.version, 2, 'version set to 2');
}

// =====================================================================
// Tracker: V1 conversion triggers dirty-state (shouldOverrideWithConversion)
// Mirrors the inline check: entry.wasV1Converted && existingEntry.data?.student_profile?.version !== 2
// =====================================================================

function shouldOverrideWithConversion(entry, existingEntry) {
    return entry.wasV1Converted === true &&
        (!existingEntry || existingEntry.data?.student_profile?.version !== 2);
}

console.log('\nTracker: shouldOverrideWithConversion (V1 dirty-state)');
{
    // V1 converted, existing is V1 → should override (triggers save)
    const e1 = { wasV1Converted: true, data: { student_profile: { version: 2 } } };
    const x1 = { data: { student_profile: { graduation_year: 2026, seeking: 'FT' } } };
    assertEqual(shouldOverrideWithConversion(e1, x1), true, 'V1→V2, existing V1 → override');

    // V1 converted, existing is already V2 → should NOT override
    const e2 = { wasV1Converted: true, data: { student_profile: { version: 2 } } };
    const x2 = { data: { student_profile: { version: 2 } } };
    assertEqual(shouldOverrideWithConversion(e2, x2), false, 'V1→V2, existing V2 → no override');

    // V2 profile loaded (no conversion) → should NOT override
    const e3 = { wasV1Converted: false, data: { student_profile: { version: 2 } } };
    const x3 = { data: { student_profile: { graduation_year: 2026, seeking: 'FT' } } };
    assertEqual(shouldOverrideWithConversion(e3, x3), false, 'V2 profile → no override');

    // V1 converted, no existing entry (new repo) → override (new entry path)
    const e4 = { wasV1Converted: true, data: { student_profile: { version: 2 } } };
    assertEqual(shouldOverrideWithConversion(e4, null), true, 'V1→V2, no existing → override');
}

// =====================================================================
// Tracker: dashboard row display logic (Type and Status columns)
// Mirrors cellRenderer logic in initGrid() in tracker/js/app-htmx.js
// =====================================================================

function renderTypeCell(job_type, graduation_year, dashboardYear) {
    if (job_type === 'None') return '--';
    if (!job_type && graduation_year != null && dashboardYear != null) {
        if (graduation_year == dashboardYear) return 'FT';
        if (graduation_year > dashboardYear) return 'IN';
    }
    return job_type || '';
}

function renderStatusCell(job_type, job_status, graduation_year, dashboardYear) {
    if (job_type === 'None') return 'N/A';
    if (!job_type && graduation_year != null && dashboardYear != null) {
        if (graduation_year == dashboardYear || graduation_year > dashboardYear) {
            return 'No';
        }
    }
    if (!job_status) return '';
    return job_status; // 'Yes' or 'No'
}

console.log('\nTracker: dashboard Type cell rendering');
{
    // Case 1: Not Looking (has job_search record with seeking=None)
    assertEqual(renderTypeCell('None', 2026, 2026), '--', 'seeking=None → Type is --');
    // Case 2: Missing recruiting-year record — inferred from graduation_year
    assertEqual(renderTypeCell('', 2026, 2026), 'FT', 'missing record, grad=dashboard year → FT');
    assertEqual(renderTypeCell('', 2027, 2026), 'IN', 'missing record, grad > dashboard year → IN');
    assertEqual(renderTypeCell('', 2028, 2026), 'IN', 'missing record, grad > dashboard year (2028) → IN');
    assertEqual(renderTypeCell('', 2027, 2027), 'FT', 'missing record, grad=dashboard year (2027) → FT');
    assertEqual(renderTypeCell('', 2028, 2027), 'IN', 'missing record, grad > dashboard year (2028 vs 2027) → IN');
    // Normal cases unchanged
    assertEqual(renderTypeCell('FT', 2026, 2026), 'FT', 'FT record → FT');
    assertEqual(renderTypeCell('IN', 2026, 2026), 'IN', 'IN record → IN');
}

console.log('\nTracker: dashboard Status cell rendering');
{
    // Case 1: Not Looking — always N/A regardless of job_status value
    assertEqual(renderStatusCell('None', 'No', null, null), 'N/A', 'seeking=None, job_status=No → N/A');
    assertEqual(renderStatusCell('None', '', null, null), 'N/A', 'seeking=None, no job_status → N/A');
    // Case 2: Inferred record — show No badge (not yet placed)
    assertEqual(renderStatusCell('', '', 2026, 2026), 'No', 'inferred FT (grad=dashboard year 2026) → No');
    assertEqual(renderStatusCell('', '', 2027, 2026), 'No', 'inferred IN (grad 2027 > dashboard 2026) → No');
    assertEqual(renderStatusCell('', '', 2027, 2027), 'No', 'inferred FT (grad=dashboard year 2027) → No');
    assertEqual(renderStatusCell('', '', 2028, 2027), 'No', 'inferred IN (grad 2028 > dashboard 2027) → No');
    // Normal active cases unchanged
    assertEqual(renderStatusCell('FT', 'Yes', 2026, 2026), 'Yes', 'FT + Yes → Yes');
    assertEqual(renderStatusCell('FT', 'No', 2026, 2026), 'No', 'FT + No → No');
    assertEqual(renderStatusCell('IN', 'Yes', 2025, 2026), 'Yes', 'IN + Yes → Yes');
    assertEqual(renderStatusCell('IN', 'No', 2025, 2026), 'No', 'IN + No → No');
}

// =====================================================================
// Tracker: updateStatistics row categorization
// Mirrors updateStatistics() in tracker/js/app-htmx.js
// =====================================================================

function categorizeProfiles(profiles, dashboardYear) {
    const effectiveType = (p) => {
        if (p.job_type && p.job_type !== '') return p.job_type;
        if (dashboardYear == null) return '';
        if (p.graduation_year == dashboardYear) return 'FT';
        if (p.graduation_year > dashboardYear) return 'IN';
        return '';
    };
    const notLooking = profiles.filter(p => effectiveType(p) === 'None').length;
    const haveFTJob = profiles.filter(p => effectiveType(p) === 'FT' && p.job_status === 'Yes').length;
    const haveINJob = profiles.filter(p => effectiveType(p) === 'IN' && p.job_status === 'Yes').length;
    const haveAnyJob = haveFTJob + haveINJob;
    const plansFinalized = haveAnyJob + notLooking;
    return { notLooking, plansFinalized };
}

console.log('\nTracker: updateStatistics categorization');
{
    const profiles = [
        { job_type: 'FT', job_status: 'Yes' },                    // has FT job
        { job_type: 'FT', job_status: 'No' },                     // FT, looking
        { job_type: 'IN', job_status: 'Yes' },                    // has internship
        { job_type: 'None', job_status: 'No' },                   // Not Looking
        { job_type: '', job_status: '', graduation_year: 2026 },   // inferred FT (2026 dashboard)
        { job_type: '', job_status: '', graduation_year: 2027 },   // inferred IN (2026 dashboard)
    ];
    const result = categorizeProfiles(profiles, 2026);
    assertEqual(result.notLooking, 1, 'notLooking counts only seeking=None rows');
    assertEqual(result.plansFinalized, 3, 'plansFinalized = jobs(2) + notLooking(1); inferred records without jobs not finalized');
}

{
    // All students have records: some not looking, none inferred
    const profiles = [
        { job_type: 'None', job_status: 'No' },
        { job_type: 'None', job_status: 'No' },
        { job_type: 'FT', job_status: 'Yes' },
    ];
    const result = categorizeProfiles(profiles, 2026);
    assertEqual(result.notLooking, 2, 'two not looking');
    assertEqual(result.plansFinalized, 3, 'plansFinalized = 1 job + 2 not looking');
}

{
    // Inferred FT students (2027 dashboard, 2027 graduates)
    const profiles = [
        { job_type: '', job_status: '', graduation_year: 2027 },
        { job_type: '', job_status: '', graduation_year: 2027 },
    ];
    const result = categorizeProfiles(profiles, 2027);
    assertEqual(result.notLooking, 0, 'no not-looking');
    assertEqual(result.plansFinalized, 0, 'inferred FT with no job do not count as finalized');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
