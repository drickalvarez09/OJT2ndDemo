// Scripts for DICT ICT Industry Development Dashboard

// Shared application state
let currentPage = 1;
const itemsPerPage = 10;
let currentFilteredData = [];
let currentView = 'charts';
let currentDataSource = 'activities';
let appData = null;

const filterState = {
    search: '',
    program: '',
    industry: '',
    province: '',
    modality: ''
};

const searchIndexCache = new WeakMap();

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    initializeFilters();
    initializeViewToggle();
    initializeMobileMenu();
    initializeMobileFilters();
    initializePagination();

    document.querySelectorAll('.clear-filters').forEach(button => {
        button.addEventListener('click', clearAllFilters);
    });

    updateFilterCount();

    await loadData();
    loadView('charts');
}

async function loadData() {
    try {
        if (!window.sheetsIntegration) {
            throw new Error('Sheets integration not available');
        }

        appData = await window.sheetsIntegration.fetchData();
        updateFilterDropdowns(appData.filterOptions);
    } catch (error) {
        console.error('Failed to initialize sheets data:', error);
        appData = null;
    }
}

function getUnifiedData() {
    return window.sheetsConnector?.cache?.raw?.unified || appData?.data || [];
}

// ===== FILTERS =====

function initializeFilters() {
    document.querySelectorAll('[data-filter]').forEach(input => {
        const key = input.dataset.filter;
        if (!(key in filterState)) return;

        const handleChange = () => {
            filterState[key] = input.value.trim();
            syncFilterControls(key, input.value);
            applyFilters();
            updateFilterCount();
        };

        if (input.tagName === 'SELECT') {
            input.addEventListener('change', handleChange);
        } else {
            input.addEventListener('input', debounce(handleChange, 300));
        }
    });
}

function syncFilterControls(key, value) {
    document.querySelectorAll(`[data-filter="${key}"]`).forEach(control => {
        if (control.value !== value) {
            control.value = value;
        }
    });
}

function updateFilterCount() {
    const activeCount = Object.values(filterState).filter(value => value !== '').length;
    const desktopCount = document.getElementById('filterCount');
    const mobileCount = document.getElementById('mobileFilterCount');

    if (desktopCount) {
        desktopCount.textContent = `${activeCount} Active`;
    }

    if (mobileCount) {
        mobileCount.textContent = activeCount > 0 ? `(${activeCount})` : '';
    }
}

function updateFilterDropdowns(filterOptions) {
    if (!filterOptions) return;

    const optionMap = {
        program: filterOptions.programs,
        industry: filterOptions.industries,
        province: filterOptions.provinces,
        modality: filterOptions.modalities
    };

    Object.entries(optionMap).forEach(([key, options]) => {
        const validOptions = [...new Set((options || []).filter(option =>
            option && option.trim() !== '' && option !== 'N/A'
        ))];

        document.querySelectorAll(`select[data-filter="${key}"]`).forEach(select => {
            while (select.options.length > 1) {
                select.remove(1);
            }

            validOptions.forEach(value => {
                const optionElement = document.createElement('option');
                optionElement.value = value;
                optionElement.textContent = value;
                select.appendChild(optionElement);
            });
        });
    });
}

function getCurrentFilters() {
    const filters = {};

    if (filterState.search) filters.search = filterState.search;
    if (filterState.program) filters['Component Program'] = filterState.program;
    if (filterState.industry) filters['Industry supported'] = filterState.industry;
    if (filterState.province) filters['Province'] = filterState.province;
    if (filterState.modality) filters['Modality'] = filterState.modality;

    return filters;
}

function clearAllFilters() {
    Object.keys(filterState).forEach(key => {
        filterState[key] = '';
    });

    document.querySelectorAll('[data-filter]').forEach(input => {
        if (input.tagName === 'SELECT') {
            input.selectedIndex = 0;
        } else {
            input.value = '';
        }
    });

    currentFilteredData = [];
    applyFilters();
    updateFilterCount();
}

