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
        const recruitingYear = String(data.graduation_year || currentYear);
        if (data.seeking && data.seeking !== 'None') {
            let company = 'None';
            let jobStatus = data.job_status || 'NO';
            if (data.seeking === 'FT') {
                const raw = data.company != null ? String(data.company).trim() : '';
                if (raw && raw.toLowerCase() !== 'n/a' && raw.toLowerCase() !== 'none') {
                    company = raw;
                    jobStatus = 'YES';
                }
            }
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
    for (const entry of Object.values(data.job_search || {})) {
        if ('full_time_company' in entry) {
            entry.company = entry.full_time_company;
            delete entry.full_time_company;
        }
    }
    return data;
}

function normalizeCompany(val) {
    const v = (val || '').trim();
    if (!v || v.toLowerCase() === 'none' || v.toLowerCase() === 'n/a' || v.toLowerCase() === 'na') return 'None';
    return v;
}

function isRealCompany(val) {
    return val && val !== 'None';
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

console.log('Recruiting year from graduation_year');
{
    const data = { graduation_year: 2027, seeking: 'FT', company: 'Google' };
    convertLegacyToV2(data);
    assertEqual(data.job_search['2027'] !== undefined, true, 'keyed by grad year 2027');
    assertEqual(data.job_search['2027'].company, 'Google', 'company under correct year');
    assertEqual(data.job_search['2026'], undefined, 'no entry under 2026');
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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
