// HTMX Version - Complete Implementation
// All functionality from original app with HTMX navigation
// Version: 2025-02-09-header-summary

console.log('HTMX App initializing... [v2025-02-09-header-summary]');

(function() {
    'use strict';
    
    // ============================================================================
    // STATE
    // ============================================================================
    let repoNames = [];
    let db = null;
    let conn = null;
    let gridApi = null;
    let repoStatusGridApi = null;
    let repoStatusData = [];
    let pieChart = null;
    let currentDashboardYear = new Date().getFullYear(); // Default to current year dashboard
    
    // ============================================================================
    // TOKEN MANAGEMENT
    // ============================================================================
    
    function saveToken() {
        console.log('saveToken called');
        const token = document.getElementById('githubToken').value.trim();
        console.log('Token entered:', token);
        
        if (!token) {
            showTokenStatus('Please enter a valid token', true);
            return;
        }

        if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
            showTokenStatus('Token should start with ghp_ or github_pat_', true);
            return;
        }

        localStorage.setItem('github_token', token);
        const saved = localStorage.getItem('github_token');
        console.log('✅ Token saved to localStorage:', saved);
        
        // Replace the entire app content with saved state
        const appContent = document.getElementById('app-content');
        if (appContent) {
            appContent.innerHTML = `
                <div class="rounded-lg bg-white p-8 shadow-lg">
                    <div class="mx-auto max-w-2xl">
                        <div class="mb-6">
                            <h2 class="text-2xl font-bold text-gray-900">GitHub Token Required</h2>
                        </div>
                        <div class="rounded-lg bg-green-50 border border-green-200 p-4 mb-6">
                            <p class="text-green-800 text-sm font-medium flex items-center gap-2">
                                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                Token saved successfully! Loading dashboard...
                            </p>
                        </div>
                    </div>
                </div>
                <div id="loadingIndicator" class="rounded-lg bg-white p-8 text-center shadow mt-6">
                    <div class="spinner mx-auto"></div>
                    <p class="mt-4 text-gray-600">Loading student profiles...</p>
                    <p id="loadingProgress" class="mt-2 text-sm text-gray-500"></p>
                </div>
                <div id="tab-container"></div>
            `;
        }

        setTimeout(() => {
            // Use HTMX to load dashboard content into tab-container
            htmx.ajax('GET', 'fragments/dashboard-content.html?v=2025-02-09-header-summary', {
                target: '#tab-container',
                swap: 'innerHTML'
            }).then(() => {
                console.log('✅ Dashboard loaded');
                
                // Hide the success message wrapper and loading indicator
                const appContent = document.getElementById('app-content');
                if (appContent) {
                    // Hide the first child (success message container)
                    if (appContent.children[0]) {
                        appContent.children[0].style.display = 'none';
                        console.log('✅ Hidden success message');
                    }
                    // Hide the loading indicator
                    const loadingInd = appContent.querySelector('#loadingIndicator');
                    if (loadingInd) {
                        loadingInd.style.display = 'none';
                        console.log('✅ Hidden loading indicator');
                    }
                }
                
                // After HTMX swaps the content, load the data
                loadData();
            });
        }, 1000);
    }
    
    function clearToken() {
        localStorage.removeItem('github_token');
        
        // Use HTMX to reload the token form
        htmx.ajax('GET', 'fragments/token-form.html?v=2025-02-13-token-sections', {
            target: '#app-content',
            swap: 'innerHTML'
        });
    }
    
    function getToken() {
        return localStorage.getItem('github_token');
    }
    
    function showTokenStatus(message, isError) {
        const status = document.getElementById('tokenStatus');
        const text = document.getElementById('tokenStatusText');
        if (status && text) {
            // Use appropriate colors - green for success, red for error
            const borderColor = isError ? 'border-red-300' : 'border-green-300';
            const bgColor = isError ? 'bg-red-50' : 'bg-green-50';
            const textColor = isError ? 'text-red-800' : 'text-green-800';
            const iconColor = isError ? 'text-red-600' : 'text-green-600';
            
            status.className = `mb-6 rounded-lg border p-4 ${borderColor} ${bgColor}`;
            text.className = `text-sm font-medium ${textColor}`;
            text.textContent = message;
            status.classList.remove('hidden');
            
            // Update icon color
            const icon = status.querySelector('svg');
            if (icon) {
                icon.className = `h-5 w-5 ${iconColor}`;
            }
        }
    }
    
    // ============================================================================
    // TAB SWITCHING (Enhanced for HTMX)
    // ============================================================================
    
    function switchTab(tabName, year) {
        console.log('===============================================');
        console.log('switchTab called with:', tabName, 'year:', year);
        console.log('Current repoStatusData length:', repoStatusData.length);
        console.log('Current repoStatusGridApi exists:', !!repoStatusGridApi);
        console.log('Current gridApi exists:', !!gridApi);
        console.log('===============================================');
        
        if (tabName === 'dashboard') {
            // Store the current dashboard year if provided
            if (year) {
                currentDashboardYear = year;
                console.log('Set currentDashboardYear to:', currentDashboardYear);
                updateDashboardTitle();
            }
            
            // Wait a moment for HTMX to swap the content, then initialize grid
            setTimeout(async () => {
                const gridDiv = document.getElementById('profileGrid');
                console.log('After timeout - Dashboard grid div exists:', !!gridDiv);
                console.log('After timeout - gridApi exists:', !!gridApi);
                
                if (gridDiv) {
                    console.log('Grid div found! Dimensions:', gridDiv.offsetWidth, 'x', gridDiv.offsetHeight);
                    console.log('Grid div innerHTML length:', gridDiv.innerHTML.length);
                    
                    // Check if we have data in the database
                    if (conn) {
                        try {
                            const result = await conn.query('SELECT COUNT(*) as count FROM profiles');
                            const count = result.toArray()[0].count;
                            console.log('Profiles in database:', count);
                            
                            if (count > 0) {
                                // Check if the grid div is empty (HTMX replaced it) or if grid was never initialized
                                const needsInit = !gridApi || gridDiv.innerHTML.trim() === '';
                                
                                if (needsInit) {
                                    console.log('🎯 Reinitializing dashboard grid NOW');
                                    
                                    // Destroy old grid if it exists
                                    if (gridApi) {
                                        console.log('Destroying old grid instance');
                                        try {
                                            gridApi.destroy();
                                        } catch (e) {
                                            console.warn('Grid destroy failed (expected if DOM was replaced):', e);
                                        }
                                        gridApi = null;
                                    }
                                    
                                    // Reload grid data (this will recreate the grid)
                                    await loadGridData();
                                    
                                    // Apply current filter state after loading data
                                    setTimeout(() => {
                                        applyFilters();
                                        console.log('✅ Dashboard grid reinitialized and filters applied');
                                    }, 100);
                                } else {
                                    console.log('Dashboard grid already initialized and connected');
                                    // Apply current filter state to ensure filters are respected
                                    applyFilters();
                                }
                            } else {
                                console.log('No profile data in database yet');
                            }
                        } catch (error) {
                            console.error('❌ Error checking database:', error);
                        }
                    } else {
                        console.log('Database connection not available');
                    }
                }
            }, 150);
        } else if (tabName === 'repoStatus') {
            // Wait a moment for HTMX to swap the content, then initialize grid
            setTimeout(() => {
                const gridDiv = document.getElementById('repoStatusGrid');
                console.log('After timeout - Grid div exists:', !!gridDiv);
                console.log('After timeout - repoStatusData length:', repoStatusData.length);
                console.log('After timeout - repoStatusGridApi exists:', !!repoStatusGridApi);
                
                if (gridDiv) {
                    console.log('Grid div found! Dimensions:', gridDiv.offsetWidth, 'x', gridDiv.offsetHeight);
                    console.log('Grid div innerHTML length:', gridDiv.innerHTML.length);
                }
                
                if (gridDiv && repoStatusData.length > 0) {
                    // Check if the grid div is empty (HTMX replaced it) or if grid was never initialized
                    const needsInit = !repoStatusGridApi || gridDiv.innerHTML.trim() === '';
                    
                    if (needsInit) {
                        console.log('🎯 Initializing repo status grid NOW with', repoStatusData.length, 'repos');
                        console.log('Sample data:', repoStatusData.slice(0, 2));
                        
                        // Destroy old grid if it exists
                        if (repoStatusGridApi) {
                            console.log('Destroying old grid instance');
                            try {
                                repoStatusGridApi.destroy();
                            } catch (e) {
                                console.warn('Grid destroy failed (expected if DOM was replaced):', e);
                            }
                            window.repoStatusGridApi = repoStatusGridApi = null;
                        }
                        
                        try {
                            initRepoStatusGrid(repoStatusData);
                            console.log('✅ Grid initialization completed');
                            console.log('Grid API now exists:', !!repoStatusGridApi);
                        } catch (error) {
                            console.error('❌ Error initializing grid:', error);
                        }
                    } else {
                        console.log('Grid already initialized, updating data');
                        repoStatusGridApi.setGridOption('rowData', repoStatusData);
                        updateRepoStatusSummary(repoStatusData);
                    }
                } else {
                    console.log('❌ Grid not ready:');
                    console.log('  - gridDiv exists:', !!gridDiv);
                    console.log('  - repoStatusData.length:', repoStatusData.length);
                    if (!gridDiv) {
                        console.log('  - Reason: Grid div not found in DOM');
                        console.log('  - Available elements:', 
                            Array.from(document.querySelectorAll('[id]')).map(el => el.id));
                    }
                    if (repoStatusData.length === 0) {
                        console.log('  - Reason: No data loaded yet. Click "Refresh Data" first.');
                    }
                }
            }, 150); // Increased to 150ms for safety
        }
    }
    
    // ============================================================================
    // UI HELPERS
    // ============================================================================
    
    function showRefreshModal() {
        const modal = document.getElementById('refreshModal');
        if (modal) {
            modal.classList.remove('hidden');
            // Reset modal state
            document.getElementById('refreshModalProgress').textContent = 'Initializing...';
            document.getElementById('refreshModalStats').innerHTML = '';
            document.getElementById('refreshModalActions').classList.add('hidden');
        }
    }
    
    function closeRefreshModal() {
        const modal = document.getElementById('refreshModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    function updateRefreshModalProgress(message) {
        const el = document.getElementById('refreshModalProgress');
        if (el) el.textContent = message;
    }
    
    function updateRefreshModalStats(stats) {
        const el = document.getElementById('refreshModalStats');
        if (el) el.innerHTML = stats;
    }
    
    function showRefreshModalComplete(message, isError = false) {
        const progressEl = document.getElementById('refreshModalProgress');
        const actionsEl = document.getElementById('refreshModalActions');
        
        if (progressEl) {
            // Display result as a badge
            const badgeClass = isError 
                ? 'inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800'
                : 'inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800';
            
            progressEl.innerHTML = `<span class="${badgeClass}">${message}</span>`;
            progressEl.className = 'text-sm';
        }
        
        if (actionsEl) {
            actionsEl.classList.remove('hidden');
        }
        
        // Hide spinner
        const modal = document.getElementById('refreshModal');
        const spinner = modal?.querySelector('.spinner');
        if (spinner) spinner.style.display = 'none';
    }
    
    function showLoading(show) {
        const el = document.getElementById('loadingIndicator');
        if (el) el.classList.toggle('hidden', !show);
    }

    function updateLoadingProgress(message) {
        const el = document.getElementById('loadingProgress');
        if (el) el.textContent = message;
    }

    function showError(message) {
        const container = document.getElementById('errorContainer');
        if (container) {
            container.innerHTML = `<div class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800">❌ ${message}</div>`;
        }
    }

    function clearError() {
        const container = document.getElementById('errorContainer');
        if (container) container.innerHTML = '';
    }

    function showSuccess(message) {
        const container = document.getElementById('errorContainer');
        if (container) {
            container.innerHTML = `<div class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">✓ ${message}</div>`;
            setTimeout(() => {
                if (container) container.innerHTML = '';
            }, 5000);
        }
    }
    
    // ============================================================================
    // DUCKDB INITIALIZATION
    // ============================================================================
    
    async function initDuckDB() {
        if (db && conn) return;

        try {
            console.log('Initializing DuckDB...');

            let attempts = 0;
            while (!window.duckdb && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.duckdb) {
                throw new Error('DuckDB library failed to load');
            }

            const JSDELIVR_BUNDLES = window.duckdb.getJsDelivrBundles();
            const bundle = await window.duckdb.selectBundle(JSDELIVR_BUNDLES);

            const workerUrl = URL.createObjectURL(
                new Blob([`importScripts("${bundle.mainWorker}");`], {
                    type: "text/javascript"
                })
            );

            const worker = new Worker(workerUrl);
            const logger = new window.duckdb.ConsoleLogger();

            db = new window.duckdb.AsyncDuckDB(logger, worker);
            await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

            conn = await db.connect();

            console.log('DuckDB connection established');

            await conn.query(`
                CREATE TABLE IF NOT EXISTS profiles_raw(
                    repo TEXT,
                    data TEXT
                )
            `);

            await conn.query(`
                CREATE TABLE IF NOT EXISTS profiles(
                    yuid INTEGER PRIMARY KEY,
                    repo TEXT,
                    student_name TEXT,
                    graduation_year INTEGER,
                    cs_track TEXT,
                    email TEXT,
                    whatsapp TEXT
                )
            `);

            await conn.query(`
                CREATE TABLE IF NOT EXISTS job_search(
                    yuid INTEGER,
                    recruiting_year INTEGER,
                    seeking TEXT,
                    job_status TEXT,
                    full_time_company TEXT,
                    PRIMARY KEY (yuid, recruiting_year)
                )
            `);

            await conn.query(`
                CREATE TABLE IF NOT EXISTS internships(
                    yuid INTEGER,
                    year INTEGER,
                    company TEXT
                )
            `);

            await conn.query(`CREATE INDEX IF NOT EXISTS idx_internships_yuid ON internships(yuid)`);

            await conn.query(`
                CREATE TABLE IF NOT EXISTS graduate_schools(
                    yuid INTEGER,
                    name TEXT,
                    status TEXT
                )
            `);

            await conn.query(`CREATE INDEX IF NOT EXISTS idx_graduate_schools_yuid ON graduate_schools(yuid)`);

            console.log('DuckDB tables created successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize DuckDB:', error);
            showError('Failed to initialize database: ' + error.message);
            throw error;
        }
    }
    
    // ============================================================================
    // DATA LOADING
    // ============================================================================
    
    async function loadRepoList() {
        try {
            const token = getToken();
            const headers = token ? {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3.raw'
            } : {};

            const response = await fetch('https://api.github.com/repos/Yeshiva-University-CS/careers/contents/repo_list.json', {
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`Failed to load repo list: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            repoNames = data.repositories || [];
            console.log(`Loaded ${repoNames.length} repositories from repo_list.json`);
            return repoNames;
        } catch (error) {
            console.error('Error loading repo list:', error);
            showError('Failed to load repository list from GitHub. Please check that repo_list.json is committed and try again.');
            throw error;
        }
    }
    
    async function loadConsolidatedProfileData() {
        try {
            const token = getToken();
            const headers = token ? {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3.raw'
            } : {};

            console.log('Attempting to load profile_data.json from careers repo...');
            const response = await fetch('https://api.github.com/repos/Yeshiva-University-CS/careers/contents/profile_data.json', {
                headers: headers
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.log('profile_data.json not found in careers repo');
                    return null;
                }
                if (response.status === 401) {
                    console.warn('GitHub token is invalid or expired (401 Unauthorized)');
                    // Clear the invalid token
                    clearToken();
                    return null;
                }
                throw new Error(`Failed to load profile data: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`Loaded consolidated profile data with ${data.length} entries`);
            
            // Normalize "Not Found" to "Missing" for display consistency
            data.forEach(entry => {
                if (entry.status === 'Not Found') entry.status = 'Missing';
                if (entry.resumeStatus === 'Not Found') entry.resumeStatus = 'Missing';
            });
            
            return data;
        } catch (error) {
            console.error('Error loading consolidated profile data:', error);
            return null;
        }
    }
    
    async function saveConsolidatedDataToGitHub(profileData) {
        const token = getToken();
        if (!token) {
            throw new Error('GitHub token required to save data');
        }

        console.log('Saving consolidated profile data to GitHub...');
        
        const content = JSON.stringify(profileData, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(content)));
        
        // First, try to get the current file SHA
        let sha = null;
        let fileExists = false;
        
        try {
            // Force a fresh request for metadata only (not content)
            const getResponse = await fetch('https://api.github.com/repos/Yeshiva-University-CS/careers/contents/profile_data.json', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                cache: 'no-store'  // Prevent using cached response
            });
            
            if (getResponse.ok) {
                const fileData = await getResponse.json();
                
                // GitHub should return metadata object with 'sha', 'content', etc.
                // If we get an array, that's the cached raw content from a previous request
                if (Array.isArray(fileData)) {
                    console.error('ERROR: Got cached raw content (array) instead of metadata!');
                    console.log('Array length:', fileData.length);
                    console.log('Making second attempt with different Accept header...');
                    
                    // Try again with explicit object+json accept header
                    const retryResponse = await fetch('https://api.github.com/repos/Yeshiva-University-CS/careers/contents/profile_data.json', {
                        headers: {
                            'Authorization': `token ${token}`,
                            'Accept': 'application/vnd.github.object+json'
                        },
                        cache: 'reload'  // Force reload from server
                    });
                    
                    if (retryResponse.ok) {
                        const metadata = await retryResponse.json();
                        sha = metadata.sha;
                        fileExists = true;
                        console.log('Successfully fetched metadata on retry, SHA:', sha);
                    } else {
                        throw new Error(`Failed to fetch file metadata on retry: ${retryResponse.status}`);
                    }
                } else {
                    sha = fileData.sha;
                    fileExists = true;
                    console.log('Found existing file, SHA:', sha);
                    if (!sha) {
                        console.error('WARNING: File exists but SHA is missing from response!');
                        console.log('File data keys:', Object.keys(fileData));
                        console.log('File data type:', fileData.type);
                    }
                }
            } else if (getResponse.status === 404) {
                console.log('File does not exist yet, will create new');
                fileExists = false;
                sha = null;
            } else if (getResponse.status === 401) {
                console.error('Token is invalid or expired');
                clearToken();
                throw new Error('GitHub token is invalid or expired. Please enter a new token.');
            } else {
                const errorText = await getResponse.text();
                console.error('Failed to check existing file:', getResponse.status, errorText);
                throw new Error(`Failed to check if file exists: ${getResponse.status} ${errorText}`);
            }
        } catch (error) {
            if (error.message.includes('token') || error.message.includes('Failed to check')) {
                throw error;
            }
            console.error('Network error checking existing file:', error);
            throw new Error(`Network error: ${error.message}`);
        }
        
        // Create or update the file
        const payload = {
            message: `Update profile data - ${new Date().toISOString()}`,
            content: base64Content,
            branch: 'main'
        };
        
        // Include SHA - always required when file exists
        if (sha) {
            payload.sha = sha;
            console.log('Updating existing file with SHA:', sha);
        } else if (fileExists) {
            // File exists but we don't have SHA - this is an error state
            console.error('CRITICAL: File exists but SHA not available!');
            throw new Error('File exists but SHA not available - cannot update. This may indicate an API response issue.');
        } else {
            console.log('Creating new file (no SHA needed)');
        }
        
        console.log('PUT request payload:', JSON.stringify({...payload, content: payload.content.substring(0, 100) + '...'}, null, 2));
        
        const putResponse = await fetch('https://api.github.com/repos/Yeshiva-University-CS/careers/contents/profile_data.json', {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!putResponse.ok) {
            const errorText = await putResponse.text();
            throw new Error(`Failed to save profile data to GitHub: ${putResponse.status} ${errorText}`);
        }
        
        const result = await putResponse.json();
        console.log('Successfully saved profile_data.json to GitHub:', result.commit.sha);
        return result;
    }
    
    async function fetchFile(repo, filePath, token, acceptHeader = 'application/vnd.github.v3.raw') {
        const url = `https://api.github.com/repos/Yeshiva-University-CS/${repo}/contents/${filePath}?ref=yccs-tracker`;
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': acceptHeader
                }
            });

            if (response.ok) {
                return response;
            } else if (response.status === 404) {
                return null;
            } else {
                console.warn(`HTTP ${response.status} for ${url}`);
                return null;
            }
        } catch (error) {
            console.warn(`Fetch error for ${url}:`, error);
            return null;
        }
    }
    
    async function loadData() {
        const token = getToken();
        if (!token) {
            htmx.ajax('GET', 'fragments/token-form.html?v=2025-02-13-token-sections', {
                target: '#app-content',
                swap: 'innerHTML'
            });
            return;
        }

        showLoading(true);
        clearError();

        try {
            await initDuckDB();

            if (!conn) {
                throw new Error('Database connection failed to initialize');
            }

            await conn.query('DELETE FROM profiles_raw');
            await conn.query('DELETE FROM profiles');
            await conn.query('DELETE FROM job_search');
            await conn.query('DELETE FROM internships');
            await conn.query('DELETE FROM graduate_schools');

            // Try to load from consolidated profile_data.json
            console.log('Loading from consolidated profile data...');
            const consolidatedData = await loadConsolidatedProfileData();
            
            if (!consolidatedData || consolidatedData.length === 0) {
                // Check if token was cleared due to 401
                const token = getToken();
                if (!token) {
                    console.log('No valid token - redirecting to token form');
                    htmx.ajax('GET', 'fragments/token-form.html?v=2025-02-13-token-sections', {
                        target: '#app-content',
                        swap: 'innerHTML'
                    });
                    return;
                }
                
                showError('No profile data found. Please use "Refresh Data from Repos" in Settings to fetch and save profile data.');
                showLoading(false);
                return;
            }

            repoStatusData = [];
            let successCount = 0;

            for (let i = 0; i < consolidatedData.length; i++) {
                const entry = consolidatedData[i];
                updateLoadingProgress(`Processing ${i + 1}/${consolidatedData.length}: ${entry.repo}`);
                
                if (entry.error) {
                    // Entry has an error, add to status data
                    const gradYear = entry.data?.student_profile?.graduation_year || '';
                    repoStatusData.push({
                        studentName: entry.studentName || entry.repo,
                        graduationYear: gradYear,
                        repo: entry.repo,
                        lastUpdated: entry.lastUpdated || 'Unknown',
                        status: entry.status || 'Failed',
                        statusError: entry.error,
                        resumeStatus: entry.resumeStatus || 'Unknown',
                        resumeStatusError: entry.resumeStatusError || '',
                        resumeLastUpdated: entry.resumeLastUpdated || 'Unknown'
                    });
                } else {
                    // Entry is valid, add to database
                    try {
                        const jsonText = JSON.stringify(entry.data).replace(/'/g, "''");
                        await conn.query(`INSERT INTO profiles_raw VALUES ('${entry.repo}', '${jsonText}')`);
                        successCount++;

                        const gradYear = entry.data?.student_profile?.graduation_year || '';
                        repoStatusData.push({
                            studentName: entry.studentName || entry.repo,
                            graduationYear: gradYear,
                            repo: entry.repo,
                            lastUpdated: entry.lastUpdated || 'Unknown',
                            status: entry.status || 'Success',
                            statusError: '',
                            resumeStatus: entry.resumeStatus || 'Unknown',
                            resumeStatusError: entry.resumeStatusError || '',
                            resumeLastUpdated: entry.resumeLastUpdated || 'Unknown'
                        });
                    } catch (dbError) {
                        console.error(`Error inserting ${entry.repo} into database:`, dbError);
                    }
                }
            }

            console.log(`Loaded ${successCount} profiles from consolidated data`);

            console.log('Processing profiles...');
            await processProfiles();
            
            console.log('Loading grid data...');
            await loadGridData();

            // Check if we need to initialize repo status grid
            const repoGridDiv = document.getElementById('repoStatusGrid');
            if (repoGridDiv && repoStatusData.length > 0) {
                if (!repoStatusGridApi) {
                    initRepoStatusGrid(repoStatusData);
                } else {
                    repoStatusGridApi.setGridOption('rowData', repoStatusData);
                    updateRepoStatusSummary(repoStatusData);
                }
            }

            // Render dynamic year tabs after data is loaded
            await renderYearTabs();

            console.log('Data loaded successfully!');
            showLoading(false);
            showSuccess(`Successfully loaded ${successCount} student profiles`);

        } catch (error) {
            console.error('Error loading data:', error);
            showError('Failed to load data: ' + error.message);
            showLoading(false);
        }
    }
    
    // ============================================================================
    // SHARED REPO PROCESSING FUNCTION
    // ============================================================================
    
    // Shared function to process a single repository profile
    async function processSingleRepoProfile(repo, token) {
        const profilePath = 'profile.yml';
        const resumePath = 'resume.pdf';
        
        const entry = {
            repo: repo,
            studentName: 'N/A',
            lastUpdated: 'Unknown',
            status: 'Failed',
            resumeStatus: 'Failed',
            resumeLastUpdated: 'Unknown'
        };

        try {
            const response = await fetchFile(repo, profilePath, token);

            if (response) {
                const text = await response.text();
                if (text.trim()) {
                    try {
                        const data = jsyaml.load(text);
                        const profile = data.student_profile || {};
                        
                        if (profile.first_name && profile.last_name) {
                            entry.studentName = `${profile.last_name}, ${profile.first_name}`;
                        } else {
                            entry.studentName = repo;
                        }

                        entry.data = data;
                        entry.status = 'Success';
                        
                        // Get last updated time
                        try {
                            const commitsUrl = `https://api.github.com/repos/Yeshiva-University-CS/${repo}/commits?path=${profilePath}&per_page=1&sha=yccs-tracker`;
                            const commitsResponse = await fetch(commitsUrl, {
                                headers: {
                                    'Authorization': `token ${token}`,
                                    'Accept': 'application/vnd.github.v3+json'
                                }
                            });

                            if (commitsResponse.ok) {
                                const commits = await commitsResponse.json();
                                if (commits.length > 0) {
                                    entry.lastUpdated = commits[0].commit.author.date;
                                }
                            }
                            // Note: For ANY non-ok response (429, 403, 500, etc.) or network error,
                            // lastUpdated remains 'Unknown' which prevents treating it as an update
                        } catch (commitError) {
                            console.warn(`Could not fetch commit for ${repo}:`, commitError);
                            // lastUpdated remains 'Unknown' on any error
                        }
                    } catch (yamlError) {
                        console.warn(`YAML parse error for ${repo}:`, yamlError);
                        entry.error = `YAML parse error: ${yamlError?.message || yamlError}`;
                        entry.studentName = repo;
                    }
                } else {
                    console.warn(`Empty file for ${repo}`);
                    entry.error = 'Empty profile file';
                    entry.studentName = repo;
                }
            } else {
                console.warn(`Profile file not found for ${repo}`);
                entry.status = 'Missing';
                entry.error = 'Profile file not found at profile.yml';
                entry.studentName = repo;
            }
        } catch (fetchError) {
            console.warn(`Fetch error for ${repo}:`, fetchError);
            entry.error = `Network error: ${fetchError?.message || fetchError}`;
            entry.studentName = repo;
        }

        // Check for resume
        try {
            const resumeResponse = await fetchFile(repo, resumePath, token, 'application/vnd.github.v3+json');

            if (resumeResponse) {
                entry.resumeStatus = 'Found';

                try {
                    const resumeCommitsUrl = `https://api.github.com/repos/Yeshiva-University-CS/${repo}/commits?path=${resumePath}&per_page=1&sha=yccs-tracker`;
                    const resumeCommitsResponse = await fetch(resumeCommitsUrl, {
                        headers: {
                            'Authorization': `token ${token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });

                    if (resumeCommitsResponse.ok) {
                        const resumeCommits = await resumeCommitsResponse.json();
                        if (resumeCommits.length > 0) {
                            entry.resumeLastUpdated = resumeCommits[0].commit.author.date;
                        }
                    }
                    // Note: For ANY non-ok response or error, resumeLastUpdated remains 'Unknown'
                } catch (resumeCommitError) {
                    console.warn(`Could not fetch resume commit for ${repo}:`, resumeCommitError);
                    // resumeLastUpdated remains 'Unknown' on any error
                }
            } else {
                entry.resumeStatus = 'Missing';
                entry.resumeStatusError = 'Resume not found at resume.pdf';
            }
        } catch (resumeFetchError) {
            console.log(`Resume fetch error for ${repo}:`, resumeFetchError);
            entry.resumeStatus = 'Failed';
            entry.resumeStatusError = `Network error: ${resumeFetchError?.message || resumeFetchError}`;
        }

        return entry;
    }
    
    async function refreshDataFromRepos() {
        const token = getToken();
        if (!token) {
            htmx.ajax('GET', 'fragments/token-form.html?v=2025-02-13-token-sections', {
                target: '#app-content',
                swap: 'innerHTML'
            });
            return;
        }

        showRefreshModal();

        try {
            if (repoNames.length === 0) {
                console.log('Loading repository list...');
                updateRefreshModalProgress('Loading repository list...');
                await loadRepoList();
            }

            // Load existing consolidated data first
            console.log('Loading existing consolidated data...');
            updateRefreshModalProgress('Loading existing consolidated data...');
            const existingData = await loadConsolidatedProfileData() || [];
            
            // Create a map for quick lookup by repo name
            const existingDataMap = new Map();
            existingData.forEach(entry => {
                existingDataMap.set(entry.repo, entry);
            });
            console.log(`Found ${existingData.length} existing entries`);

            const consolidatedData = [];
            let downloaded = 0;
            let updated = 0;
            let failed = 0;
            let newEntries = 0;

            console.log(`Starting to fetch ${repoNames.length} repositories...`);

            for (let i = 0; i < repoNames.length; i++) {
                const repo = repoNames[i];
                const displayRepo = repo.replace(/_800\d+$/, '');
                const progressMsg = `Processing ${i + 1}/${repoNames.length}: ${displayRepo}`;
                updateRefreshModalProgress(progressMsg);
                console.log(progressMsg);

                // Use shared function to process the repo
                const entry = await processSingleRepoProfile(repo, token);
                
                if (entry.status === 'Success') {
                    downloaded++;
                }

                // Compare timestamps with existing data - only use new data if it's newer
                const existingEntry = existingDataMap.get(repo);
                if (existingEntry && existingEntry.lastUpdated !== 'Unknown' && entry.lastUpdated !== 'Unknown') {
                    const existingTimestamp = new Date(existingEntry.lastUpdated).getTime();
                    const newTimestamp = new Date(entry.lastUpdated).getTime();
                    
                    // Check if resume has been updated (new resume or resume timestamp changed)
                    const resumeChanged = entry.resumeLastUpdated !== existingEntry.resumeLastUpdated && 
                                         entry.resumeLastUpdated !== 'Unknown';
                    
                    if (newTimestamp > existingTimestamp || resumeChanged) {
                        if (resumeChanged && newTimestamp <= existingTimestamp) {
                            console.log(`  ✓ ${displayRepo}: Resume updated (profile unchanged) - updating entry`);
                        } else {
                            console.log(`  ✓ ${displayRepo}: Using newer data (${entry.lastUpdated} > ${existingEntry.lastUpdated})`);
                        }
                        consolidatedData.push(entry);
                        updated++;
                    } else {
                        console.log(`  ⊘ ${displayRepo}: Keeping existing data (${existingEntry.lastUpdated} >= ${entry.lastUpdated})`);
                        consolidatedData.push(existingEntry);
                    }
                } else if (existingEntry) {
                    // Has existing data but no valid timestamp comparison
                    if (entry.status === 'Success' && entry.lastUpdated !== 'Unknown') {
                        // New fetch succeeded AND we have a timestamp - use it
                        console.log(`  ✓ ${displayRepo}: Replacing entry (new fetch succeeded with timestamp)`);
                        consolidatedData.push(entry);
                        updated++;
                    } else if (entry.status === 'Success' && entry.lastUpdated === 'Unknown') {
                        // New fetch succeeded but timestamp fetch failed due to ANY error 
                        // (429 rate limit, 403, 500, network error, etc.)
                        if (existingEntry.lastUpdated !== 'Unknown' && existingEntry.status === 'Success') {
                            // Keep existing data since it has a valid timestamp and we don't
                            console.log(`  ⊘ ${displayRepo}: Keeping existing data (new fetch succeeded but no timestamp to compare)`);
                            consolidatedData.push(existingEntry);
                        } else {
                            // Existing also has no timestamp, use new data
                            console.log(`  ✓ ${displayRepo}: Using new data (both lack timestamps but new fetch succeeded)`);
                            consolidatedData.push(entry);
                            updated++;
                        }
                    } else {
                        // New fetch failed - keep existing, count as failed
                        console.log(`  ⊘ ${displayRepo}: Keeping existing data (new fetch failed)`);
                        consolidatedData.push(existingEntry);
                        failed++;
                    }
                } else {
                    // No existing entry
                    if (entry.status === 'Success') {
                        // New profile found - add it
                        console.log(`  + ${displayRepo}: New entry added`);
                        consolidatedData.push(entry);
                        newEntries++;
                    } else {
                        // No existing entry AND no profile found - count as failed
                        console.log(`  ⊘ ${displayRepo}: No existing data and no profile found - failed to fetch`);
                        failed++;
                    }
                }
                
                // Update stats after processing each repo
                updateRefreshModalStats(`<div class="text-left"><div>Downloaded: ${downloaded}</div><div>Updated: ${updated}</div><div>New: ${newEntries}</div><div>Failed: ${failed}</div></div>`);
            }

            console.log(`Refresh complete: ${downloaded} fetched, ${updated} updated, ${newEntries} new, ${failed} failed`);
            
            // Only save to GitHub if there were actual changes
            if (updated > 0 || newEntries > 0) {
                console.log('Saving consolidated data to GitHub...');
                updateRefreshModalProgress('Saving consolidated data to GitHub...');
                
                await saveConsolidatedDataToGitHub(consolidatedData);
                
                console.log('Data saved successfully, now loading...');
                updateRefreshModalProgress('Reloading dashboard data...');
                
                // Now load the data we just saved
                await loadData();
                
                const failedMsg = failed > 0 ? `, ${failed} failed` : '';
                showRefreshModalComplete(`✓ Successfully refreshed ${downloaded} profiles (${updated} updated, ${newEntries} new${failedMsg})`);
            } else {
                console.log('No changes detected - skipping save');
                const failedMsg = failed > 0 ? ` (${failed} failed)` : '';
                showRefreshModalComplete(`✓ Refresh complete: No updates needed${failedMsg}`);
            }

        } catch (error) {
            console.error('Error refreshing data:', error);
            showRefreshModalComplete(`❌ Failed to refresh data: ${error.message}`, true);
        }
    }
    
    async function processProfiles() {
        if (!conn) {
            throw new Error('Database connection not available');
        }

        const rows = await conn.query('SELECT * FROM profiles_raw');
        const rowArray = rows.toArray();

        console.log(`Processing ${rowArray.length} profiles...`);

        for (const row of rowArray) {
            const repo = row.repo;
            const jsonData = JSON.parse(row.data);
            const profile = jsonData.student_profile || {};

            let studentName = 'N/A';
            if (profile.first_name && profile.last_name) {
                studentName = `${profile.last_name}, ${profile.first_name}`;
            }

            const email = (profile.email || profile.yu_email || '').replace(/'/g, "''");
            const repoEsc = repo.replace(/'/g, "''");
            const studentNameEsc = studentName.replace(/'/g, "''");
            const normalizedTrack = profile.cs_track === 'N/A' ? 'None' : (profile.cs_track || '');
            const trackEsc = normalizedTrack.replace(/'/g, "''");
            const whatsappEsc = (profile.whatsapp || '').replace(/'/g, "''");

            await conn.query(`
                INSERT OR REPLACE INTO profiles VALUES (
                    ${profile.yuid || 'NULL'},
                    '${repoEsc}',
                    '${studentNameEsc}',
                    ${profile.graduation_year || 'NULL'},
                    '${trackEsc}',
                    '${email}',
                    '${whatsappEsc}'
                )
            `);

            // Process job_search data: version 2 uses job_search block,
            // unmarked (no version) profiles are legacy 2026 format
            if (profile.version === 2 && profile.job_search && profile.yuid) {
                for (const [year, searchData] of Object.entries(profile.job_search)) {
                    const seeking = (searchData.seeking || 'None').replace(/'/g, "''");
                    const jobStatus = (searchData.job_status || 'None').replace(/'/g, "''");
                    const ftCompany = (searchData.full_time_company || 'None').replace(/'/g, "''");
                    await conn.query(`
                        INSERT INTO job_search VALUES (
                            ${profile.yuid}, ${parseInt(year)}, '${seeking}', '${jobStatus}', '${ftCompany}'
                        )
                        ON CONFLICT (yuid, recruiting_year) DO UPDATE SET
                            seeking = EXCLUDED.seeking,
                            job_status = EXCLUDED.job_status,
                            full_time_company = EXCLUDED.full_time_company
                    `);
                }
            } else if (profile.yuid) {
                // Legacy format (no version): treat as 2026 recruiting year
                const recruitingYear = 2026;
                const seeking = (profile.seeking || '').replace(/'/g, "''");
                const jobStatus = (profile.job_status || '').replace(/'/g, "''");
                let ftCompany = 'None';
                if (seeking === 'FT' && jobStatus === 'YES') {
                    ftCompany = (profile.company || profile.job || 'None').replace(/'/g, "''");
                    if (ftCompany.toLowerCase() === 'n/a') ftCompany = 'None';
                }
                if (seeking && seeking !== 'N/A' && seeking !== 'None') {
                    await conn.query(`
                        INSERT INTO job_search VALUES (
                            ${profile.yuid}, ${recruitingYear}, '${seeking}', '${jobStatus}', '${ftCompany}'
                        )
                        ON CONFLICT (yuid, recruiting_year) DO UPDATE SET
                            seeking = EXCLUDED.seeking,
                            job_status = EXCLUDED.job_status,
                            full_time_company = EXCLUDED.full_time_company
                    `);
                }
            }

            if (profile.internships && profile.yuid) {
                for (const [year, company] of Object.entries(profile.internships)) {
                    const companyEsc = String(company).replace(/'/g, "''");
                    await conn.query(`
                        INSERT INTO internships VALUES (${profile.yuid}, ${parseInt(year)}, '${companyEsc}')
                    `);
                }
            }

            if (profile.graduate_schools && profile.yuid) {
                for (const school of profile.graduate_schools) {
                    const nameEsc = (school.name || '').replace(/'/g, "''");
                    const statusEsc = (school.status || '').replace(/'/g, "''");
                    await conn.query(`
                        INSERT INTO graduate_schools VALUES (${profile.yuid}, '${nameEsc}', '${statusEsc}')
                    `);
                }
            }
        }

        console.log('Profile processing complete');
    }
    
    async function loadGridData() {
        console.log('Querying profiles from database...');
        console.log('Filtering by dashboard year:', currentDashboardYear);

        const csTracksClause = "AND p.cs_track IN ('AI', 'DIS', 'BA')";

        const result = await conn.query(`
            SELECT
                p.repo,
                p.student_name,
                p.yuid,
                p.graduation_year,
                p.cs_track,
                p.email,
                p.whatsapp,
                COALESCE(js.seeking, '') as job_type,
                CASE
                    WHEN js.job_status = 'YES' THEN 'Yes'
                    WHEN js.job_status = 'NO' THEN 'No'
                    ELSE COALESCE(js.job_status, '')
                END as job_status,
                CASE
                    WHEN js.full_time_company IS NULL OR js.full_time_company = 'None' THEN ''
                    ELSE js.full_time_company
                END as job
            FROM profiles p
            LEFT JOIN job_search js ON p.yuid = js.yuid AND js.recruiting_year = ${currentDashboardYear}
            WHERE p.graduation_year >= ${currentDashboardYear}
            ${csTracksClause}
            ORDER BY p.student_name
        `);

        const profiles = result.toArray();
        console.log(`Retrieved ${profiles.length} profiles from database`);

        console.log('Updating statistics...');
        await updateStatistics(profiles);

        console.log('Updating filters...');
        updateFilters(profiles);

        console.log('Initializing grid...');
        const gridDiv = document.getElementById('profileGrid');
        const needsInit = !gridApi || (gridDiv && gridDiv.innerHTML.trim() === '');
        
        if (needsInit) {
            if (gridApi) {
                console.log('Destroying old grid instance before reinitializing');
                try {
                    gridApi.destroy();
                } catch (e) {
                    console.warn('Grid destroy failed:', e);
                }
                gridApi = null;
            }
            initGrid(profiles);
        } else {
            gridApi.setGridOption('rowData', profiles);
        }

        const statsRow = document.getElementById('statsRow');
        const filtersRow = document.getElementById('filtersRow');
        const gridContainer = document.getElementById('gridContainer');
        
        if (statsRow) statsRow.style.display = 'grid';
        if (filtersRow) filtersRow.style.display = 'flex';
        if (gridContainer) gridContainer.style.display = 'flex';

        updatePieChart(profiles);
        updateFilterDisplay();

        console.log('Grid display complete');
    }
    
    async function reloadSelectedRepos() {
        if (!repoStatusGridApi) {
            showError('Please load data first');
            return;
        }

        const selectedRows = repoStatusGridApi.getSelectedRows();
        if (selectedRows.length === 0) {
            showError('Please select at least one repository to reload');
            return;
        }

        const token = getToken();
        if (!token) {
            htmx.ajax('GET', 'fragments/token-form.html?v=2025-02-13-token-sections', {
                target: '#app-content',
                swap: 'innerHTML'
            });
            return;
        }

        showRefreshModal();

        try {
            const selectedRepos = selectedRows.map(row => row.repo);
            console.log(`Reloading ${selectedRepos.length} selected repositories...`);

            // Load existing consolidated data first
            console.log('Loading existing consolidated data...');
            updateRefreshModalProgress('Loading existing consolidated data...');
            const existingData = await loadConsolidatedProfileData() || [];
            
            // Create a map for quick lookup by repo name
            const existingDataMap = new Map();
            existingData.forEach(entry => {
                existingDataMap.set(entry.repo, entry);
            });
            console.log(`Found ${existingData.length} existing entries`);

            const consolidatedData = [];
            let downloaded = 0;
            let updated = 0;
            let failed = 0;
            let newEntries = 0;

            // Process selected repos
            for (let i = 0; i < selectedRepos.length; i++) {
                const repo = selectedRepos[i];
                const displayRepo = repo.replace(/_800\d+$/, '');
                const progressMsg = `Processing ${i + 1}/${selectedRepos.length}: ${displayRepo}`;
                updateRefreshModalProgress(progressMsg);
                console.log(progressMsg);

                // Use shared function to process the repo
                const entry = await processSingleRepoProfile(repo, token);
                
                if (entry.status === 'Success') {
                    downloaded++;
                }

                // Compare timestamps with existing data - only use new data if it's newer
                const existingEntry = existingDataMap.get(repo);
                if (existingEntry && existingEntry.lastUpdated !== 'Unknown' && entry.lastUpdated !== 'Unknown') {
                    const existingTimestamp = new Date(existingEntry.lastUpdated).getTime();
                    const newTimestamp = new Date(entry.lastUpdated).getTime();
                    
                    // Check if resume has been updated
                    const resumeChanged = entry.resumeLastUpdated !== existingEntry.resumeLastUpdated && 
                                         entry.resumeLastUpdated !== 'Unknown';
                    
                    if (newTimestamp > existingTimestamp || resumeChanged) {
                        if (resumeChanged && newTimestamp <= existingTimestamp) {
                            console.log(`  ✓ ${displayRepo}: Resume updated (profile unchanged) - updating entry`);
                        } else {
                            console.log(`  ✓ ${displayRepo}: Using newer data (${entry.lastUpdated} > ${existingEntry.lastUpdated})`);
                        }
                        consolidatedData.push(entry);
                        updated++;
                    } else {
                        console.log(`  ⊘ ${displayRepo}: Keeping existing data (${existingEntry.lastUpdated} >= ${entry.lastUpdated})`);
                        consolidatedData.push(existingEntry);
                    }
                } else if (existingEntry) {
                    // Existing entry exists but one or both timestamps are 'Unknown'
                    if (entry.status === 'Success' && entry.lastUpdated !== 'Unknown') {
                        // New fetch succeeded with valid timestamp - use it
                        console.log(`  ✓ ${displayRepo}: Using new data with valid timestamp`);
                        consolidatedData.push(entry);
                        updated++;
                    } else {
                        // New fetch failed - keep existing, count as failed
                        console.log(`  ⊘ ${displayRepo}: Keeping existing data (new fetch failed)`);
                        consolidatedData.push(existingEntry);
                        failed++;
                    }
                } else {
                    // No existing entry
                    if (entry.status === 'Success') {
                        // New profile found - add it
                        console.log(`  + ${displayRepo}: New entry added`);
                        consolidatedData.push(entry);
                        newEntries++;
                    } else {
                        // No existing entry AND no profile found - count as failed
                        console.log(`  ⊘ ${displayRepo}: No existing data and no profile found - failed to fetch`);
                        failed++;
                    }
                }
                
                // Update stats after processing each repo
                updateRefreshModalStats(`<div class="text-left"><div>Downloaded: ${downloaded}</div><div>Updated: ${updated}</div><div>New: ${newEntries}</div><div>Failed: ${failed}</div></div>`);
            }

            // Merge with non-selected repos from existing data
            console.log('Merging with non-selected repos...');
            for (const existingEntry of existingData) {
                if (!selectedRepos.includes(existingEntry.repo)) {
                    consolidatedData.push(existingEntry);
                }
            }

            console.log(`Selected refresh complete: ${downloaded} fetched, ${updated} updated, ${newEntries} new, ${failed} failed`);
            
            // Only save to GitHub if there were actual changes
            if (updated > 0 || newEntries > 0) {
                console.log('Saving consolidated data to GitHub...');
                updateRefreshModalProgress('Saving consolidated data to GitHub...');
                
                await saveConsolidatedDataToGitHub(consolidatedData);
                
                console.log('Data saved successfully, now loading...');
                updateRefreshModalProgress('Reloading dashboard data...');
                
                // Now load the data we just saved
                await loadData();
                
                // Deselect all rows after successful reload
                repoStatusGridApi.deselectAll();
                
                const failedMsg = failed > 0 ? `, ${failed} failed` : '';
                showRefreshModalComplete(`✓ Successfully refreshed ${selectedRepos.length} selected profiles (${updated} updated, ${newEntries} new${failedMsg})`);
            } else {
                console.log('No changes detected - skipping save');
                
                // Still reload to ensure UI is up to date
                await loadData();
                repoStatusGridApi.deselectAll();
                
                const failedMsg = failed > 0 ? ` (${failed} failed)` : '';
                showRefreshModalComplete(`✓ Refresh complete: No updates needed${failedMsg}`);
            }

        } catch (error) {
            console.error('Error reloading selected repositories:', error);
            showRefreshModalComplete(`❌ Failed to reload selected repositories: ${error.message}`, true);
        }
    }
    
    // ============================================================================
    // GRID MANAGEMENT
    // ============================================================================
    
    function initGrid(rowData) {
        const columnDefs = [
            {
                field: 'student_name',
                headerName: 'Student',
                filter: 'agTextColumnFilter',
                sort: 'asc',
                minWidth: 150
            },
            {
                field: 'graduation_year',
                headerName: 'Year',
                filter: 'agNumberColumnFilter',
                width: 100
            },
            {
                field: 'cs_track',
                headerName: 'Track',
                filter: 'agSetColumnFilter',
                width: 100
            },
            {
                field: 'job_type',
                headerName: 'Type',
                filter: 'agSetColumnFilter',
                width: 100
            },
            {
                field: 'job_status',
                headerName: 'Status',
                filter: 'agSetColumnFilter',
                cellRenderer: (params) => {
                    if (!params.value) return '';
                    let statusClass = 'status-na';
                    if (params.value === 'Yes') statusClass = 'status-have-job';
                    else if (params.value === 'No') statusClass = 'status-no-job';
                    return `<span class="status-badge ${statusClass}">${params.value}</span>`;
                },
                width: 100
            },
            {
                field: 'job',
                headerName: 'Company',
                filter: 'agTextColumnFilter',
                minWidth: 250,
                width: 250
            }
        ];

        const gridOptions = {
            columnDefs: columnDefs,
            rowData: rowData,
            defaultColDef: {
                sortable: true,
                resizable: true,
                filter: true
            },
            pagination: true,
            paginationPageSize: 50,
            paginationPageSizeSelector: [25, 50, 100],
            enableCellTextSelection: true,
            ensureDomOrder: true,
            animateRows: true
        };

        const gridDiv = document.getElementById('profileGrid');
        if (gridDiv) {
            gridApi = agGrid.createGrid(gridDiv, gridOptions);
        }
    }
    
    function initRepoStatusGrid(rowData) {
        console.log('📊 initRepoStatusGrid called');
        console.log('  - rowData length:', rowData.length);
        console.log('  - rowData sample:', rowData[0]);
        
        // Pre-sort the data before creating the grid
        const sortedData = [...rowData].sort((a, b) => {
            // First sort by status: Missing, Failed, Success
            const statusOrder = { 'Missing': 1, 'Failed': 2, 'Success': 3 };
            const statusA = statusOrder[a.status] || 999;
            const statusB = statusOrder[b.status] || 999;
            
            if (statusA !== statusB) {
                return statusA - statusB;
            }
            
            // Then sort by student name
            return (a.studentName || '').localeCompare(b.studentName || '');
        });
        
        const columnDefs = [
            {
                headerName: '',
                checkboxSelection: true,
                headerCheckboxSelection: true,
                width: 20,
                sortable: false,
                filter: false,
                suppressMenu: true,
                suppressSizeToFit: true
            },
            {
                headerName: '',
                width: 50,
                sortable: false,
                filter: false,
                suppressMenu: true,
                suppressSizeToFit: true,
                cellRenderer: (params) => {
                    const isSuccess = params.data.status === 'Success';
                    const icon = isSuccess ? '✎' : '+';
                    const title = isSuccess ? 'Edit Profile' : 'Add Profile';
                    const buttonClass = isSuccess ? 'text-blue-600 hover:text-blue-800' : 'text-green-600 hover:text-green-800';
                    return `<button onclick="window.app.openProfileInProfileTool('${params.data.repo}')" title="${title}" class="${buttonClass} text-lg font-bold transition-colors">${icon}</button>`;
                }
            },
            {
                field: 'studentName',
                headerName: 'Student',
                filter: 'agTextColumnFilter',
                autoHeaderHeight: true,
                wrapHeaderText: true
            },
            {
                field: 'graduationYear',
                headerName: 'Year',
                filter: 'agNumberColumnFilter',
                width: 100,
                cellRenderer: (params) => {
                    // Return empty string for invalid/missing values
                    if (!params.value || params.value === 'Invalid Number' || isNaN(params.value)) {
                        return '';
                    }
                    return params.value;
                },
                autoHeaderHeight: true,
                wrapHeaderText: true
            },
            {
                field: 'status',
                headerName: 'Profile Status',
                filter: 'agSetColumnFilter',
                comparator: (valueA, valueB) => {
                    // Sort order: Missing, Failed, Success
                    const order = { 'Missing': 1, 'Failed': 2, 'Success': 3 };
                    const a = order[valueA] || 999;
                    const b = order[valueB] || 999;
                    return a - b;
                },
                cellRenderer: (params) => {
                    if (!params.value) return '';
                    let statusClass = 'status-no-job';
                    if (params.value === 'Success') statusClass = 'status-have-job';
                    else if (params.value === 'Missing') statusClass = 'status-awaiting';
                    const tooltip = params.value === 'Success' ? '' : (params.data.statusError || '');
                    const titleAttr = tooltip ? ` title="${tooltip.replace(/"/g, '&quot;')}"` : '';
                    return `<span class="status-badge ${statusClass}"${titleAttr}>${params.value}</span>`;
                },
                autoHeaderHeight: true,
                wrapHeaderText: true
            },
            {
                field: 'resumeStatus',
                headerName: 'Resume Status',
                filter: 'agSetColumnFilter',
                cellRenderer: (params) => {
                    if (!params.value) return '';
                    let statusClass = 'status-no-job';
                    if (params.value === 'Found') statusClass = 'status-have-job';
                    else if (params.value === 'Missing') statusClass = 'status-awaiting';
                    const tooltip = params.value === 'Found' ? '' : (params.data.resumeStatusError || '');
                    const titleAttr = tooltip ? ` title="${tooltip.replace(/"/g, '&quot;')}"` : '';
                    return `<span class="status-badge ${statusClass}"${titleAttr}>${params.value}</span>`;
                },
                autoHeaderHeight: true,
                wrapHeaderText: true
            },
            {
                field: 'lastUpdated',
                headerName: 'Profile Last Updated',
                filter: 'agTextColumnFilter',
                cellRenderer: (params) => {
                    if (!params.value || params.value === 'Unknown') return 'Unknown';
                    try {
                        const date = new Date(params.value);
                        const formatted = date.toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        const repo = params.data.repo;
                        const url = `https://github.com/Yeshiva-University-CS/${repo}/blob/yccs-tracker/profile.yml`;
                        return `<a href="${url}" target="_blank" style="color: #667eea; text-decoration: none;">${formatted}</a>`;
                    } catch {
                        return params.value;
                    }
                },
                comparator: (a, b) => {
                    if (a === 'Unknown') return 1;
                    if (b === 'Unknown') return -1;
                    return new Date(a) - new Date(b);
                },
                autoHeaderHeight: true,
                wrapHeaderText: true
            },
            {
                field: 'resumeLastUpdated',
                headerName: 'Resume Last Updated',
                filter: 'agTextColumnFilter',
                cellRenderer: (params) => {
                    if (!params.value || params.value === 'Unknown') return 'Unknown';
                    try {
                        const date = new Date(params.value);
                        const formatted = date.toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        const repo = params.data.repo;
                        const url = `https://github.com/Yeshiva-University-CS/${repo}/blob/yccs-tracker/resume.pdf`;
                        return `<a href="${url}" target="_blank" style="color: #667eea; text-decoration: none;">${formatted}</a>`;
                    } catch {
                        return params.value;
                    }
                },
                comparator: (a, b) => {
                    if (a === 'Unknown') return 1;
                    if (b === 'Unknown') return -1;
                    return new Date(a) - new Date(b);
                },
                autoHeaderHeight: true,
                wrapHeaderText: true
            }
        ];

        const gridOptions = {
            columnDefs: columnDefs,
            rowData: sortedData,
            defaultColDef: {
                sortable: true,
                resizable: true,
                filter: true
            },
            pagination: true,
            paginationPageSize: 50,
            paginationPageSizeSelector: [25, 50, 100],
            enableCellTextSelection: true,
            ensureDomOrder: true,
            animateRows: true,
            rowSelection: 'multiple',
            onSelectionChanged: (event) => {
                const selectedRows = event.api.getSelectedRows();
                const countEl = document.getElementById('selectedRepoCount');
                if (countEl) {
                    countEl.textContent = `${selectedRows.length} selected`;
                }
            },
            onGridReady: (params) => {
                // Auto-size only columns without suppressSizeToFit
                const columnsToResize = params.columnApi
                    .getAllGridColumns()
                    .filter(col => !col.getColDef().suppressSizeToFit)
                    .map(col => col.getColId());
                if (columnsToResize.length > 0) {
                    params.api.autoSizeColumns(columnsToResize, false);
                }
            },
            onGridSizeChanged: (params) => {
                // Auto-resize columns when grid size changes, but skip columns with suppressSizeToFit
                if (params.api) {
                    const allColumns = params.api.getAllGridColumns();
                    const columnsToResize = allColumns
                        .filter(col => {
                            const colDef = col.getColDef();
                            return !colDef.suppressSizeToFit;
                        })
                        .map(col => col.getColId());
                    if (columnsToResize.length > 0) {
                        params.api.autoSizeColumns(columnsToResize, false);
                    }
                }
            }
        };

        const gridDiv = document.getElementById('repoStatusGrid');
        console.log('  - Grid div found:', !!gridDiv);
        if (gridDiv) {
            console.log('  - Grid div dimensions:', gridDiv.offsetWidth, 'x', gridDiv.offsetHeight);
            console.log('  - Creating AG Grid...');
            window.repoStatusGridApi = repoStatusGridApi = agGrid.createGrid(gridDiv, gridOptions);
            console.log('  - AG Grid created:', !!repoStatusGridApi);
            console.log('  - Updating summary...');
            updateRepoStatusSummary(rowData);
            console.log('  - ✅ initRepoStatusGrid complete');
        } else {
            console.error('  - ❌ Grid div not found!');
        }
    }
    
    function updateRepoStatusSummary(rowData) {
        const total = rowData.length;
        const missingProfiles = rowData.filter(r => r.status === 'Missing' || r.status === 'Failed').length;
        const missingResumes = rowData.filter(r => r.resumeStatus === 'Missing' || r.resumeStatus === 'Failed').length;

        // Update individual span elements
        const totalCount = document.getElementById('repoTotalCount');
        const missingProfilesEl = document.getElementById('repoMissingProfiles');
        const missingResumesEl = document.getElementById('repoMissingResumes');
        const summaryElement = document.getElementById('repoStatusSummary');
        
        if (totalCount) totalCount.textContent = total;
        if (missingProfilesEl) missingProfilesEl.textContent = missingProfiles;
        if (missingResumesEl) missingResumesEl.textContent = missingResumes;
        if (summaryElement) summaryElement.classList.remove('hidden');
    }
    
    async function updateStatistics(profiles) {
        const total = profiles.length;

        const notLooking = profiles.filter(p => !p.job_type || p.job_type === 'N/A' || p.job_type === '').length;
        const seeking = total - notLooking;

        const seekingFT = profiles.filter(p => p.job_type === 'FT').length;
        const haveFTJob = profiles.filter(p =>
            p.job_type === 'FT' && p.job_status === 'Yes'
        ).length;

        const seekingIN = profiles.filter(p => p.job_type === 'IN').length;
        const haveINJob = profiles.filter(p =>
            p.job_type === 'IN' && p.job_status === 'Yes'
        ).length;

        const haveAnyJob = profiles.filter(p =>
            (p.job_type === 'FT' || p.job_type === 'IN') && p.job_status === 'Yes'
        ).length;
        const plansFinalized = haveAnyJob + notLooking;

        // Calculate percentages
        const finalizedPercent = total > 0 ? Math.round((plansFinalized / total) * 100) : 0;
        const ftPlacementPercent = seekingFT > 0 ? Math.round((haveFTJob / seekingFT) * 100) : 0;
        const inPlacementPercent = seekingIN > 0 ? Math.round((haveINJob / seekingIN) * 100) : 0;
        
        const statTotal = document.getElementById('statTotal');
        const statPlansFinal = document.getElementById('statPlansFinal');
        const statTotalPercent = document.getElementById('statTotalPercent');
        const statHaveJob = document.getElementById('statHaveJob');
        const statFTJobsNoOffer = document.getElementById('statFTJobsNoOffer');
        const statFTJobsPercent = document.getElementById('statFTJobsPercent');
        const statNoJob = document.getElementById('statNoJob');
        const statInternshipsNoOffer = document.getElementById('statInternshipsNoOffer');
        const statInternshipsPercent = document.getElementById('statInternshipsPercent');
        const notLookingContainer = document.getElementById('notLookingContainer');
        const statNotLookingText = document.getElementById('statNotLookingText');
        
        // Get tile containers for visibility control
        const ftJobsTile = document.getElementById('ftJobsTile');
        const internshipsTile = document.getElementById('internshipsTile');
        
        if (statPlansFinal) statPlansFinal.textContent = plansFinalized;
        if (statTotal) statTotal.textContent = total;
        if (statNotLookingText) {
            statNotLookingText.textContent = `${notLooking} not looking`;
        }
        if (notLookingContainer) {
            notLookingContainer.style.display = notLooking > 0 ? 'block' : 'none';
        }
        if (statTotalPercent) {
            statTotalPercent.textContent = `${finalizedPercent}%`;
            updateBadgeColor(statTotalPercent, finalizedPercent);
        }
        if (statHaveJob) statHaveJob.textContent = haveFTJob;
        if (statFTJobsNoOffer) statFTJobsNoOffer.textContent = `${seekingFT - haveFTJob}`;
        if (statFTJobsPercent) {
            statFTJobsPercent.textContent = `${ftPlacementPercent}%`;
            updateBadgeColor(statFTJobsPercent, ftPlacementPercent);
        }
        if (statNoJob) statNoJob.textContent = haveINJob;
        if (statInternshipsNoOffer) statInternshipsNoOffer.textContent = `${seekingIN - haveINJob}`;
        if (statInternshipsPercent) {
            statInternshipsPercent.textContent = `${inPlacementPercent}%`;
            updateBadgeColor(statInternshipsPercent, inPlacementPercent);
        }
        
        // Show/hide tiles based on counts
        if (ftJobsTile) ftJobsTile.style.display = seekingFT > 0 ? 'block' : 'none';
        if (internshipsTile) internshipsTile.style.display = seekingIN > 0 ? 'block' : 'none';
    }
    
    function updateBadgeColor(badgeElement, percentage) {
        // Remove all color classes
        badgeElement.classList.remove('stat-badge-red', 'stat-badge-amber', 'stat-badge-green');
        
        // Add appropriate color class based on percentage
        if (percentage < 50) {
            badgeElement.classList.add('stat-badge-red');
        } else if (percentage < 80) {
            badgeElement.classList.add('stat-badge-amber');
        } else {
            badgeElement.classList.add('stat-badge-green');
        }
    }
    
    function updateFilters(profiles) {
        // No longer populating graduation year filter since it's controlled by dashboard tabs
        // Keeping function for potential future filter additions
    }
    
    async function applyFilters() {
        if (!conn) {
            console.warn('Database connection not available for filtering');
            return;
        }

        try {
            // Collect checked values for each filter group
            const trackCheckboxes = document.querySelectorAll('[id^="filterTrack_"]:checked');
            const tracks = Array.from(trackCheckboxes).map(cb => cb.value);

            const jobStatusCheckboxes = document.querySelectorAll('[id^="filterJobStatus_"]:checked');
            const jobStatuses = Array.from(jobStatusCheckboxes).map(cb => cb.value);

            const jobTypeCheckboxes = document.querySelectorAll('[id^="filterSeeking_"]:checked');
            const jobTypes = Array.from(jobTypeCheckboxes).map(cb => cb.value);

            let query = `
                SELECT p.repo, p.student_name, p.yuid, p.graduation_year, p.cs_track, p.email, p.whatsapp,
                    COALESCE(js.seeking, '') as job_type,
                    CASE WHEN js.job_status = 'YES' THEN 'Yes' WHEN js.job_status = 'NO' THEN 'No' ELSE COALESCE(js.job_status, '') END as job_status,
                    CASE WHEN js.full_time_company IS NULL OR js.full_time_company = 'None' THEN '' ELSE js.full_time_company END as job
                FROM profiles p
                LEFT JOIN job_search js ON p.yuid = js.yuid AND js.recruiting_year = ${currentDashboardYear}
                WHERE p.graduation_year >= ${currentDashboardYear} AND p.cs_track IN ('AI', 'DIS', 'BA')`;

            // Add track filter if not all are selected
            if (tracks.length > 0 && tracks.length < 3) {
                const trackConditions = tracks.map(t => `p.cs_track = '${t.replace(/'/g, "''")}'`).join(' OR ');
                query += ` AND (${trackConditions})`;
            }

            // Add job status filter if not all are selected
            if (jobStatuses.length > 0 && jobStatuses.length < 2) {
                const statusConditions = jobStatuses.map(s => {
                    const dbVal = s === 'Yes' ? 'YES' : 'NO';
                    return `js.job_status = '${dbVal}'`;
                }).join(' OR ');
                query += ` AND (${statusConditions})`;
            }

            // Add job type filter if not all are selected
            if (jobTypes.length > 0 && jobTypes.length < 2) {
                const typeConditions = jobTypes.map(t => `js.seeking = '${t.replace(/'/g, "''")}'`).join(' OR ');
                query += ` AND (${typeConditions})`;
            }

            query += ' ORDER BY p.student_name';

            const result = await conn.query(query);
            const filteredProfiles = result.toArray();

            if (gridApi) {
                gridApi.setGridOption('rowData', filteredProfiles);
            }

            // For statistics, only apply track filter
            let statsQuery = `
                SELECT p.repo, p.student_name, p.yuid, p.graduation_year, p.cs_track, p.email, p.whatsapp,
                    COALESCE(js.seeking, '') as job_type,
                    CASE WHEN js.job_status = 'YES' THEN 'Yes' WHEN js.job_status = 'NO' THEN 'No' ELSE COALESCE(js.job_status, '') END as job_status,
                    CASE WHEN js.full_time_company IS NULL OR js.full_time_company = 'None' THEN '' ELSE js.full_time_company END as job
                FROM profiles p
                LEFT JOIN job_search js ON p.yuid = js.yuid AND js.recruiting_year = ${currentDashboardYear}
                WHERE p.graduation_year >= ${currentDashboardYear} AND p.cs_track IN ('AI', 'DIS', 'BA')`;

            if (tracks.length > 0 && tracks.length < 3) {
                const trackConditions = tracks.map(t => `p.cs_track = '${t.replace(/'/g, "''")}'`).join(' OR ');
                statsQuery += ` AND (${trackConditions})`;
            }

            const statsResult = await conn.query(statsQuery);
            const allProfiles = statsResult.toArray();

            updateStatistics(allProfiles);
            updatePieChart(allProfiles);
            updateFilterDisplay();
        } catch (error) {
            console.error('Error applying filters:', error);
            showError('Failed to apply filters: ' + error.message);
        }
    }
    
    function updateFilterDisplay() {
        const display = document.getElementById('activeFiltersDisplay');
        if (!display) return;
        
        const jobStatuses = Array.from(document.querySelectorAll('[id^="filterJobStatus_"]:checked')).map(cb => cb.value);
        const jobTypes = Array.from(document.querySelectorAll('[id^="filterSeeking_"]:checked')).map(cb => cb.value === 'IN' ? 'Internship' : 'Full Time');
        const tracks = Array.from(document.querySelectorAll('[id^="filterTrack_"]:checked')).map(cb => cb.value);
        
        const parts = [];
        if (jobStatuses.length > 0) parts.push(jobStatuses.join(', '));
        if (jobTypes.length > 0) parts.push(jobTypes.join(', '));
        if (tracks.length > 0) parts.push(tracks.join(', '));
        
        display.textContent = parts.length > 0 ? parts.join('   |   ') : 'No filters active';
    }
    
    function handleFilterChange(checkbox, groupPrefix) {
        // Count how many checkboxes are checked in this group
        const checkedInGroup = document.querySelectorAll(`[id^="${groupPrefix}"]:checked`).length;
        
        // If trying to uncheck the last checkbox, prevent it
        if (!checkbox.checked && checkedInGroup === 0) {
            checkbox.checked = true;
            return;
        }
        
        // Otherwise, apply the filters
        applyFilters();
        updateFilterDisplay();
    }
    
    // ============================================================================
    // DYNAMIC YEAR TABS
    // ============================================================================

    function updateDashboardTitle() {
        const titleEl = document.getElementById('dashboardTitle');
        if (titleEl) {
            titleEl.textContent = `${currentDashboardYear} Recruiting Cycle`;
        }
    }

    async function renderYearTabs() {
        const container = document.getElementById('dashboardYearTabs');
        if (!container) return;

        let years = [];
        if (conn) {
            try {
                const result = await conn.query(`
                    SELECT DISTINCT graduation_year FROM profiles
                    WHERE graduation_year IS NOT NULL AND cs_track IN ('AI', 'DIS', 'BA')
                    ORDER BY graduation_year
                `);
                years = result.toArray().map(r => r.graduation_year);
            } catch (e) {
                console.warn('Could not query years for tabs:', e);
            }
        }

        // Ensure current dashboard year is included, and at minimum show current calendar year
        const calYear = new Date().getFullYear();
        if (!years.includes(calYear)) years.push(calYear);
        if (!years.includes(currentDashboardYear)) years.push(currentDashboardYear);
        years = [...new Set(years)].sort((a, b) => a - b);

        // Generate one tab per year where the dashboard makes sense (year >= earliest grad year minus 1)
        const dashboardYears = years.filter(y => y >= calYear);

        container.innerHTML = '';
        for (const year of dashboardYears) {
            const isActive = year === currentDashboardYear;
            const btn = document.createElement('button');
            btn.className = `tab-button flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${isActive ? 'text-white bg-blue-600' : 'text-gray-700 hover:bg-gray-100'}`;
            btn.setAttribute('data-year', year);
            btn.innerHTML = `
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                <span>${year} Dashboard</span>
            `;
            btn.addEventListener('click', function () {
                // Update Alpine.js state via dispatch
                window.dispatchEvent(new CustomEvent('set-dashboard-view', { detail: true }));
                // Activate button styling
                document.querySelectorAll('.tab-button').forEach(b => {
                    b.classList.remove('bg-blue-600', 'text-white');
                    b.classList.add('text-gray-700', 'hover:bg-gray-100');
                });
                this.classList.remove('text-gray-700', 'hover:bg-gray-100');
                this.classList.add('bg-blue-600', 'text-white');
                // Load dashboard content then switch
                htmx.ajax('GET', 'fragments/dashboard-content.html?v=2025-02-09-header-summary', {
                    target: '#tab-container',
                    swap: 'innerHTML'
                }).then(() => {
                    window.app.switchTab('dashboard', year);
                });
            });
            container.appendChild(btn);
        }

        updateDashboardTitle();
    }

    // ============================================================================
    // CHART MANAGEMENT
    // ============================================================================
    
    function updatePieChart(profiles) {
        const ftWithJobs = profiles.filter(p => p.job_type === 'FT' && p.job_status === 'Yes').length;
        const inWithJobs = profiles.filter(p => p.job_type === 'IN' && p.job_status === 'Yes').length;
        const notLooking = profiles.filter(p => !p.job_type || p.job_type === 'N/A' || p.job_type === '').length;
        const lookingNoJob = profiles.filter(p =>
            (p.job_type === 'FT' || p.job_type === 'IN') &&
            (p.job_status === 'No' || p.job_status === '')
        ).length;

        const canvas = document.getElementById('jobTypeChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');

        if (pieChart) {
            pieChart.destroy();
        }

        pieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Full Time', 'Internship', 'Looking', 'Not Looking'],
                datasets: [{
                    data: [ftWithJobs, inWithJobs, lookingNoJob, notLooking],
                    backgroundColor: [
                        '#52AB5F',
                        '#a7f3d0',
                        '#f56565',
                        '#a0aec0'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // ============================================================================
    // EXPORT FUNCTIONS
    // ============================================================================
    
    function exportToCSV() {
        if (!gridApi) {
            showError('No data to export');
            return;
        }

        try {
            const displayedRows = [];
            gridApi.forEachNodeAfterFilterAndSort(node => {
                displayedRows.push(node.data);
            });

            if (displayedRows.length === 0) {
                showError('No data to export');
                return;
            }

            const headers = ['First Name', 'Last Name', 'YUID', 'Graduation Year', 'CS Track', 'Email', 'WhatsApp', 'Job Type', 'Job Status', 'Company'];
            const csvRows = [headers.join(',')];

            displayedRows.forEach(row => {
                const nameParts = (row.student_name || '').split(', ');
                const lastName = nameParts[0] || '';
                const firstName = nameParts[1] || '';

                const values = [
                    escapeCsvValue(firstName),
                    escapeCsvValue(lastName),
                    row.yuid || '',
                    row.graduation_year || '',
                    escapeCsvValue(row.cs_track || ''),
                    escapeCsvValue(row.email || ''),
                    escapeCsvValue(row.whatsapp || ''),
                    escapeCsvValue(row.job_type || ''),
                    escapeCsvValue(row.job_status || ''),
                    escapeCsvValue(row.job || '')
                ];
                csvRows.push(values.join(','));
            });

            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `student_profiles_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showSuccess(`Exported ${displayedRows.length} profiles to CSV`);
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            showError('Failed to export data: ' + error.message);
        }
    }
    
    function escapeCsvValue(value) {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return '"' + stringValue.replace(/"/g, '""') + '"';
        }
        return stringValue;
    }
    
    async function downloadResumes() {
        if (!gridApi) {
            showError('No data to export');
            return;
        }

        const token = getToken();
        if (!token) {
            showError('GitHub token required to download resumes');
            return;
        }

        const resumeBtn = document.getElementById('resumeBtn');
        if (resumeBtn) {
            resumeBtn.disabled = true;
            resumeBtn.textContent = '⏳';
        }

        try {
            const displayedRows = [];
            gridApi.forEachNodeAfterFilterAndSort(node => {
                displayedRows.push(node.data);
            });

            if (displayedRows.length === 0) {
                showError('No students to download resumes for');
                if (resumeBtn) {
                    resumeBtn.disabled = false;
                    resumeBtn.textContent = '📄';
                }
                return;
            }

            showSuccess(`Starting download of ${displayedRows.length} resumes...`);

            const zip = new JSZip();
            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < displayedRows.length; i++) {
                const row = displayedRows[i];
                const repo = row.repo;

                const nameParts = (row.student_name || '').split(', ');
                const lastName = nameParts[0] || 'Unknown';
                const firstName = nameParts[1] || 'Student';
                const filename = `${lastName}_${firstName}_resume.pdf`;

                updateLoadingProgress(`Downloading ${i + 1}/${displayedRows.length}: ${firstName} ${lastName}`);

                try {
                    const resumePath = 'resume.pdf';
                    const url = `https://api.github.com/repos/Yeshiva-University-CS/${repo}/contents/${resumePath}?ref=yccs-tracker`;

                    const metadataResponse = await fetch(url, {
                        headers: {
                            'Authorization': `token ${token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });

                    if (metadataResponse.ok) {
                        const metadata = await metadataResponse.json();
                        if (!metadata.sha) {
                            console.warn(`No SHA for resume in ${row.student_name} (${repo})`);
                            failCount++;
                            continue;
                        }
                        const blobUrl = `https://api.github.com/repos/Yeshiva-University-CS/${repo}/git/blobs/${metadata.sha}`;
                        const blobResponse = await fetch(blobUrl, {
                            headers: {
                                'Authorization': `token ${token}`,
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });
                        if (blobResponse.ok) {
                            const blobData = await blobResponse.json();
                            if (!blobData.content) {
                                console.warn(`No content in blob for ${row.student_name} (${repo})`);
                                failCount++;
                                continue;
                            }
                            const cleanBase64 = blobData.content.replace(/\r?\n|\s/g, "");
                            const binaryString = atob(cleanBase64);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            zip.file(filename, bytes, { binary: true });
                            console.log(`✓ Added ${filename} to zip`);
                            successCount++;
                        } else {
                            console.warn(`Failed to fetch blob for ${row.student_name} (${repo}): ${blobResponse.status}`);
                            failCount++;
                            continue;
                        }
                    } else {
                        console.warn(`Resume not found for ${row.student_name} (${repo}): ${metadataResponse.status}`);
                        failCount++;
                        continue;
                    }
                } catch (error) {
                    console.error(`Error downloading resume for ${row.student_name}:`, error);
                    failCount++;
                }
            }

            if (successCount === 0) {
                showError('No resumes were found to download');
                if (resumeBtn) {
                    resumeBtn.disabled = false;
                    resumeBtn.textContent = '📄';
                }
                return;
            }

            updateLoadingProgress('Creating zip file...');
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 },
                mimeType: 'application/zip'
            });

            const link = document.createElement('a');
            const url = URL.createObjectURL(zipBlob);

            link.setAttribute('href', url);
            link.setAttribute('download', `student_resumes_${new Date().toISOString().split('T')[0]}.zip`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            let message = `Downloaded ${successCount} resume${successCount !== 1 ? 's' : ''}`;
            if (failCount > 0) {
                message += ` (${failCount} not found)`;
            }
            showSuccess(message);

        } catch (error) {
            console.error('Error downloading resumes:', error);
            showError('Failed to download resumes: ' + error.message);
        } finally {
            if (resumeBtn) {
                resumeBtn.disabled = false;
                resumeBtn.textContent = '📄';
            }
            updateLoadingProgress('');
        }
    }
    
    // ============================================================================
    // EXPOSE API
    // ============================================================================
    
    window.app = {
        saveToken,
        clearToken,
        getToken,
        loadData,
        refreshDataFromRepos,
        closeRefreshModal,
        applyFilters,
        handleFilterChange,
        exportToCSV,
        downloadResumes,
        reloadSelectedRepos,
        switchTab,
        showError,
        showSuccess
    };
    
    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    
    document.addEventListener('DOMContentLoaded', async () => {
        const token = getToken();
        console.log('DOMContentLoaded - Token retrieved:', token ? token.substring(0, 10) + '...' : 'null');
        const appContent = document.getElementById('app-content');
        
        if (token) {
            console.log('✅ Token found, auto-loading dashboard...');
            
            // Create dashboard container
            if (appContent) {
                appContent.innerHTML = `
                    <div id="loadingIndicator" class="rounded-lg bg-white p-8 text-center shadow">
                        <div class="spinner mx-auto"></div>
                        <p class="mt-4 text-gray-600">Loading student profiles...</p>
                        <p id="loadingProgress" class="mt-2 text-sm text-gray-500"></p>
                    </div>
                    <div id="tab-container"></div>
                `;
            }
            
            // Use HTMX to load dashboard content, then load the data
            htmx.ajax('GET', 'fragments/dashboard-content.html?v=2025-02-09-header-summary', {
                target: '#tab-container',
                swap: 'innerHTML'
            }).then(() => {
                console.log('Dashboard fragment loaded, now loading data...');
                loadData();
            });
        } else {
            console.log('❌ No token found, loading token form...');
            // Load token form if no token exists
            htmx.ajax('GET', 'fragments/token-form.html?v=2025-02-13-token-sections', {
                target: '#app-content',
                swap: 'innerHTML'
            });
        }
    });
    
    // ============================================================================
    // WINDOW RESIZE HANDLER
    // ============================================================================
    
    // Window resize handler - handles both shrinking AND expanding
    // Uses column definition refresh to properly handle AG Grid flex columns
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Dashboard grid - refresh column defs to handle flex expansion
            if (gridApi) {
                try {
                    // Refresh column definitions to force AG Grid to recalculate flex columns
                    const currentColumnDefs = gridApi.getColumnDefs();
                    gridApi.setGridOption('columnDefs', currentColumnDefs);
                } catch (e) { 
                    console.warn('Grid resize error:', e);
                }
            }
            
            // Repo status grid
            if (repoStatusGridApi) {
                try {
                    const allColumnIds = repoStatusGridApi.getAllGridColumns().map(col => col.getColId());
                    repoStatusGridApi.autoSizeColumns(allColumnIds, false);
                } catch (e) {
                    console.warn('Repo grid resize error:', e);
                }
            }
            
            // Chart
            if (pieChart) {
                try {
                    pieChart.resize();
                } catch (e) {
                    console.warn('Chart resize error:', e);
                }
            }
        }, 100);
    });
    
    // Open Profile Tool in a new tab for the given repo
    window.app.openProfileInProfileTool = function(repo) {
        const url = '../profile/?repo=' + encodeURIComponent(repo);
        window.open(url, '_blank');
    };

    window.app.startTime = Date.now();
    console.log('HTMX App initialized - window.app available');
    
})();