function applyFilters() {
    const filters = getCurrentFilters();
    let filteredData = [];
    const connectorData = window.sheetsConnector?.cache;

    if (connectorData) {
        let dataToFilter = [];

        if (currentView === 'charts') {
            dataToFilter = connectorData.raw.unified || [];
        } else {
            switch (currentDataSource) {
                case 'activities':
                    dataToFilter = connectorData.raw.activities || [];
                    break;
                case 'peruacs':
                    dataToFilter = connectorData.raw.uacs || [];
                    break;
                case 'funds':
                    dataToFilter = connectorData.raw.funds || [];
                    break;
                default:
                    dataToFilter = connectorData.raw.activities || [];
            }
        }

        filteredData = filterDataSourceData(dataToFilter, filters);
    }

    currentFilteredData = filteredData;
    currentPage = 1;

    if (currentView === 'charts') {
        updateContentWithFilteredData(filteredData);
    } else if (currentView === 'sheets') {
        updateSheetsSummaryCards(filteredData);
        updateTableWithFilteredData(filteredData);
    }

    updateFilterCount();
}

function getSearchIndex(item) {
    let index = searchIndexCache.get(item);
    if (index === undefined) {
        index = Object.values(item).map(value => String(value)).join(' ').toLowerCase();
        searchIndexCache.set(item, index);
    }
    return index;
}

function filterDataSourceData(data, filters) {
    if (!data || !Array.isArray(data)) {
        console.warn('Invalid data for filtering:', data);
        return [];
    }

    let filtered = data;

    if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filtered = filtered.filter(item => getSearchIndex(item).includes(searchTerm));
    }

    if (filters['Component Program'] && filters['Component Program'] !== 'All') {
        filtered = filtered.filter(item => item['Component Program'] === filters['Component Program']);
    }

    if (filters['Industry supported'] && filters['Industry supported'] !== 'All') {
        filtered = filtered.filter(item => item['Industry supported'] === filters['Industry supported']);
    }

    if (filters['Province'] && filters['Province'] !== 'All') {
        filtered = filtered.filter(item => item['Province'] === filters['Province']);
    }

    if (filters['Modality'] && filters['Modality'] !== 'All') {
        filtered = filtered.filter(item => item['Modality'] === filters['Modality']);
    }

    return filtered;
}

// ===== VIEWS =====

function initializeViewToggle() {
    const chartsBtn = document.getElementById('chartsViewBtn');
    const sheetsBtn = document.getElementById('sheetsViewBtn');

    if (chartsBtn && sheetsBtn) {
        chartsBtn.addEventListener('click', function() {
            setActiveView('charts');
            loadView('charts');
        });

        sheetsBtn.addEventListener('click', function() {
            setActiveView('sheets');
            loadView('sheets');
        });
    }
}

function setActiveView(view) {
    currentView = view;
    const chartsBtn = document.getElementById('chartsViewBtn');
    const sheetsBtn = document.getElementById('sheetsViewBtn');

    if (chartsBtn && sheetsBtn) {
        chartsBtn.className = 'view-toggle inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-600 text-sm px-4 py-2 shadow-xs';
        sheetsBtn.className = 'view-toggle inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-600 text-sm px-4 py-2 shadow-xs';

        if (view === 'charts') {
            chartsBtn.className = 'view-toggle inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-600 text-sm px-4 py-2 shadow-xs';
        } else {
            sheetsBtn.className = 'view-toggle inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-600 text-sm px-4 py-2 shadow-xs';
        }
    }
}

function loadView(viewType) {
    const container = document.getElementById('contentContainer');
    const template = document.getElementById(`${viewType}ViewTemplate`);

    if (!container || !template) {
        console.error(`View template for ${viewType} not found`);
        return;
    }

    container.innerHTML = '';
    container.appendChild(template.content.cloneNode(true));
    currentView = viewType;

    if (viewType === 'charts') {
        initializeChartsWithCurrentData();

        const switchToSheets = document.getElementById('switchToSheets');
        if (switchToSheets) {
            switchToSheets.addEventListener('click', function() {
                setActiveView('sheets');
                loadView('sheets');
            });
        }
    } else {
        initializeDataSourceToggles();
        setActiveDataSource('activities');
    }

    updateFilterCount();
}

// ===== CHARTS =====

