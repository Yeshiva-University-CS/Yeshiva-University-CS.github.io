(function () {
    'use strict';

    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------
    let internshipCount = 0;
    let originalLoadedData = null;
    const currentYear = new Date().getFullYear();

    // ---------------------------------------------------------------------------
    // Token / Account Management
    // ---------------------------------------------------------------------------
    function getToken() {
        return localStorage.getItem('github_token');
    }

    async function saveToken() {
        const input = document.getElementById('githubToken');
        const errorDiv = document.getElementById('tokenError');
        const token = (input ? input.value : '').trim();

        errorDiv.classList.add('hidden');
        errorDiv.textContent = '';

        if (!token) {
            errorDiv.textContent = 'Please enter a token.';
            errorDiv.classList.remove('hidden');
            return;
        }
        if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
            errorDiv.textContent = 'Token must start with ghp_ or github_pat_';
            errorDiv.classList.remove('hidden');
            return;
        }

        localStorage.setItem('github_token', token);
        await loadProfileForm();
    }

    function disconnectAccount() {
        localStorage.removeItem('github_token');
        localStorage.removeItem('github_repo');
        originalLoadedData = null;
        internshipCount = 0;
        updateConnectionStatus(null);
        updateProfileFileBadge(false);
        loadSettingsForm();
    }

    // ---------------------------------------------------------------------------
    // Repo Management
    // ---------------------------------------------------------------------------
    function getRepo() {
        return localStorage.getItem('github_repo');
    }

    function saveRepo(repo) {
        localStorage.setItem('github_repo', repo);
    }

    function clearSavedRepo() {
        localStorage.removeItem('github_repo');
    }

    async function linkRepo() {
        const repoInput = document.getElementById('repoName');
        const repo = repoInput ? repoInput.value.trim() : '';
        const token = getToken();

        if (!repo) {
            showRepoStatus('Please enter a repository name.', true);
            return;
        }
        if (!token) {
            disconnectAccount();
            return;
        }
        await validateRepoAccess(repo, token);
    }

    function unlinkRepo() {
        clearSavedRepo();
        originalLoadedData = null;

        // Show link section, hide banners
        const repoLinkSection = document.getElementById('repoLinkSection');
        const linkedRepoDisplay = document.getElementById('linkedRepoDisplay');
        const profileFileStatus = document.getElementById('profileFileStatus');
        const repoInput = document.getElementById('repoName');

        if (repoLinkSection) repoLinkSection.classList.remove('hidden');
        if (linkedRepoDisplay) linkedRepoDisplay.classList.add('hidden');
        if (profileFileStatus) {
            profileFileStatus.classList.add('hidden');
            profileFileStatus.innerHTML = '';
        }
        if (repoInput) repoInput.value = '';

        // Reset form
        resetForm();
    }

    // ---------------------------------------------------------------------------
    // GitHub API
    // ---------------------------------------------------------------------------
    async function validateRepoAccess(repo, token) {
        showRepoStatus('Validating repository access...', false);

        try {
            const repoUrl = `https://api.github.com/repos/Yeshiva-University-CS/${repo}`;
            const repoResponse = await fetch(repoUrl, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!repoResponse.ok) {
                const fullUrl = `https://github.com/Yeshiva-University-CS/${repo}/tree/yccs-tracker`;
                showRepoStatus(
                    `Could not access repo: <a href="${fullUrl}" target="_blank" class="underline">view on GitHub</a>`,
                    true, true
                );
                clearSavedRepo();
                return false;
            }

            // Repo accessible — save it and update UI
            saveRepo(repo);
            showLinkedRepoBanner(repo);

            // Now check for profile.yml
            await checkProfileFile(repo, token);
            return true;
        } catch (err) {
            showRepoStatus(`Error: ${err.message}`, true);
            clearSavedRepo();
            return false;
        }
    }

    function updateProfileFileBadge(found, filename) {
        const badge = document.getElementById('profileFileBadge');
        if (!badge) return;
        if (found) {
            if (filename) {
                const label = document.getElementById('fileBadgeText');
                if (label) label.textContent = `@yccs-tracker/${filename}`;
            }
            badge.classList.remove('hidden');
            badge.classList.add('flex');
        } else {
            badge.classList.remove('flex');
            badge.classList.add('hidden');
            hideFileLastUpdated();
        }
    }

    async function checkProfileFile(repo, token) {
        const statusDiv = document.getElementById('profileFileStatus');

        try {
            const url = `https://api.github.com/repos/Yeshiva-University-CS/${repo}/contents/profile.yml?ref=yccs-tracker`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3.raw'
                }
            });

            if (response.ok) {
                const text = await response.text();
                if (text.trim()) {
                    try {
                        const data = jsyaml.load(text);
                        if (data && data.student_profile) {
                            updateProfileFileBadge(true, 'profile.yml');
                            if (statusDiv) statusDiv.classList.add('hidden');
                            populateForm(data.student_profile);
                            fetchFileLastUpdated(repo, token, 'profile.yml');
                        } else {
                            updateProfileFileBadge(false);
                            if (statusDiv) {
                                statusDiv.className = 'text-sm mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700';
                                statusDiv.textContent = 'Invalid YAML: expected "student_profile" root element.';
                            }
                        }
                    } catch (yamlErr) {
                        updateProfileFileBadge(false);
                        if (statusDiv) {
                            statusDiv.className = 'text-sm mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700';
                            statusDiv.textContent = 'Error parsing YAML: ' + yamlErr.message;
                        }
                    }
                } else {
                    updateProfileFileBadge(false);
                    if (statusDiv) {
                        statusDiv.className = 'text-sm mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700';
                        statusDiv.textContent = 'Profile file is empty.';
                    }
                }
            } else {
                updateProfileFileBadge(false);
                if (statusDiv) {
                    statusDiv.className = 'text-sm mb-4 text-gray-500';
                    statusDiv.textContent = 'No profile file yet — fill in the form below to create one.';
                }
            }
        } catch (err) {
            updateProfileFileBadge(false);
            if (statusDiv) {
                statusDiv.className = 'text-sm mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700';
                statusDiv.textContent = 'Error checking profile: ' + err.message;
            }
        }
    }

    // ---------------------------------------------------------------------------
    // UI Helpers
    // ---------------------------------------------------------------------------
    function showRepoStatus(message, isError, isHtml = false) {
        const el = document.getElementById('repoStatusMsg');
        if (!el) return;
        el.classList.remove('hidden', 'text-red-600', 'text-gray-500');
        el.classList.add(isError ? 'text-red-600' : 'text-gray-500');
        if (isHtml) {
            el.innerHTML = message;
        } else {
            el.textContent = message;
        }
    }

    function showLinkedRepoBanner(repo) {
        const repoLinkSection = document.getElementById('repoLinkSection');
        const linkedRepoDisplay = document.getElementById('linkedRepoDisplay');
        const linkedRepoName = document.getElementById('linkedRepoName');

        if (repoLinkSection) repoLinkSection.classList.add('hidden');
        if (linkedRepoDisplay) {
            linkedRepoDisplay.classList.remove('hidden');
            linkedRepoDisplay.classList.add('flex');
        }
        if (linkedRepoName) linkedRepoName.textContent = repo;
    }

    // ---------------------------------------------------------------------------
    // Form Population
    // ---------------------------------------------------------------------------
    function populateForm(data) {
        originalLoadedData = JSON.parse(JSON.stringify(data));

        // Clear existing internships
        const internshipsList = document.getElementById('internshipsList');
        if (internshipsList) internshipsList.innerHTML = '';
        internshipCount = 0;

        // Basic fields
        setVal('yuid', data.yuid);
        setVal('first_name', data.first_name ? capitalizeFirstLetter(data.first_name) : '');
        setVal('last_name', data.last_name ? capitalizeFirstLetter(data.last_name) : '');
        setVal('graduation_year', data.graduation_year);
        setVal('cs_track', data.cs_track);
        setVal('yu_email', data.yu_email);
        setVal('email', data.email || '');
        setVal('whatsapp', data.whatsapp ? formatWhatsApp(data.whatsapp) : '');
        setVal('seeking', data.seeking);

        // Job status
        const jobStatusSelect = document.getElementById('job_status');
        if (jobStatusSelect) {
            if (data.seeking === 'N/A' || !data.seeking) {
                jobStatusSelect.disabled = true;
                jobStatusSelect.value = 'N/A';
            } else if (data.seeking === 'IN' || data.seeking === 'FT') {
                jobStatusSelect.disabled = false;
                jobStatusSelect.value = data.job_status || '';
                if (!data.job_status) {
                    jobStatusSelect.disabled = true;
                    jobStatusSelect.value = 'N/A';
                }
            } else {
                jobStatusSelect.disabled = true;
                jobStatusSelect.value = 'N/A';
            }
        }

        // Company
        const companyInput = document.getElementById('company');
        if (companyInput) {
            if (data.job_status === 'YES') {
                companyInput.disabled = false;
                const loaded = (data.company || '').trim();
                companyInput.value = (loaded.toLowerCase() === 'n/a' || loaded.toLowerCase() === 'na') ? '' : loaded;
            } else {
                companyInput.disabled = true;
                companyInput.value = 'N/A';
            }
        }

        // Internships
        if (data.internships) {
            for (const [year, company] of Object.entries(data.internships)) {
                addInternship(year, company);
            }
        }

        // Disable check-in until changes are detected
        const checkinBtn = document.getElementById('checkinBtn');
        if (checkinBtn) checkinBtn.disabled = true;
        setupChangeDetection();
    }

    function setVal(id, value) {
        const el = document.getElementById(id);
        if (el && value !== undefined && value !== null) el.value = value;
    }

    function resetForm() {
        const form = document.getElementById('profileForm');
        if (form) form.reset();
        const internshipsList = document.getElementById('internshipsList');
        if (internshipsList) internshipsList.innerHTML = '';
        internshipCount = 0;
        originalLoadedData = null;

        const companyInput = document.getElementById('company');
        if (companyInput) { companyInput.disabled = true; companyInput.value = 'N/A'; }
        const jobStatusSelect = document.getElementById('job_status');
        if (jobStatusSelect) { jobStatusSelect.disabled = true; jobStatusSelect.value = 'N/A'; }

        const checkinBtn = document.getElementById('checkinBtn');
        if (checkinBtn) checkinBtn.disabled = false;

        const validationResults = document.getElementById('validationResults');
        if (validationResults) validationResults.classList.add('hidden');
        const yamlPreview = document.getElementById('yamlPreview');
        if (yamlPreview) yamlPreview.classList.add('hidden');
    }

    // ---------------------------------------------------------------------------
    // Change Detection
    // ---------------------------------------------------------------------------
    function setupChangeDetection() {
        const form = document.getElementById('profileForm');
        if (!form) return;
        form.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('input', checkForChanges);
            el.addEventListener('change', checkForChanges);
        });
        const internshipsList = document.getElementById('internshipsList');
        if (internshipsList) {
            new MutationObserver(checkForChanges).observe(internshipsList, { childList: true, subtree: true });
        }
    }

    function checkForChanges() {
        const checkinBtn = document.getElementById('checkinBtn');
        if (!checkinBtn) return;
        if (!originalLoadedData) {
            checkinBtn.disabled = false;
            return;
        }
        const currentData = getFormData();
        const currentEntryCount = document.querySelectorAll('.internship-entry').length;
        const originalFilledCount = originalLoadedData.internships ? Object.keys(originalLoadedData.internships).length : 0;
        const hasChanges = currentEntryCount !== originalFilledCount || JSON.stringify(currentData) !== JSON.stringify(originalLoadedData);
        checkinBtn.disabled = !hasChanges;
    }

    // ---------------------------------------------------------------------------
    // Internship Management
    // ---------------------------------------------------------------------------
    function addInternship(prefillYear, prefillCompany) {
        const list = document.getElementById('internshipsList');
        if (!list) return;
        const id = internshipCount++;
        const div = document.createElement('div');
        div.className = 'flex gap-2 internship-entry items-start';
        div.id = `internship-${id}`;
        div.innerHTML = `
            <div class="w-20 flex-shrink-0">
                <input type="text" placeholder="${currentYear}" maxlength="4"
                       value="${prefillYear || ''}"
                       class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm internship-year focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <div class="text-xs text-red-600 mt-1 hidden internship-year-error"></div>
            </div>
            <div class="flex-1">
                <input type="text" placeholder="Company"
                       value="${prefillCompany || ''}"
                       class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm internship-company focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <div class="text-xs text-red-600 mt-1 hidden internship-company-error"></div>
            </div>
            <button type="button" onclick="window.profile.removeInternship(${id})"
                    class="px-2 py-1.5 text-red-600 hover:text-red-800 text-xs font-medium transition-colors mt-0.5">
                ✕
            </button>
        `;
        list.appendChild(div);

        // Real-time year validation
        div.querySelector('.internship-year').addEventListener('blur', function () {
            validateInternshipYearField(div);
        });
    }

    function removeInternship(id) {
        const el = document.getElementById(`internship-${id}`);
        if (el) el.remove();
    }

    function validateInternshipYearField(div) {
        const yearInput = div.querySelector('.internship-year');
        const yearError = div.querySelector('.internship-year-error');
        if (!yearInput || !yearError) return;
        const year = yearInput.value.trim();
        if (!year) {
            yearInput.classList.remove('border-red-500');
            yearError.classList.add('hidden');
            return;
        }
        const err = validateInternshipYear(year);
        if (err) {
            yearInput.classList.add('border-red-500');
            yearError.textContent = err;
            yearError.classList.remove('hidden');
        } else {
            yearInput.classList.remove('border-red-500');
            yearError.classList.add('hidden');
        }
    }

    // ---------------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------------
    function validateYUID(yuid) {
        const s = String(yuid);
        if (isNaN(parseInt(s))) return 'YUID must be a number';
        if (s.length !== 9) return 'YUID must be exactly 9 digits';
        if (!s.startsWith('800')) return 'YUID must start with 800';
        return null;
    }

    function validateName(name, fieldName) {
        if (!name || name.trim() === '') return `${fieldName} is required`;
        if (name.length < 2) return `${fieldName} must be at least 2 characters`;
        if (!/^[a-zA-Z\s\-']+$/.test(name)) return `${fieldName} must contain only letters, spaces, hyphens, and apostrophes`;
        return null;
    }

    function validateGradYear(year) {
        const y = parseInt(year);
        if (isNaN(y)) return 'Graduation year must be a number';
        if (y < 2026) return 'Graduation year must be 2026 or later';
        return null;
    }

    function validateEmail(email) {
        if (!email) return null;
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!re.test(email)) return 'Invalid email format';
        return null;
    }

    function validateYUEmail(email) {
        if (!email.endsWith('@mail.yu.edu')) return 'Must be a @mail.yu.edu email address';
        const re = /^[a-zA-Z0-9._%+-]+@mail\.yu\.edu$/;
        if (!re.test(email)) return 'Invalid YU email format';
        return null;
    }

    function validateWhatsApp(phone) {
        if (!phone || phone.trim() === '') return 'Cell/WhatsApp number is required';
        const digits = phone.replace(/[^\d]/g, '');
        if (digits.length < 7 || digits.length > 15) return 'Phone number must be between 7 and 15 digits';
        const isUS = /^\(\d{3}\)\s\d{3}-\d{4}$/.test(phone);
        const isIntl = /^\+\d{7,15}$/.test(phone);
        if (!isUS && !isIntl) return 'Use (123) 456-7890 or +[country code][number]';
        return null;
    }

    function validateInternshipYear(year) {
        if (!year) return 'Year is required';
        if (!/^\d{4}$/.test(year)) return 'Year must be exactly 4 digits';
        const y = parseInt(year);
        if (y > currentYear) return `Year cannot be in the future (current year is ${currentYear})`;
        if (y < 1900) return 'Year must be 1900 or later';
        return null;
    }

    function validateForm() {
        const errors = [];
        let isValid = true;

        // Clear previous errors
        document.querySelectorAll('#profileForm .border-red-500').forEach(el => el.classList.remove('border-red-500'));
        document.querySelectorAll('#profileForm [id$="-error"]').forEach(el => {
            el.classList.add('hidden');
            el.textContent = '';
        });
        document.querySelectorAll('.internship-year-error, .internship-company-error').forEach(el => {
            el.classList.add('hidden');
        });

        function fieldError(inputId, errorId, msg) {
            errors.push(msg);
            const input = document.getElementById(inputId);
            const err = document.getElementById(errorId);
            if (input) input.classList.add('border-red-500');
            if (err) { err.textContent = msg; err.classList.remove('hidden'); }
            isValid = false;
        }

        // YUID
        const yuid = document.getElementById('yuid')?.value || '';
        const yuidErr = validateYUID(yuid);
        if (yuidErr) fieldError('yuid', 'yuid-error', yuidErr);

        // First Name
        const firstNameInput = document.getElementById('first_name');
        if (firstNameInput) {
            firstNameInput.value = capitalizeFirstLetter(firstNameInput.value.trim());
            const err = validateName(firstNameInput.value, 'First name');
            if (err) fieldError('first_name', 'first_name-error', err);
        }

        // Last Name
        const lastNameInput = document.getElementById('last_name');
        if (lastNameInput) {
            lastNameInput.value = capitalizeFirstLetter(lastNameInput.value.trim());
            const err = validateName(lastNameInput.value, 'Last name');
            if (err) fieldError('last_name', 'last_name-error', err);
        }

        // Graduation Year
        const gradYear = document.getElementById('graduation_year')?.value || '';
        const gradYearErr = validateGradYear(gradYear);
        if (gradYearErr) fieldError('graduation_year', 'graduation_year-error', gradYearErr);

        // CS Track
        const csTrack = document.getElementById('cs_track')?.value || '';
        if (!csTrack) fieldError('cs_track', 'cs_track-error', 'Please select a CS track');

        // YU Email
        const yuEmail = document.getElementById('yu_email')?.value || '';
        const yuEmailErr = validateYUEmail(yuEmail);
        if (yuEmailErr) fieldError('yu_email', 'yu_email-error', yuEmailErr);

        // Preferred Email (optional)
        const email = document.getElementById('email')?.value || '';
        if (email) {
            const emailErr = validateEmail(email);
            if (emailErr) fieldError('email', 'email-error', emailErr);
        }

        // WhatsApp
        const whatsapp = document.getElementById('whatsapp')?.value || '';
        const whatsappErr = validateWhatsApp(whatsapp);
        if (whatsappErr) fieldError('whatsapp', 'whatsapp-error', whatsappErr);

        // Seeking
        const seeking = document.getElementById('seeking')?.value || '';
        if (!seeking) fieldError('seeking', 'seeking-error', 'Please select what you\'re seeking');

        // Job Status
        const jobStatus = document.getElementById('job_status')?.value || '';
        if ((seeking === 'IN' || seeking === 'FT') && !jobStatus) {
            fieldError('job_status', 'job_status-error', 'Please select a job status');
        }
        if (seeking === 'N/A') {
            const jobStatusSelect = document.getElementById('job_status');
            if (jobStatusSelect) jobStatusSelect.value = 'N/A';
        }

        // Company
        const companyInput = document.getElementById('company');
        if (jobStatus === 'YES' && companyInput && !companyInput.disabled) {
            const val = companyInput.value.trim().toLowerCase();
            if (!val || val === 'n/a' || val === 'na') {
                fieldError('company', 'company-error', 'Please enter a real company name');
            }
        }

        // Internships
        document.querySelectorAll('.internship-entry').forEach((entry, index) => {
            const yearInput = entry.querySelector('.internship-year');
            const companyInput = entry.querySelector('.internship-company');
            const yearErrorEl = entry.querySelector('.internship-year-error');
            const companyErrorEl = entry.querySelector('.internship-company-error');
            const year = yearInput?.value.trim() || '';
            const company = companyInput?.value.trim() || '';

            if (company) {
                companyInput.value = capitalizeFirstLetterOnly(company);
            }

            if (year || company) {
                if (!year && yearErrorEl) {
                    errors.push(`Internship #${index + 1}: Year is required`);
                    yearInput?.classList.add('border-red-500');
                    yearErrorEl.textContent = 'Year is required';
                    yearErrorEl.classList.remove('hidden');
                    isValid = false;
                } else if (year) {
                    const yErr = validateInternshipYear(year);
                    if (yErr && yearErrorEl) {
                        errors.push(`Internship #${index + 1}: ${yErr}`);
                        yearInput?.classList.add('border-red-500');
                        yearErrorEl.textContent = yErr;
                        yearErrorEl.classList.remove('hidden');
                        isValid = false;
                    }
                }
                if (!company && companyErrorEl) {
                    errors.push(`Internship #${index + 1}: Company is required`);
                    companyInput?.classList.add('border-red-500');
                    companyErrorEl.textContent = 'Company is required';
                    companyErrorEl.classList.remove('hidden');
                    isValid = false;
                }
            }
        });

        return { isValid, errors };
    }

    // ---------------------------------------------------------------------------
    // Form Data
    // ---------------------------------------------------------------------------
    function getFormData() {
        const data = {
            yuid: parseInt(document.getElementById('yuid')?.value || '0'),
            first_name: capitalizeFirstLetter((document.getElementById('first_name')?.value || '').trim()),
            last_name: capitalizeFirstLetter((document.getElementById('last_name')?.value || '').trim()),
            graduation_year: parseInt(document.getElementById('graduation_year')?.value || '0'),
            cs_track: document.getElementById('cs_track')?.value || '',
            yu_email: document.getElementById('yu_email')?.value || '',
            whatsapp: (document.getElementById('whatsapp')?.value || '').replace(/\D/g, ''),
            seeking: document.getElementById('seeking')?.value || '',
            job_status: document.getElementById('job_status')?.value || ''
        };

        const email = (document.getElementById('email')?.value || '').trim();
        if (email) data.email = email;

        const companyInput = document.getElementById('company');
        if (data.job_status === 'YES' && companyInput && !companyInput.disabled) {
            const v = companyInput.value.trim();
            if (v) data.company = capitalizeFirstLetterOnly(v);
        } else {
            data.company = 'N/A';
        }

        const internships = {};
        document.querySelectorAll('.internship-entry').forEach(entry => {
            const year = entry.querySelector('.internship-year')?.value.trim() || '';
            const company = entry.querySelector('.internship-company')?.value.trim() || '';
            if (year && company) internships[year] = capitalizeFirstLetterOnly(company);
        });
        if (Object.keys(internships).length > 0) data.internships = internships;

        return data;
    }

    // ---------------------------------------------------------------------------
    // YAML
    // ---------------------------------------------------------------------------
    function generateYAML(data) {
        let yaml = 'student_profile:\n';
        yaml += `  yuid: ${data.yuid}  # Must be a 9-digit number starting with 800\n`;
        yaml += `  first_name: ${data.first_name}\n`;
        yaml += `  last_name: ${data.last_name}\n`;
        yaml += `  graduation_year: ${data.graduation_year}  # Must be >= 2026\n`;
        yaml += `  cs_track: ${data.cs_track}  # Options: AI, DIS, BA, N/A\n`;
        if (data.email) yaml += `  email: ${data.email}\n`;
        yaml += `  yu_email: ${data.yu_email}\n`;
        yaml += `  whatsapp: "${data.whatsapp}"  # Cell number hooked up to WhatsApp\n`;
        yaml += `  seeking: ${data.seeking}  # Options: IN, FT, N/A\n`;
        yaml += `  job_status: ${data.job_status}  # Options: YES, NO, N/A\n`;
        yaml += `  company: ${data.company}\n`;
        if (data.internships && Object.keys(data.internships).length > 0) {
            yaml += '  internships:\n';
            for (const [year, company] of Object.entries(data.internships)) {
                yaml += `    "${year}": "${company}"\n`;
            }
        }
        return yaml;
    }

    // ---------------------------------------------------------------------------
    // Profile Actions
    // ---------------------------------------------------------------------------
    function validateProfile() {
        const { isValid, errors } = validateForm();
        if (isValid) {
            const data = getFormData();
            showResults(true, [], generateYAML(data));
        } else {
            showResults(false, errors, '');
        }
    }

    async function checkinProfile() {
        const { isValid, errors } = validateForm();
        if (!isValid) {
            showResults(false, errors, '');
            return;
        }

        const repo = getRepo();
        const token = getToken();
        if (!repo || !token) {
            showResults(false, ['No GitHub repository linked or token not found.'], '');
            return;
        }

        const data = getFormData();
        const yamlContent = generateYAML(data);
        const resultsDiv = document.getElementById('validationResults');

        if (resultsDiv) {
            resultsDiv.className = 'mt-4 p-4 rounded-md text-sm bg-gray-50 border border-gray-200 text-gray-700';
            resultsDiv.innerHTML = '<p>⏳ Checking in profile to GitHub...</p>';
            resultsDiv.classList.remove('hidden');
        }

        try {
            const targetPath = 'profile.yml';
            let sha = null;
            let fileExists = false;

            // Try to get SHA from git tree (handles raw-content CDN responses reliably)
            async function getShaFromTree(repoName) {
                try {
                    const treeResp = await fetch(`https://api.github.com/repos/Yeshiva-University-CS/${repoName}/git/trees/yccs-tracker?recursive=1`, {
                        headers: {
                            'Authorization': `token ${token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });
                    if (!treeResp.ok) return null;
                    const treeData = await treeResp.json();
                    if (treeData && Array.isArray(treeData.tree)) {
                        const entry = treeData.tree.find(e => e.path === targetPath);
                        if (entry) return entry.sha;
                    }
                    return null;
                } catch { return null; }
            }

            const getResp = await fetch(`https://api.github.com/repos/Yeshiva-University-CS/${repo}/contents/${targetPath}?ref=yccs-tracker`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            const contentType = getResp.headers.get('content-type') || '';

            if (getResp.status === 200) {
                fileExists = true;
                if (contentType.includes('application/json')) {
                    try {
                        const meta = await getResp.json();
                        sha = meta.sha || null;
                    } catch {
                        sha = await getShaFromTree(repo);
                    }
                } else {
                    sha = await getShaFromTree(repo);
                }
            } else if (getResp.status === 404) {
                fileExists = false;
            } else {
                const txt = await getResp.text();
                throw new Error(`Unexpected status fetching profile metadata: ${getResp.status} ${txt}`);
            }

            if (fileExists && !sha) {
                throw new Error('Existing profile.yml detected but SHA could not be retrieved (token scope or API issue).');
            }

            const content = btoa(unescape(encodeURIComponent(yamlContent)));
            const body = {
                message: fileExists ? 'Update profile.yml' : 'Create profile.yml',
                content,
                branch: 'yccs-tracker'
            };
            if (fileExists) body.sha = sha;

            const putResponse = await fetch(
                `https://api.github.com/repos/Yeshiva-University-CS/${repo}/contents/${targetPath}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );

            if (putResponse.ok) {
                const result = await putResponse.json();
                if (resultsDiv) {
                    resultsDiv.className = 'mt-4 p-4 rounded-md text-sm bg-green-50 border border-green-200 text-green-800';
                    resultsDiv.innerHTML = `<p class="font-semibold mb-1">✓ Profile checked in successfully!</p><p>View it on GitHub: <a href="${result.content.html_url}" target="_blank" class="underline">${repo}@yccs-tracker/profile.yml</a></p>`;
                }
                originalLoadedData = JSON.parse(JSON.stringify(data));
                const checkinBtn = document.getElementById('checkinBtn');
                if (checkinBtn) checkinBtn.disabled = true;

                // Show YAML preview
                const yamlPreview = document.getElementById('yamlPreview');
                if (yamlPreview) {
                    yamlPreview.textContent = yamlContent;
                    yamlPreview.classList.remove('hidden');
                }
            } else {
                const errorData = await putResponse.json();
                if (resultsDiv) {
                    resultsDiv.className = 'mt-4 p-4 rounded-md text-sm bg-red-50 border border-red-200 text-red-700';
                    resultsDiv.innerHTML = `<p class="font-semibold mb-1">✗ Failed to check-in profile</p><p>${errorData.message || 'Unknown error occurred'}</p>`;
                }
            }
        } catch (err) {
            if (resultsDiv) {
                resultsDiv.className = 'mt-4 p-4 rounded-md text-sm bg-red-50 border border-red-200 text-red-700';
                resultsDiv.innerHTML = `<p class="font-semibold mb-1">✗ Error checking in profile</p><p>${err.message}</p>`;
            }
        }
    }

    function showResults(isValid, errors, yamlContent) {
        const resultsDiv = document.getElementById('validationResults');
        const yamlPreview = document.getElementById('yamlPreview');
        if (!resultsDiv) return;

        resultsDiv.classList.remove('hidden');

        if (isValid) {
            resultsDiv.className = 'mt-4 p-4 rounded-md text-sm bg-green-50 border border-green-200 text-green-800';
            resultsDiv.innerHTML = '<p class="font-semibold">✓ Profile is valid!</p><p class="mt-1">You can now check-in your profile to GitHub.</p>';
            if (yamlPreview) {
                yamlPreview.textContent = yamlContent;
                yamlPreview.classList.remove('hidden');
            }
        } else {
            resultsDiv.className = 'mt-4 p-4 rounded-md text-sm bg-red-50 border border-red-200 text-red-700';
            let html = '<p class="font-semibold mb-2">✗ Validation errors:</p><ul class="list-disc list-inside space-y-1">';
            errors.forEach(e => { html += `<li>${e}</li>`; });
            html += '</ul>';
            resultsDiv.innerHTML = html;
            if (yamlPreview) yamlPreview.classList.add('hidden');
        }
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------
    function capitalizeFirstLetter(str) {
        if (!str) return '';
        return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

    function capitalizeFirstLetterOnly(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function formatWhatsApp(phone) {
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        if (digits.length > 10) return '+' + digits;
        return '+' + digits;
    }

    // ---------------------------------------------------------------------------
    // Settings
    // ---------------------------------------------------------------------------
    async function saveSettings() {
        const tokenInput = document.getElementById('githubToken');
        const repoInput  = document.getElementById('repoName');
        const tokenError = document.getElementById('tokenError');
        const repoError  = document.getElementById('repoError');
        const token = (tokenInput ? tokenInput.value : '').trim();
        const repo  = (repoInput  ? repoInput.value  : '').trim();

        // Clear errors
        if (tokenError) { tokenError.textContent = ''; tokenError.classList.add('hidden'); }
        if (repoError)  { repoError.textContent  = ''; repoError.classList.add('hidden'); }

        let hasError = false;
        if (!token) {
            if (tokenError) { tokenError.textContent = 'Please enter a token.'; tokenError.classList.remove('hidden'); }
            hasError = true;
        } else if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
            if (tokenError) { tokenError.textContent = 'Token must start with ghp_ or github_pat_'; tokenError.classList.remove('hidden'); }
            hasError = true;
        }
        if (!repo) {
            if (repoError) { repoError.textContent = 'Please enter a repository name.'; repoError.classList.remove('hidden'); }
            hasError = true;
        } else if (!/^[A-Za-z]+_[A-Za-z]+_800\d{6}$/.test(repo)) {
            if (repoError) { repoError.textContent = 'Format: FirstName_LastName_800XXXXXX'; repoError.classList.remove('hidden'); }
            hasError = true;
        }
        if (hasError) return;

        const statusEl   = document.getElementById('settingsStatus');
        const statusText = document.getElementById('settingsStatusText');
        if (statusEl) {
            statusEl.className = 'mb-6 rounded-lg border p-4 bg-gray-50 border-gray-200';
            statusEl.classList.remove('hidden');
        }
        if (statusText) {
            statusText.className = 'text-sm font-medium text-gray-700';
            statusText.textContent = 'Validating repository access...';
        }

        try {
            const resp = await fetch(`https://api.github.com/repos/Yeshiva-University-CS/${repo}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (!resp.ok) {
                if (statusEl) statusEl.className = 'mb-6 rounded-lg border p-4 bg-red-50 border-red-200';
                if (statusText) {
                    statusText.className = 'text-sm font-medium text-red-800';
                    statusText.textContent = 'Could not access repository. Check your token permissions and repo name.';
                }
                return;
            }
            localStorage.setItem('github_token', token);
            localStorage.setItem('github_repo', repo);
            updateConnectionStatus(repo);
            await loadProfileForm();
        } catch (err) {
            if (statusEl) statusEl.className = 'mb-6 rounded-lg border p-4 bg-red-50 border-red-200';
            if (statusText) {
                statusText.className = 'text-sm font-medium text-red-800';
                statusText.textContent = `Error: ${err.message}`;
            }
        }
    }

    function updateConnectionStatus(repo) {
        const indicator = document.getElementById('repoConnectionStatus');
        if (!indicator) return;
        if (repo) {
            indicator.className = 'flex items-center gap-2 rounded-lg px-3 py-2 bg-green-50';
            indicator.innerHTML = `<div class="h-2 w-2 rounded-full bg-green-500"></div>
                                   <span class="text-sm font-medium text-green-900">${repo}</span>`;
        } else {
            indicator.className = 'flex items-center gap-2 rounded-lg px-3 py-2 bg-gray-100';
            indicator.innerHTML = `<div class="h-2 w-2 rounded-full bg-gray-400"></div>
                                   <span class="text-sm font-medium text-gray-600">Not Connected</span>`;
        }
    }

    function navigateToProfileEditor() {
        setActiveTab('profileEditorBtn');
        hideFileLastUpdated();
        if (getToken() && getRepo()) {
            loadProfileForm();
        } else {
            loadSettingsForm();
        }
    }

    // ---------------------------------------------------------------------------
    // Fragment Loading
    // ---------------------------------------------------------------------------
    function loadSettingsForm() {
        htmx.ajax('GET', 'fragments/settings-form.html', { target: '#app-content', swap: 'innerHTML' });
        setTimeout(() => {
            const savedToken = getToken();
            const savedRepo  = getRepo();
            const tokenInput = document.getElementById('githubToken');
            const repoInput  = document.getElementById('repoName');
            const disconnectBtn = document.getElementById('disconnectBtn');
            if (tokenInput && savedToken) tokenInput.value = savedToken;
            if (repoInput  && savedRepo)  repoInput.value  = savedRepo;
            if (disconnectBtn) disconnectBtn.classList.toggle('hidden', !savedToken && !savedRepo);
        }, 50);
    }

    async function loadProfileForm() {
        await htmx.ajax('GET', 'fragments/profile-form.html', { target: '#app-content', swap: 'innerHTML' });
        // Give the DOM a moment to settle after the swap
        setTimeout(async () => {
            setupFormEventListeners();
            const savedRepo  = getRepo();
            const savedToken = getToken();
            if (savedRepo && savedToken) {
                await checkProfileFile(savedRepo, savedToken);
            }
        }, 50);
    }

    // ---------------------------------------------------------------------------
    // Event Listeners (attached after profile-form fragment loads)
    // ---------------------------------------------------------------------------
    function setupFormEventListeners() {
        // Seeking → job status / company cascade
        const seekingEl = document.getElementById('seeking');
        if (seekingEl) {
            seekingEl.addEventListener('change', function () {
                const jobStatusSelect = document.getElementById('job_status');
                const naOption = document.getElementById('job_status_na_option');
                const companyInput = document.getElementById('company');
                if (this.value === 'N/A' || this.value === '') {
                    jobStatusSelect.disabled = true;
                    jobStatusSelect.value = 'N/A';
                    if (naOption) naOption.style.display = '';
                    companyInput.disabled = true;
                    companyInput.value = 'N/A';
                } else {
                    jobStatusSelect.disabled = false;
                    if (naOption) naOption.style.display = 'none';
                    if (jobStatusSelect.value === 'N/A') jobStatusSelect.value = '';
                }
                checkForChanges();
            });
        }

        // Job Status → company cascade
        const jobStatusEl = document.getElementById('job_status');
        if (jobStatusEl) {
            jobStatusEl.addEventListener('change', function () {
                const companyInput = document.getElementById('company');
                if (this.value === 'YES') {
                    companyInput.disabled = false;
                    companyInput.value = '';
                    companyInput.required = true;
                } else {
                    companyInput.disabled = true;
                    companyInput.value = 'N/A';
                    companyInput.required = false;
                    const companyErr = document.getElementById('company-error');
                    if (companyErr) { companyErr.classList.add('hidden'); }
                }
            });
        }

        // WhatsApp: format on blur
        const whatsappEl = document.getElementById('whatsapp');
        if (whatsappEl) {
            whatsappEl.addEventListener('blur', function () {
                if (this.value.trim()) this.value = formatWhatsApp(this.value);
                const err = validateWhatsApp(this.value);
                showFieldError('whatsapp', 'whatsapp-error', err);
            });
        }

        // YUID: validate on blur
        const yuidEl = document.getElementById('yuid');
        if (yuidEl) {
            yuidEl.addEventListener('blur', function () {
                showFieldError('yuid', 'yuid-error', validateYUID(this.value));
            });
        }

        // First Name: capitalize + validate on blur
        const firstNameEl = document.getElementById('first_name');
        if (firstNameEl) {
            firstNameEl.addEventListener('blur', function () {
                this.value = capitalizeFirstLetter(this.value.trim());
                showFieldError('first_name', 'first_name-error', validateName(this.value, 'First name'));
            });
        }

        // Last Name: capitalize + validate on blur
        const lastNameEl = document.getElementById('last_name');
        if (lastNameEl) {
            lastNameEl.addEventListener('blur', function () {
                this.value = capitalizeFirstLetter(this.value.trim());
                showFieldError('last_name', 'last_name-error', validateName(this.value, 'Last name'));
            });
        }

        // Graduation Year: validate on blur
        const gradYearEl = document.getElementById('graduation_year');
        if (gradYearEl) {
            gradYearEl.addEventListener('blur', function () {
                showFieldError('graduation_year', 'graduation_year-error', validateGradYear(this.value));
            });
        }

        // YU Email: validate on blur
        const yuEmailEl = document.getElementById('yu_email');
        if (yuEmailEl) {
            yuEmailEl.addEventListener('blur', function () {
                showFieldError('yu_email', 'yu_email-error', validateYUEmail(this.value));
            });
        }

        // Preferred Email: validate on blur
        const emailEl = document.getElementById('email');
        if (emailEl) {
            emailEl.addEventListener('blur', function () {
                if (this.value) showFieldError('email', 'email-error', validateEmail(this.value));
            });
        }

        // Company: capitalize on blur
        const companyEl = document.getElementById('company');
        if (companyEl) {
            companyEl.addEventListener('blur', function () {
                if (!this.disabled && this.value.trim()) {
                    this.value = capitalizeFirstLetterOnly(this.value.trim());
                }
            });
        }
    }

    function showFieldError(inputId, errorId, msg) {
        const input = document.getElementById(inputId);
        const err = document.getElementById(errorId);
        if (!input || !err) return;
        if (msg) {
            input.classList.add('border-red-500');
            err.textContent = msg;
            err.classList.remove('hidden');
        } else {
            input.classList.remove('border-red-500');
            err.classList.add('hidden');
        }
    }

    // ---------------------------------------------------------------------------
    // Resume Upload
    // ---------------------------------------------------------------------------
    let selectedResumeFile = null;

    function setActiveTab(tabId) {
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('text-gray-700', 'hover:bg-gray-100');
        });
        const active = document.getElementById(tabId);
        if (active) {
            active.classList.add('bg-blue-600', 'text-white');
            active.classList.remove('text-gray-700', 'hover:bg-gray-100');
        }
    }

    function navigateToResumeUpload() {
        if (!getToken() || !getRepo()) {
            loadSettingsForm();
            return;
        }
        setActiveTab('resumeUploadBtn');
        updateProfileFileBadge(false);
        loadResumeForm();
    }

    async function loadResumeForm() {
        await htmx.ajax('GET', 'fragments/resume-form.html', { target: '#app-content', swap: 'innerHTML' });
        setTimeout(async () => {
            selectedResumeFile = null;
            const repo  = getRepo();
            const token = getToken();
            if (repo && token) {
                await checkResumeFile(repo, token);
            }
        }, 50);
    }

    async function checkResumeFile(repo, token) {
        const statusDiv = document.getElementById('resumeFileStatus');
        try {
            const resp = await fetch(
                `https://api.github.com/repos/Yeshiva-University-CS/${repo}/contents/resume.pdf?ref=yccs-tracker`,
                { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } }
            );
            if (resp.status === 200) {
                const fileMeta = await resp.json();
                if (fileMeta.html_url) showResumeViewLink(fileMeta.html_url);
                updateProfileFileBadge(true, 'resume.pdf');
                fetchFileLastUpdated(repo, token, 'resume.pdf');
                renderPdfPreviewFromGitHub(repo, token, fileMeta.sha);
                if (statusDiv) {
                    statusDiv.className = 'text-sm mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700';
                    statusDiv.textContent = 'A resume is already on file. Upload a new one to replace it.';
                    statusDiv.classList.remove('hidden');
                }
            } else if (resp.status === 404) {
                updateProfileFileBadge(false);
                if (statusDiv) {
                    statusDiv.className = 'text-sm mb-4 text-gray-500';
                    statusDiv.textContent = 'No resume on file yet. Upload one below.';
                    statusDiv.classList.remove('hidden');
                }
            }
        } catch (err) {
            hideFileLastUpdated();
            if (statusDiv) {
                statusDiv.className = 'text-sm mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700';
                statusDiv.textContent = 'Error checking resume: ' + err.message;
                statusDiv.classList.remove('hidden');
            }
        }
    }

    function updateFileLastUpdated(isoDateStr) {
        const badge = document.getElementById('fileLastUpdated');
        const text  = document.getElementById('fileLastUpdatedText');
        if (!badge || !text) return;
        const d = new Date(isoDateStr);
        text.textContent = 'Updated: ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        badge.classList.remove('hidden');
        badge.classList.add('flex');
    }

    function hideFileLastUpdated() {
        const badge = document.getElementById('fileLastUpdated');
        if (!badge) return;
        badge.classList.add('hidden');
        badge.classList.remove('flex');
    }

    async function fetchFileLastUpdated(repo, token, path) {
        try {
            const resp = await fetch(
                `https://api.github.com/repos/Yeshiva-University-CS/${repo}/commits?path=${path}&per_page=1`,
                { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } }
            );
            if (resp.ok) {
                const commits = await resp.json();
                if (commits.length > 0) updateFileLastUpdated(commits[0].commit.committer.date);
            }
        } catch { /* silently ignore */ }
    }

    function showResumeViewLink(url) {
        const container = document.getElementById('resumeViewLink');
        const anchor    = document.getElementById('resumeViewAnchor');
        if (!container || !anchor) return;
        anchor.href = url;
        container.classList.remove('hidden');
    }

    // ---------------------------------------------------------------------------
    // PDF Preview
    // ---------------------------------------------------------------------------
    function initPdfJs() {
        if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    }

    async function renderPdfPreviewFromBytes(data) {
        const container = document.getElementById('resumePreviewContainer');
        const canvas    = document.getElementById('resumePreviewCanvas');
        if (!container || !canvas || !window.pdfjsLib) return;

        try {
            const pdf  = await window.pdfjsLib.getDocument({ data }).promise;
            const page = await pdf.getPage(1);

            // Fill the right-column container; height follows PDF aspect ratio
            const TARGET_W = container.clientWidth || 400;
            const dpr      = window.devicePixelRatio || 1;
            const viewport = page.getViewport({ scale: 1 });
            const scale    = (TARGET_W * dpr) / viewport.width;
            const sv       = page.getViewport({ scale });

            canvas.width        = sv.width;
            canvas.height       = sv.height;
            canvas.style.height = 'auto'; // browser maintains ratio from intrinsic dimensions

            await page.render({ canvasContext: canvas.getContext('2d'), viewport: sv }).promise;
            container.classList.remove('hidden');
        } catch (err) {
            console.error('PDF preview error:', err);
        }
    }

    async function renderPdfPreviewFromFile(file) {
        const buf = await file.arrayBuffer();
        renderPdfPreviewFromBytes(new Uint8Array(buf));
    }

    async function renderPdfPreviewFromGitHub(repo, token, sha) {
        try {
            const resp = await fetch(
                `https://api.github.com/repos/Yeshiva-University-CS/${repo}/git/blobs/${sha}`,
                { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } }
            );
            if (!resp.ok) return;
            const blob   = await resp.json();
            const clean  = blob.content.replace(/\s/g, '');
            const bytes  = Uint8Array.from(atob(clean), c => c.charCodeAt(0));
            renderPdfPreviewFromBytes(bytes);
        } catch (err) {
            console.error('PDF GitHub preview error:', err);
        }
    }

    function clearPdfPreview() {
        const container = document.getElementById('resumePreviewContainer');
        const canvas    = document.getElementById('resumePreviewCanvas');
        if (container) container.classList.add('hidden');
        if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    }

    function handleResumeDrop(event) {
        event.preventDefault();
        const zone = document.getElementById('resumeDropZone');
        if (zone) zone.classList.remove('border-blue-400', 'bg-blue-50');
        setResumeFile(event.dataTransfer.files[0]);
    }

    function handleResumeFileSelect(event) {
        setResumeFile(event.target.files[0]);
    }

    function setResumeFile(file) {
        const resultDiv = document.getElementById('resumeUploadResult');
        if (resultDiv) resultDiv.classList.add('hidden');

        if (!file || file.type !== 'application/pdf') {
            if (resultDiv) {
                resultDiv.className = 'mt-4 p-4 rounded-md text-sm bg-red-50 border border-red-200 text-red-700';
                resultDiv.textContent = 'Please select a PDF file.';
                resultDiv.classList.remove('hidden');
            }
            return;
        }
        selectedResumeFile = file;
        document.getElementById('resumeFileName').textContent = file.name;
        document.getElementById('resumeFileSize').textContent = (file.size / 1024).toFixed(1) + ' KB';
        document.getElementById('resumeFileInfo').classList.remove('hidden');
        document.getElementById('resumeUploadSubmitBtn').disabled = false;
        renderPdfPreviewFromFile(file);
    }

    function clearResumeFile() {
        selectedResumeFile = null;
        const input = document.getElementById('resumeFileInput');
        if (input) input.value = '';
        document.getElementById('resumeFileInfo').classList.add('hidden');
        document.getElementById('resumeUploadSubmitBtn').disabled = true;
        clearPdfPreview();
    }

    async function uploadResume() {
        const resultDiv = document.getElementById('resumeUploadResult');
        const btn = document.getElementById('resumeUploadSubmitBtn');
        const token = getToken();
        const repo  = getRepo();

        if (!selectedResumeFile || !token || !repo) return;

        btn.disabled = true;
        btn.textContent = 'Uploading...';
        if (resultDiv) resultDiv.classList.add('hidden');

        try {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(selectedResumeFile);
            });

            const targetPath = 'resume.pdf';
            let sha = null;
            const getResp = await fetch(
                `https://api.github.com/repos/Yeshiva-University-CS/${repo}/contents/${targetPath}?ref=yccs-tracker`,
                { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } }
            );
            if (getResp.status === 200) {
                const meta = await getResp.json();
                sha = meta.sha || null;
            }

            const body = {
                message: sha ? 'Update resume.pdf' : 'Upload resume.pdf',
                content: base64,
                branch: 'yccs-tracker'
            };
            if (sha) body.sha = sha;

            const putResp = await fetch(
                `https://api.github.com/repos/Yeshiva-University-CS/${repo}/contents/${targetPath}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );

            if (putResp.ok) {
                const putResult = await putResp.json();
                updateProfileFileBadge(true, 'resume.pdf');
                updateFileLastUpdated(new Date().toISOString());
                if (putResult.content && putResult.content.html_url) {
                    showResumeViewLink(putResult.content.html_url);
                }
                if (resultDiv) {
                    resultDiv.className = 'mt-4 p-4 rounded-md text-sm bg-green-50 border border-green-200 text-green-800';
                    resultDiv.innerHTML = '<p class="font-semibold">✓ Resume uploaded successfully!</p><p class="mt-1">Saved to @yccs-tracker/resume.pdf</p>';
                    resultDiv.classList.remove('hidden');
                }
                const uploadedSha = putResult.content && putResult.content.sha;
                clearResumeFile();
                if (uploadedSha) renderPdfPreviewFromGitHub(repo, token, uploadedSha);
                const statusDiv = document.getElementById('resumeFileStatus');
                if (statusDiv) {
                    statusDiv.className = 'text-sm mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700';
                    statusDiv.textContent = 'A resume is already on file. Upload a new one to replace it.';
                    statusDiv.classList.remove('hidden');
                }
            } else {
                const errData = await putResp.json();
                if (resultDiv) {
                    resultDiv.className = 'mt-4 p-4 rounded-md text-sm bg-red-50 border border-red-200 text-red-700';
                    resultDiv.innerHTML = `<p class="font-semibold">✗ Upload failed</p><p>${errData.message || 'Unknown error'}</p>`;
                    resultDiv.classList.remove('hidden');
                }
            }
        } catch (err) {
            if (resultDiv) {
                resultDiv.className = 'mt-4 p-4 rounded-md text-sm bg-red-50 border border-red-200 text-red-700';
                resultDiv.innerHTML = `<p class="font-semibold">✗ Error uploading resume</p><p>${err.message}</p>`;
                resultDiv.classList.remove('hidden');
            }
        } finally {
            btn.textContent = 'Upload Resume';
            btn.disabled = (selectedResumeFile === null);
        }
    }

    // ---------------------------------------------------------------------------
    // Init
    // ---------------------------------------------------------------------------
    window.addEventListener('DOMContentLoaded', async () => {
        initPdfJs();
        setActiveTab('profileEditorBtn');
        updateConnectionStatus(getRepo());
        const token = getToken();
        const repo  = getRepo();
        if (token && repo) {
            await loadProfileForm();
        } else {
            loadSettingsForm();
        }
    });

    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------
    window.profile = {
        saveSettings,
        disconnectAccount,
        navigateToProfileEditor,
        navigateToResumeUpload,
        loadSettingsForm,
        validateProfile,
        checkinProfile,
        addInternship,
        removeInternship,
        handleResumeDrop,
        handleResumeFileSelect,
        clearResumeFile,
        uploadResume
    };

})();