function initializeChartsWithCurrentData() {
    const chartContainers = [
        'programBudgetChart',
        'provincesPieChart',
        'industryChart',
        'modalityChart'
    ];

    if (!chartContainers.every(id => document.getElementById(id))) {
        console.error('Not all chart containers are available');
        return;
    }

    if (typeof Chart === 'undefined' || typeof ChartRenderer === 'undefined') {
        console.error('Chart dependencies not loaded');
        return;
    }

    updateChartsSummaryCards();

    const filters = getCurrentFilters();
    const sourceData = filterDataSourceData(getUnifiedData(), filters);

    if (!sourceData.length) {
        console.warn('No data available for charts');
        return;
    }

    currentFilteredData = sourceData;
    const chartData = generateChartDataFromFilteredData(sourceData);

    if (!window.chartRenderer) {
        window.chartRenderer = new ChartRenderer();
    }

    window.chartRenderer.initializeCharts(chartData);

    if (Object.keys(filters).length > 0) {
        updateFilteredChartsSummaryCards(sourceData);
    }
}

function updateContentWithFilteredData(filteredData) {
    if (currentView !== 'charts') return;

    const chartData = generateChartDataFromFilteredData(filteredData);
    const hasValidChartData = chartData.programBreakdown &&
        Object.keys(chartData.programBreakdown).length > 0;

    if (!hasValidChartData) {
        const fallbackData = generateChartDataFromFilteredData(getUnifiedData());
        if (window.chartRenderer) {
            window.chartRenderer.updateCharts(fallbackData);
        }
    } else if (window.chartRenderer) {
        window.chartRenderer.updateCharts(chartData);
    } else {
        initializeChartsWithCurrentData();
    }

    updateFilteredChartsSummaryCards(filteredData);
}

function updateChartsSummaryCards() {
    if (!appData) return;

    const summary = appData.summary || {};
    const financial = appData.financialSummary || {};

    updateChartsElement('activitiesCount', summary.totalActivities || 0);
    updateChartsElement('filteredBudget', formatCurrency(financial.totalAllocation || 0));
    updateChartsElement('filteredBUR', (summary.overallBUR || 0).toFixed(1) + '%');
    updateChartsElement('filteredObligation', formatCurrency(financial.totalObligation || 0) + ' obligated');
    updateChartsElement('programsCount', summary.activePrograms || 0);
}

function updateChartsElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function updateFilteredChartsSummaryCards(filteredData) {
    let totalAllocation = 0;
    let totalObligation = 0;
    let activityCount = 0;
    const uniquePrograms = new Set();

    filteredData.forEach(item => {
        const isConnectorFormat = Object.prototype.hasOwnProperty.call(item, 'type');
        const itemType = isConnectorFormat ? item.type : (item.Type || 'activity');

        if (itemType === 'activity' || itemType === 'Activity') {
            activityCount++;
            const program = item['Component Program'];
            if (program) uniquePrograms.add(program);
        }

        if (isConnectorFormat) {
            totalAllocation += item.allocation || 0;
            totalObligation += item.obligation || 0;
        } else {
            totalAllocation += parseFloat(item['Total Allocation per Sub-ARO']) || 0;
            totalObligation += parseFloat(item.Obligation) || 0;
        }
    });

    const utilizationRate = totalAllocation > 0 ? (totalObligation / totalAllocation) * 100 : 0;

    updateChartsElement('activitiesCount', activityCount);
    updateChartsElement('filteredBudget', formatCurrency(totalAllocation));
    updateChartsElement('filteredBUR', utilizationRate.toFixed(1) + '%');
    updateChartsElement('filteredObligation', formatCurrency(totalObligation) + ' obligated');
    updateChartsElement('programsCount', uniquePrograms.size);
}

function generateChartDataFromFilteredData(filteredData) {
    const programBreakdown = {};
    const provinceBreakdown = {};
    const industryBreakdown = {};
    const modalityBreakdown = {};

    filteredData.forEach(item => {
        const isConnectorFormat = Object.prototype.hasOwnProperty.call(item, 'type');
        const program = item['Component Program'] || 'Uncategorized';
        const itemType = isConnectorFormat ? item.type : (item.Type || 'activity');

        if (!programBreakdown[program]) {
            programBreakdown[program] = { activities: 0, allocation: 0, obligation: 0 };
        }

        if (itemType === 'activity' || itemType === 'Activity') {
            programBreakdown[program].activities++;

            const province = item.Province || 'Unknown';
            provinceBreakdown[province] = (provinceBreakdown[province] || 0) + 1;

            const industry = item['Industry supported'] || 'Unknown';
            industryBreakdown[industry] = (industryBreakdown[industry] || 0) + 1;

            const modality = item.Modality || 'Unknown';
            modalityBreakdown[modality] = (modalityBreakdown[modality] || 0) + 1;
        }

        if (isConnectorFormat) {
            programBreakdown[program].allocation += item.allocation || 0;
            programBreakdown[program].obligation += item.obligation || 0;
        } else {
            programBreakdown[program].allocation += parseFloat(item['Total Allocation per Sub-ARO']) || 0;
            programBreakdown[program].obligation += parseFloat(item.Obligation) || 0;
        }
    });

    return {
        programBreakdown,
        provinceBreakdown,
        industryBreakdown,
        modalityBreakdown
    };
}

// ===== SHEETS =====

function updateSheetsSummaryCards(filteredData) {
    if (currentDataSource === 'activities') {
        const totalActivities = filteredData.length;
        const uniquePrograms = new Set(filteredData.map(item => item['Component Program']).filter(Boolean));

        updateSheetsElement('activitiesCount', totalActivities);
        updateSheetsElement('filteredBudget', '-');
        updateSheetsElement('filteredBUR', '-');
        updateSheetsElement('programsCount', uniquePrograms.size);
        updateSheetsElement('filteredObligation', '-');
        return;
    }

    let totalAllocation = 0;
    let totalObligation = 0;

    filteredData.forEach(item => {
        totalAllocation += item.parsedAllocation || item.allocation || 0;
        totalObligation += item.parsedObligation || item.obligation || 0;
    });

    const utilizationRate = totalAllocation > 0 ? (totalObligation / totalAllocation) * 100 : 0;
    const uniquePrograms = new Set(filteredData.map(item => item['Component Program']).filter(Boolean));

    updateSheetsElement('activitiesCount', filteredData.length);
    updateSheetsElement('filteredBudget', formatCurrency(totalAllocation));
    updateSheetsElement('filteredBUR', utilizationRate.toFixed(1) + '%');
    updateSheetsElement('programsCount', uniquePrograms.size);
    updateSheetsElement('filteredObligation', formatCurrency(totalObligation) + ' obligated');
}

function updateSheetsElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function initializeDataSourceToggles() {
    const activitiesBtn = document.getElementById('activitiesViewBtn');
    const perUacsBtn = document.getElementById('perUacsViewBtn');
    const fundsBtn = document.getElementById('fundsViewBtn');

    if (activitiesBtn && perUacsBtn && fundsBtn) {
        activitiesBtn.addEventListener('click', function() {
            setActiveDataSource('activities');
        });

        perUacsBtn.addEventListener('click', function() {
            setActiveDataSource('peruacs');
        });

        fundsBtn.addEventListener('click', function() {
            setActiveDataSource('funds');
        });
    }
}

function setActiveDataSource(source) {
    currentDataSource = source;

    const activitiesBtn = document.getElementById('activitiesViewBtn');
    const perUacsBtn = document.getElementById('perUacsViewBtn');
    const fundsBtn = document.getElementById('fundsViewBtn');

    if (activitiesBtn && perUacsBtn && fundsBtn) {
        activitiesBtn.className = 'data-source-btn px-3 sm:px-4 py-2 border-b-2 font-medium flex items-center whitespace-nowrap text-gray-800 hover:text-blue-600 border-transparent';
        perUacsBtn.className = 'data-source-btn px-3 sm:px-4 py-2 border-b-2 font-medium flex items-center whitespace-nowrap text-gray-800 hover:text-blue-600 border-transparent';
        fundsBtn.className = 'data-source-btn px-3 sm:px-4 py-2 border-b-2 font-medium flex items-center whitespace-nowrap text-gray-800 hover:text-blue-600 border-transparent';

        if (source === 'activities') {
            activitiesBtn.className = 'data-source-btn px-3 sm:px-4 py-2 border-b-2 font-medium flex items-center whitespace-nowrap border-blue-500 text-blue-600';
        } else if (source === 'peruacs') {
            perUacsBtn.className = 'data-source-btn px-3 sm:px-4 py-2 border-b-2 font-medium flex items-center whitespace-nowrap border-blue-500 text-blue-600';
        } else if (source === 'funds') {
            fundsBtn.className = 'data-source-btn px-3 sm:px-4 py-2 border-b-2 font-medium flex items-center whitespace-nowrap border-blue-500 text-blue-600';
        }
    }

    switchTableType(source);
    updateTableWithDataSource();
}

function updateTableWithDataSource() {
    const connectorData = window.sheetsConnector?.cache;

    if (!connectorData) {
        currentFilteredData = [];
        updateSheetsSummaryCards([]);
        updateTableWithFilteredData([]);
        return;
    }

    let dataToShow = [];

    switch (currentDataSource) {
        case 'activities':
            dataToShow = connectorData.raw.activities || [];
            break;
        case 'peruacs':
            dataToShow = connectorData.raw.uacs || [];
            break;
        case 'funds':
            dataToShow = connectorData.raw.funds || [];
            break;
        default:
            dataToShow = connectorData.raw.activities || [];
    }

    const filteredData = filterDataSourceData(dataToShow, getCurrentFilters());

    currentFilteredData = filteredData;
    currentPage = 1;
    updateSheetsSummaryCards(filteredData);
    updateTableWithFilteredData(filteredData);
}

function updateTableWithFilteredData(filteredData) {
    switch (currentDataSource) {
        case 'activities':
            updateActivitiesTable(filteredData);
            break;
        case 'peruacs':
            updatePerUacsTable(filteredData);
            break;
        case 'funds':
            updateFundsTable(filteredData);
            break;
    }

    updatePaginationInfo(
        filteredData.length,
        Math.min(itemsPerPage, filteredData.length),
        Math.ceil(filteredData.length / itemsPerPage)
    );
}

function updateActivitiesTable(filteredData) {
    const tableBody = document.getElementById('activitiesTableBody');
    if (!tableBody) {
        console.warn('Activities table body not found');
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    if (paginatedData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-8 text-center text-sm text-gray-500">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fas fa-search text-2xl mb-2 text-gray-400"></i>
                        <p>No activities found matching the current filters</p>
                        <p class="text-xs mt-1">Try adjusting your search criteria</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = paginatedData.map(item => {
        const startDate = item['Start Date'] ? formatDate(item['Start Date']) : 'N/A';
        const endDate = item['End Date'] ? formatDate(item['End Date']) : 'N/A';

        return `
            <tr>
                <td class="px-4 py-4 whitespace-normal text-sm text-gray-900">
                    <div class="font-semibold">${escapeHtml(item.Activity || 'N/A')}</div>
                    ${item['Activity Details'] ? `<div class="text-xs text-gray-500 mt-1">${escapeHtml(item['Activity Details'])}</div>` : ''}
                </td>
                <td class="px-4 py-4 whitespace-normal text-sm text-gray-500">${escapeHtml(item['Component Program'] || 'N/A')}</td>
                <td class="px-4 py-4 whitespace-normal text-sm text-gray-500">${escapeHtml(item['Industry supported'] || 'N/A')}</td>
                <td class="px-4 py-4 whitespace-normal text-sm text-gray-500">${escapeHtml(item.Province || 'N/A')}</td>
                <td class="px-4 py-4 whitespace-nowrap">
                    <span class="modality-badge ${getModalityClass(item.Modality)}">${escapeHtml(item.Modality || 'N/A')}</span>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${escapeHtml(startDate)}</td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${escapeHtml(endDate)}</td>
                <td class="px-4 py-4 whitespace-normal text-sm text-gray-500">
                    ${escapeHtml(item['Remarks and Details'] || item['Activity Details'] || 'N/A')}
                </td>
            </tr>
        `;
    }).join('');
}

function updatePerUacsTable(filteredData) {
    const tableBody = document.getElementById('perUacsTableBody');
    if (!tableBody) {
        console.warn('Per UACS table body not found');
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    if (paginatedData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-8 text-center text-sm text-gray-500">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fas fa-search text-2xl mb-2 text-gray-400"></i>
                        <p>No Per UACS data found matching the current filters</p>
                        <p class="text-xs mt-1">Try adjusting your search criteria</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = paginatedData.map(item => {
        const allocation = item.parsedAllocation || item.allocation || 0;
        const obligation = item.parsedObligation || item.obligation || 0;
        const bur = item.parsedBUR || item.bur || 0;
        const unobligated = item.parsedUnobligated || item.unobligated || 0;

        return `
            <tr>
                <td class="px-4 py-4 whitespace-normal text-sm text-gray-900">
                    ${escapeHtml(item['Component Program'] || 'N/A')}
                </td>
                <td class="px-4 py-4 whitespace-normal text-sm text-gray-500">${escapeHtml(item['Fund Source'] || 'N/A')}</td>
                <td class="px-4 py-4 whitespace-normal text-sm text-gray-500">
                    <div class="font-medium">${escapeHtml(item['Specific Activity'] || 'N/A')}</div>
                    ${item['Object Name'] ? `<div class="text-xs text-gray-500 mt-1">${escapeHtml(item['Object Name'])}</div>` : ''}
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${escapeHtml(item['Sub-ARO No.'] || 'N/A')}</td>
                <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${formatCurrency(allocation)}</td>
                <td class="px-4 py-4 whitespace-nowrap text-sm ${obligation > 0 ? 'text-green-600' : 'text-gray-500'}">
                    ${formatCurrency(obligation)}
                </td>
                <td class="px-4 py-4 whitespace-nowrap">
                    <div class="flex items-center space-x-2">
                        <div class="w-16 bg-gray-200 rounded-full h-2">
                            <div class="bg-green-600 h-2 rounded-full" style="width: ${Math.min(bur, 100)}%"></div>
                        </div>
                        <span class="text-xs font-medium ${bur > 50 ? 'text-green-600' : bur > 0 ? 'text-yellow-600' : 'text-gray-500'}">
                            ${bur.toFixed(1)}%
                        </span>
                    </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm ${unobligated > 0 ? 'text-orange-600' : 'text-gray-500'}">
                    ${formatCurrency(unobligated)}
                </td>
            </tr>
        `;
    }).join('');
}

function updateFundsTable(filteredData) {
    const tableBody = document.getElementById('fundsTableBody');
    if (!tableBody) {
        console.warn('Funds table body not found');
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    if (paginatedData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-8 text-center text-sm text-gray-500">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fas fa-search text-2xl mb-2 text-gray-400"></i>
                        <p>No Funds data found matching the current filters</p>
                        <p class="text-xs mt-1">Try adjusting your search criteria</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = paginatedData.map(item => {
        const allocation = item.parsedAllocation || item.allocation || 0;
        const obligation = item.parsedObligation || item.obligation || 0;
        const bur = item.parsedBUR || item.bur || 0;
        const unobligated = item.parsedUnobligated || item.unobligated || 0;

        return `
            <tr>
                <td class="px-4 py-4 whitespace-normal text-sm text-gray-900">
                    ${escapeHtml(item['Component Program'] || 'N/A')}
                </td>
                <td class="px-4 py-4 whitespace-normal text-sm text-gray-500">${escapeHtml(item['Fund Source'] || 'N/A')}</td>
                <td class="px-4 py-4 whitespace-normal text-sm text-gray-500">
                    ${escapeHtml(item['Specific Activity'] || 'N/A')}
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${escapeHtml(item['Sub-ARO No.'] || 'N/A')}</td>
                <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${formatCurrency(allocation)}</td>
                <td class="px-4 py-4 whitespace-nowrap text-sm ${obligation > 0 ? 'text-green-600' : 'text-gray-500'}">
                    ${formatCurrency(obligation)}
                </td>
                <td class="px-4 py-4 whitespace-nowrap">
                    <div class="flex items-center space-x-2">
                        <div class="w-16 bg-gray-200 rounded-full h-2">
                            <div class="bg-green-600 h-2 rounded-full" style="width: ${Math.min(bur, 100)}%"></div>
                        </div>
                        <span class="text-xs font-medium ${bur > 50 ? 'text-green-600' : bur > 0 ? 'text-yellow-600' : 'text-gray-500'}">
                            ${bur.toFixed(1)}%
                        </span>
                    </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm ${unobligated > 0 ? 'text-orange-600' : 'text-gray-500'}">
                    ${formatCurrency(unobligated)}
                </td>
            </tr>
        `;
    }).join('');
}

function updatePaginationInfo(total, showing, totalPages) {
    const paginationInfo = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageInput = document.getElementById('pageInput');
    const totalPagesElement = document.getElementById('totalPages');

    if (paginationInfo) {
        const startItem = ((currentPage - 1) * itemsPerPage) + 1;
        const endItem = Math.min(startItem + showing - 1, total);

        if (total === 0) {
            paginationInfo.textContent = 'No records found';
        } else {
            paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${total} records (Page ${currentPage} of ${totalPages})`;
        }
    }

    if (pageInput) {
        pageInput.value = currentPage;
    }

    if (totalPagesElement) {
        totalPagesElement.textContent = totalPages;
    }

    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        prevBtn.classList.toggle('opacity-50', currentPage <= 1);
        prevBtn.classList.toggle('cursor-not-allowed', currentPage <= 1);
    }

    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.classList.toggle('opacity-50', currentPage >= totalPages);
        nextBtn.classList.toggle('cursor-not-allowed', currentPage >= totalPages);
    }
}

function switchTableType(dataSource) {
    const tables = {
        activities: document.getElementById('activitiesTableContainer'),
        peruacs: document.getElementById('perUacsTableContainer'),
        funds: document.getElementById('fundsTableContainer')
    };

    Object.values(tables).forEach(table => {
        if (table) table.classList.add('hidden');
    });

    if (tables[dataSource]) {
        tables[dataSource].classList.remove('hidden');
    }
}

// ===== PAGINATION =====

function initializePagination() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('#prevPage')) {
            if (currentPage > 1) {
                currentPage--;
                updateTableWithFilteredData(currentFilteredData);
            }
        }

        if (e.target.closest('#nextPage')) {
            const totalPages = Math.ceil(currentFilteredData.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                updateTableWithFilteredData(currentFilteredData);
            }
        }
    });

    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'pageInput') {
            commitPageInput();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.target && e.target.id === 'pageInput' && e.key === 'Enter') {
            e.preventDefault();
            commitPageInput();
        }
    });
}

function commitPageInput() {
    const pageInput = document.getElementById('pageInput');
    const totalPagesElement = document.getElementById('totalPages');
    if (!pageInput || !totalPagesElement) return;

    const pageNum = parseInt(pageInput.value, 10);
    const maxPage = parseInt(totalPagesElement.textContent, 10) || 1;

    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPage) {
        currentPage = pageNum;
        updateTableWithFilteredData(currentFilteredData);
    } else {
        pageInput.value = currentPage;
    }
}

// ===== MOBILE OVERLAYS =====

function initializeMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const overlay = document.getElementById('mobileMenuOverlay');
    const closeButton = document.getElementById('closeMobileMenu');

    if (!toggle || !overlay) return;

    toggle.addEventListener('click', function() {
        openOverlay(overlay, toggle);
    });

    if (closeButton) {
        closeButton.addEventListener('click', function() {
            closeOverlay(overlay, toggle);
        });
    }

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeOverlay(overlay, toggle);
        }
    });

    overlay.addEventListener('keydown', function(e) {
        handleOverlayKeydown(e, overlay, toggle);
    });
}

function initializeMobileFilters() {
    const toggle = document.getElementById('mobileFilterToggle');
    const overlay = document.getElementById('mobileFilterOverlay');
    const closeButton = document.getElementById('closeMobileFilters');

    if (!toggle || !overlay) return;

    toggle.addEventListener('click', function() {
        openOverlay(overlay, toggle);
    });

    if (closeButton) {
        closeButton.addEventListener('click', function() {
            closeOverlay(overlay, toggle);
        });
    }

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeOverlay(overlay, toggle);
        }
    });

    overlay.addEventListener('keydown', function(e) {
        handleOverlayKeydown(e, overlay, toggle);
    });
}

function openOverlay(overlay, toggle) {
    overlay.classList.remove('hidden');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');

    const focusTarget = overlay.querySelector('button, a[href]');
    if (focusTarget) focusTarget.focus();
}

function closeOverlay(overlay, toggle) {
    overlay.classList.add('hidden');
    if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
    }
}

function handleOverlayKeydown(e, overlay, toggle) {
    if (e.key === 'Escape') {
        e.preventDefault();
        closeOverlay(overlay, toggle);
        return;
    }

    if (e.key !== 'Tab') return;

    const focusable = overlay.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

// ===== HELPERS =====

function getModalityClass(modality) {
    if (!modality) return 'modality-unknown';

    const modalityLower = modality.toLowerCase();
    if (modalityLower.includes('online')) return 'modality-online';
    if (modalityLower.includes('face') || modalityLower.includes('f2f')) return 'modality-f2f';
    if (modalityLower.includes('hybrid')) return 'modality-hybrid';
    return 'modality-unknown';
}

function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatCurrency(amount) {
    if (amount === 0 || amount === '0' || amount === '-') return '₱0.00';

    const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;

    if (isNaN(numAmount)) return '₱0.00';

    return '₱' + numAmount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
