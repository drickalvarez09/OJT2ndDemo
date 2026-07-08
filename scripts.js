// Scripts for DICT ICT Industry Development Dashboard
document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize all components
    initializeDropdowns();
    initializeFilters();
    initializeViewToggle();
    initializeMobileMenu();
    initializeMobileFilters();
    initializePagination();
    
    // Clear filters functionality
    const clearFiltersBtn = document.querySelector('.clear-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            clearAllFilters();
        });
    }
    
    // Initialize Google Sheets data
    if (window.sheetsIntegration) {
        window.sheetsIntegration.initialize().then(() => {
            return initializeSheetsData();
        }).then(() => {
            loadView('charts');
        }).catch(error => {
            console.error('Failed to initialize sheets data:', error);
            loadView('charts');
        });
    } else {
        console.warn('Sheets integration not available, loading view directly');
        loadView('charts');
    }
    
    // Update filter count
    updateFilterCount();
});

// Initialize mobile menu
function initializeMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const closeMobileMenu = document.getElementById('closeMobileMenu');
    
    if (mobileMenuToggle && mobileMenuOverlay && closeMobileMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenuOverlay.classList.remove('hidden');
        });
        
        closeMobileMenu.addEventListener('click', () => {
            mobileMenuOverlay.classList.add('hidden');
        });
        
        mobileMenuOverlay.addEventListener('click', (e) => {
            if (e.target === mobileMenuOverlay) {
                mobileMenuOverlay.classList.add('hidden');
            }
        });
    }
}

// Initialize mobile filters
function initializeMobileFilters() {
    const mobileFilterToggle = document.getElementById('mobileFilterToggle');
    const mobileFilterOverlay = document.getElementById('mobileFilterOverlay');
    const closeMobileFilters = document.getElementById('closeMobileFilters');
    
    if (mobileFilterToggle && mobileFilterOverlay && closeMobileFilters) {
        mobileFilterToggle.addEventListener('click', () => {
            mobileFilterOverlay.classList.remove('hidden');
        });
        
        closeMobileFilters.addEventListener('click', () => {
            mobileFilterOverlay.classList.add('hidden');
        });
        
        mobileFilterOverlay.addEventListener('click', (e) => {
            if (e.target === mobileFilterOverlay) {
                mobileFilterOverlay.classList.add('hidden');
            }
        });
    }
}

// Update filter count
function updateFilterCount() {
    const filterCountElement = document.getElementById('filterCount');
    if (!filterCountElement) return;
    
    let activeCount = 0;
    
    // Check desktop filters
    const desktopFilters = document.getElementById('desktopFilters');
    if (desktopFilters && !desktopFilters.classList.contains('hidden')) {
        const selects = desktopFilters.querySelectorAll('select.filter-select');
        const searchInput = desktopFilters.querySelector('input.filter-input[type="text"]');
        
        selects.forEach(select => {
            if (select.value && select.value !== '') {
                activeCount++;
            }
        });
        
        if (searchInput && searchInput.value.trim()) {
            activeCount++;
        }
    }
    
    // Check mobile filters
    const mobileOverlay = document.getElementById('mobileFilterOverlay');
    if (mobileOverlay && !mobileOverlay.classList.contains('hidden')) {
        const selects = mobileOverlay.querySelectorAll('select.filter-select');
        const searchInput = mobileOverlay.querySelector('input.filter-input[type="text"]');
        
        selects.forEach(select => {
            if (select.value && select.value !== '') {
                activeCount++;
            }
        });
        
        if (searchInput && searchInput.value.trim()) {
            activeCount++;
        }
    }
    
    filterCountElement.textContent = `${activeCount} Active`;
}

// Pagination state
let currentPage = 1;
const itemsPerPage = 10;
let currentFilteredData = [];
let currentView = 'charts';

function initializePagination() {
    document.addEventListener('click', function(e) {
        if (e.target && (e.target.id === 'prevPage' || e.target.closest('#prevPage'))) {
            if (currentPage > 1) {
                currentPage--;
                updateTableWithFilteredData(currentFilteredData);
            }
        }

        if (e.target && (e.target.id === 'nextPage' || e.target.closest('#nextPage'))) {
            const totalPages = Math.ceil(currentFilteredData.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                updateTableWithFilteredData(currentFilteredData);
            }
        }
        
        // Page input handling
        if (e.target && e.target.id === 'pageInput') {
            const pageInput = document.getElementById('pageInput');
            const totalPages = document.getElementById('totalPages');
            if (pageInput && totalPages) {
                const pageNum = parseInt(pageInput.value);
                const maxPage = parseInt(totalPages.textContent);
                
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPage) {
                    currentPage = pageNum;
                    updateTableWithFilteredData(currentFilteredData);
                } else {
                    pageInput.value = currentPage;
                }
            }
        }
    });
}

async function initializeSheetsData() {
    if (!window.sheetsIntegration) {
        console.error('Sheets integration not available');
        return;
    }

    try {
        const data = await window.sheetsIntegration.fetchData();
        window.currentData = data;
        
        // Update filter dropdowns with actual data
        setTimeout(() => {
            updateFilterDropdowns(data);
        }, 300);
        
    } catch (error) {
        console.error('Error initializing sheets data:', error);
        throw error;
    }
}

function updateFilterDropdowns(data) {
    if (!data || !data.filterOptions) {
        console.error('No data or filter options available');
        return;
    }


    // Update desktop filters
    updateDropdown('Component Program', data.filterOptions.programs);
    updateDropdown('Industry Supported', data.filterOptions.industries);
    updateDropdown('Province', data.filterOptions.provinces);
    updateDropdown('Modality', data.filterOptions.modalities);
    
    // Update mobile filters
    updateMobileDropdown('Component Program', data.filterOptions.programs);
    updateMobileDropdown('Industry Supported', data.filterOptions.industries);
    updateMobileDropdown('Province', data.filterOptions.provinces);
    updateMobileDropdown('Modality', data.filterOptions.modalities);
}

function updateDropdown(filterType, options) {
    if (!options || options.length === 0) {
        console.warn(`No options available for ${filterType}`);
        return;
    }

    // Target desktop filters
    const desktopFilters = document.getElementById('desktopFilters');
    if (!desktopFilters) {
        console.error('Desktop filters container not found');
        return;
    }

    // Find the select within desktop filters
    const selects = desktopFilters.querySelectorAll('select.filter-select');
    let targetSelect = null;

    selects.forEach(select => {
        const label = select.previousElementSibling;
        if (label && label.textContent.includes(filterType)) {
            targetSelect = select;
        }
    });

    if (!targetSelect) {
        console.warn(`Could not find select for ${filterType}`);
        return;
    }

    // Clear existing options except the first one
    while (targetSelect.options.length > 1) {
        targetSelect.remove(1);
    }

    // Add new options
    const validOptions = [...new Set(options.filter(option => 
        option && option.trim() !== '' && option !== 'N/A'
    ))];
    
    validOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        targetSelect.appendChild(optionElement);
    });

}

function updateMobileDropdown(filterType, options) {
    const mobileOverlay = document.getElementById('mobileFilterOverlay');
    if (!mobileOverlay) return;

    const mobileSelects = mobileOverlay.querySelectorAll('select.filter-select');
    let targetSelect = null;

    mobileSelects.forEach(select => {
        const label = select.previousElementSibling;
        if (label && label.textContent.includes(filterType)) {
            targetSelect = select;
        }
    });

    if (!targetSelect) {
        console.warn(`Could not find mobile select for ${filterType}`);
        return;
    }

    // Clear existing options except the first one
    while (targetSelect.options.length > 1) {
        targetSelect.remove(1);
    }

    // Add new options
    const validOptions = [...new Set(options.filter(option => 
        option && option.trim() !== '' && option !== 'N/A'
    ))];
    
    validOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        targetSelect.appendChild(optionElement);
    });
}

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
        // Reset both buttons
        chartsBtn.className = 'view-toggle inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-600 text-sm px-4 py-2 shadow-xs';
        sheetsBtn.className = 'view-toggle inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-600 text-sm px-4 py-2 shadow-xs';
        
        // Set active button
        if (view === 'charts') {
            chartsBtn.className = 'view-toggle inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-600 text-sm px-4 py-2 shadow-xs';
        } else {
            sheetsBtn.className = 'view-toggle inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-600 text-sm px-4 py-2 shadow-xs';
        }
    }
}

function loadView(viewType) {
    const container = document.getElementById('contentContainer');
    if (!container) return;
    
    const filePath = viewType === 'charts' ? 'charts.html' : 'sheets.html';
    
    // Show loading state
    container.innerHTML = `
        <div class="flex items-center justify-center h-64">
            <div class="text-center">
                <i class="fas fa-spinner fa-spin text-3xl text-[#0052BC] mb-2"></i>
                <p class="text-gray-500">Loading ${viewType} view...</p>
            </div>
        </div>
    `;

    fetch(filePath)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load ${filePath}`);
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;
            
            if (viewType === 'charts') {
                setTimeout(() => {
                    initializeChartsWithCurrentData();
                    // Add event listener for "View Table" button
                    const switchToSheets = document.getElementById('switchToSheets');
                    if (switchToSheets) {
                        switchToSheets.addEventListener('click', function() {
                            setActiveView('sheets');
                            loadView('sheets');
                        });
                    }
                }, 500);
            } else if (viewType === 'sheets') {
                waitForConnectorData(() => {
                    initializeDataSourceToggles();
                    setActiveDataSource('activities');
                    
                    if (currentFilteredData.length > 0) {
                        updateTableWithDataSource();
                    } else {
                        updateTableWithDataSource();
                    }
                });
            }
            
            // Update filter count
            updateFilterCount();
        })
        .catch(error => {
            console.error('Error loading view:', error);
            container.innerHTML = `
                <div class="flex items-center justify-center h-64">
                    <div class="text-center">
                        <i class="fas fa-exclamation-triangle text-3xl text-red-500 mb-2"></i>
                        <p class="text-gray-500">Error loading ${viewType} view</p>
                        <button onclick="loadView('${viewType}')" class="mt-2 bg-[#0052BC] text-white px-4 py-2 rounded hover:bg-[#0041a3] transition-colors">
                            Retry
                        </button>
                    </div>
                </div>
            `;
        });
}

function initializeChartsWithCurrentData() {
    
    // Check if chart containers exist
    const chartContainers = [
        'programBudgetChart',
        'provincesPieChart', 
        'industryChart',
        'modalityChart'
    ];
    
    const allContainersExist = chartContainers.every(id => {
        const exists = document.getElementById(id);
        if (!exists) {
            console.warn(`Chart container ${id} not found`);
        }
        return exists;
    });
    
    if (!allContainersExist) {
        console.error('Not all chart containers are available, retrying...');
        setTimeout(initializeChartsWithCurrentData, 300);
        return;
    }
    
    // Ensure Chart.js and ChartRenderer are available
    if (typeof Chart === 'undefined' || typeof ChartRenderer === 'undefined') {
        console.error('Chart dependencies not loaded yet, retrying...');
        setTimeout(initializeChartsWithCurrentData, 300);
        return;
    }
    
    // Update summary cards first
    updateChartsSummaryCards();
    
    // Generate chart data
    let chartData;
    
    if (window.sheetsConnector && window.sheetsConnector.cache) {
        const connectorData = window.sheetsConnector.cache;
        
        const hasValidFilteredData = currentFilteredData && 
                                    currentFilteredData.length > 0 && 
                                    !isEmptyChartData(currentFilteredData);
        
        if (hasValidFilteredData) {
            chartData = generateChartDataFromFilteredData(currentFilteredData);
        } else {
            // Use unified data from connector
            const unifiedData = connectorData.raw.unified || [];
            chartData = generateChartDataFromFilteredData(unifiedData);
        }
    } else if (window.currentData) {
        chartData = {
            programBreakdown: window.currentData.financialSummary?.programBreakdown || {},
            provinceBreakdown: window.currentData.summary?.provinces || {},
            industryBreakdown: window.currentData.summary?.industries || {},
            modalityBreakdown: window.currentData.summary?.modalities || {}
        };
    } else {
        console.warn('No data available for charts');
        return;
    }
    
    
    // Destroy any existing charts first
    if (window.chartRenderer) {
        window.chartRenderer.destroyAllCharts();
    }
    
    // Create new chart renderer instance
    window.chartRenderer = new ChartRenderer();
    
    // Initialize charts with the data
    window.chartRenderer.initializeCharts(chartData);
    
}

function isEmptyChartData(filteredData) {
    if (!filteredData || filteredData.length === 0) return true;
    
    const hasContent = filteredData.some(item => {
        return item['Component Program'] || item.Province || item['Industry supported'] || item.Modality;
    });
    
    return !hasContent;
}

function cleanupCharts() {
    if (window.chartRenderer) {
        window.chartRenderer.destroyAllCharts();
    }
}

function updateChartsSummaryCards() {
    if (!window.currentData) {
        console.error('No data available for charts');
        return;
    }
    
    const financial = window.currentData.financial;
    const summary = window.currentData.summary;
    
    
    setTimeout(() => {
        updateChartsElement('totalActivities', summary.totalActivities || 0);
        updateChartsElement('totalBudget', formatCurrency(financial.totalAllocation || 0));
        updateChartsElement('budgetUtilization', (financial.overallBUR || 0).toFixed(1) + '%');
        updateChartsElement('utilizationAmount', formatCurrency(financial.totalObligation || 0) + ' Obligated');
        updateChartsElement('activePrograms', summary.activePrograms || 0);
    }, 100);
}

function updateChartsElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function initializeDropdowns() {
    const dropdownButtons = document.querySelectorAll('.dropdown-btn');
    
    dropdownButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            hideAllDropdowns();
        });

        button.addEventListener('click', function(e) {
            e.preventDefault();
            hideAllDropdowns();
        });
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.relative')) {
            hideAllDropdowns();
        }
    });
}

function hideAllDropdowns() {
    // Implementation depends on your dropdown structure
}

function initializeFilters() {
    const filterInputs = document.querySelectorAll('.filter-input, .filter-select');
    
    filterInputs.forEach(input => {
        input.addEventListener('change', function() {
            applyFilters();
            updateFilterCount();
        });
        
        if (input.type === 'text') {
            input.addEventListener('input', debounce(function() {
                applyFilters();
                updateFilterCount();
            }, 300));
        }
    });
}

function applyFilters() {
    const filters = getCurrentFilters();
    
    let filteredData = [];
    
    if (window.sheetsConnector && window.sheetsConnector.cache) {
        const connectorData = window.sheetsConnector.cache;
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
        
        
        currentFilteredData = filteredData;
        currentPage = 1;
        
        if (currentView === 'charts') {
            updateContentWithFilteredData(filteredData);
        } else if (currentView === 'sheets') {
            updateSheetsSummaryCards(filteredData);
            updateTableWithFilteredData(filteredData);
        }
    } else {
        setTimeout(() => {
            if (window.sheetsConnector && window.sheetsConnector.cache) {
                applyFilters();
            }
        }, 500);
    }
    
    updateFilterCount();
}

function getCurrentFilters() {
    const filters = {};
    
    // Get search input - check both desktop and mobile
    let searchInput = document.querySelector('#desktopFilters .filter-input[type="text"]');
    if (!searchInput || !searchInput.value.trim()) {
        const mobileSearch = document.querySelector('#mobileFilterOverlay .filter-input[type="text"]');
        if (mobileSearch && mobileSearch.value.trim()) {
            searchInput = mobileSearch;
        }
    }
    
    if (searchInput && searchInput.value.trim()) {
        filters.search = searchInput.value.trim();
    }
    
    // Get select filters - check desktop first, then mobile
    const getSelectValue = (filterType) => {
        // Check desktop
        const desktopSelect = getSelectByLabel('#desktopFilters', filterType);
        if (desktopSelect && desktopSelect.value && desktopSelect.value !== '') {
            return desktopSelect.value;
        }
        
        // Check mobile
        const mobileSelect = getSelectByLabel('#mobileFilterOverlay', filterType);
        if (mobileSelect && mobileSelect.value && mobileSelect.value !== '') {
            return mobileSelect.value;
        }
        
        return null;
    };
    
    const programFilter = getSelectValue('Component Program');
    if (programFilter) filters['Component Program'] = programFilter;
    
    const industryFilter = getSelectValue('Industry Supported');
    if (industryFilter) filters['Industry supported'] = industryFilter;
    
    const provinceFilter = getSelectValue('Province');
    if (provinceFilter) filters['Province'] = provinceFilter;
    
    const modalityFilter = getSelectValue('Modality');
    if (modalityFilter) filters['Modality'] = modalityFilter;
    
    return filters;
}

function getSelectByLabel(containerId, filterType) {
    const container = document.querySelector(containerId);
    if (!container) return null;
    
    const selects = container.querySelectorAll('select.filter-select');
    for (const select of selects) {
        const label = select.previousElementSibling;
        if (label && label.textContent.includes(filterType)) {
            return select;
        }
    }
    return null;
}

function updateContentWithFilteredData(filteredData) {
    
    if (currentView === 'charts') {
        const chartData = generateChartDataFromFilteredData(filteredData);
        
        const hasValidChartData = chartData && 
                                chartData.programBreakdown && 
                                Object.keys(chartData.programBreakdown).length > 0;
        
        if (!hasValidChartData) {
            console.warn('No valid chart data after filtering, using fallback data');
            if (window.sheetsConnector && window.sheetsConnector.cache) {
                const connectorData = window.sheetsConnector.cache;
                const unifiedData = connectorData.raw.unified || [];
                const fallbackChartData = generateChartDataFromFilteredData(unifiedData);
                if (window.chartRenderer) {
                    window.chartRenderer.updateCharts(fallbackChartData);
                }
            }
        } else {
            if (window.chartRenderer) {
                window.chartRenderer.updateCharts(chartData);
            } else {
                initializeChartsWithCurrentData();
            }
        }
        
        updateFilteredChartsSummaryCards(filteredData);
    }
    
    if (currentView === 'sheets' && document.querySelector('.sheets-container')) {
        updateSheetsSummaryCards(filteredData);
        updateTableWithFilteredData(filteredData);
    }
}

function updateFilteredChartsSummaryCards(filteredData) {
    
    const summaryCards = document.querySelectorAll('.summary-card');
    summaryCards.forEach(card => {
        card.classList.add('updating');
    });
    
    let totalAllocation = 0;
    let totalObligation = 0;
    let activityCount = 0;
    const uniquePrograms = new Set();
    
    filteredData.forEach(item => {
        const isConnectorFormat = item.hasOwnProperty('type');
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
    
    setTimeout(() => {
        updateChartsElement('totalActivities', activityCount);
    }, 100);
    
    setTimeout(() => {
        updateChartsElement('totalBudget', formatCurrency(totalAllocation));
    }, 200);
    
    setTimeout(() => {
        updateChartsElement('budgetUtilization', utilizationRate.toFixed(1) + '%');
        updateChartsElement('utilizationAmount', formatCurrency(totalObligation) + ' Obligated');
    }, 300);
    
    setTimeout(() => {
        updateChartsElement('activePrograms', uniquePrograms.size);
        
        summaryCards.forEach(card => {
            card.classList.remove('updating');
        });
    }, 400);
}

function generateChartDataFromFilteredData(filteredData) {
    const programBreakdown = {};
    const provinceBreakdown = {};
    const industryBreakdown = {};
    const modalityBreakdown = {};
    
    filteredData.forEach(item => {
        const isConnectorFormat = item.hasOwnProperty('type');
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
            const allocation = parseFloat(item['Total Allocation per Sub-ARO']) || 0;
            const obligation = parseFloat(item.Obligation) || 0;
            programBreakdown[program].allocation += allocation;
            programBreakdown[program].obligation += obligation;
        }
    });
    
    return {
        programBreakdown,
        provinceBreakdown,
        industryBreakdown,
        modalityBreakdown
    };
}

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
    let totalUnobligated = 0;
    
    filteredData.forEach(item => {
        const allocation = item.parsedAllocation || item.allocation || 0;
        const obligation = item.parsedObligation || item.obligation || 0;
        const unobligated = item.parsedUnobligated || item.unobligated || 0;
        
        totalAllocation += allocation;
        totalObligation += obligation;
        totalUnobligated += unobligated;
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

let currentDataSource = 'activities';
let currentDataSourceData = {
    activities: [],
    peruacs: [],
    funds: []
};

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
        // Reset all buttons
        activitiesBtn.className = 'data-source-btn px-3 sm:px-4 py-2 border-b-2 font-medium flex items-center whitespace-nowrap text-gray-800 hover:text-blue-600 border-transparent';
        perUacsBtn.className = 'data-source-btn px-3 sm:px-4 py-2 border-b-2 font-medium flex items-center whitespace-nowrap text-gray-800 hover:text-blue-600 border-transparent';
        fundsBtn.className = 'data-source-btn px-3 sm:px-4 py-2 border-b-2 font-medium flex items-center whitespace-nowrap text-gray-800 hover:text-blue-600 border-transparent';
        
        // Set active button
        if (source === 'activities') {
            activitiesBtn.className = 'data-source-btn px-3 sm:px-4 py-2 border-b-2 font-medium flex items-center whitespace-nowrap border-blue-500 text-blue-600';
        } else if (source === 'peruacs') {
            perUacsBtn.className = 'data-source-btn px-3 sm:px-4 py-2 border-b-2 font-medium flex items-center whitespace-nowrap border-blue-500 text-blue-600';
        } else if (source === 'funds') {
            fundsBtn.className = 'data-source-btn px-3 sm:px-4 py-2 border-b-2 font-medium flex items-center whitespace-nowrap border-blue-500 text-blue-600';
        }
    }
    
    // Switch table type
    switchTableType(source);
    
    // Update the table with the selected data source
    updateTableWithDataSource();
}

function updateFilterVisibility(dataSource) {
    // This function is called from chart-renderer, but not used in new design
}

function updateTableWithDataSource() {
    if (!window.sheetsConnector) {
        console.warn('No connector available');
        return;
    }
    
    if (!window.sheetsConnector.cache) {
        setTimeout(updateTableWithDataSource, 500);
        return;
    }
    
    const connectorData = window.sheetsConnector.cache;
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
    
    currentDataSourceData[currentDataSource] = dataToShow;
    
    const filters = getCurrentFilters();
    let filteredData = filterDataSourceData(dataToShow, filters);
    
    
    currentFilteredData = filteredData;
    currentPage = 1;
    updateSheetsSummaryCards(filteredData);
    updateTableWithFilteredData(filteredData);
}

function filterDataSourceData(data, filters) {
    if (!data || !Array.isArray(data)) {
        console.warn('Invalid data for filtering:', data);
        return [];
    }
    
    let filtered = [...data];
    
    if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filtered = filtered.filter(item => {
            return Object.values(item).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            );
        });
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
    
    updatePaginationInfo(filteredData.length, Math.min(itemsPerPage, filteredData.length), Math.ceil(filteredData.length / itemsPerPage));
}


function updateActivitiesTable(filteredData) {
    const tableBody = document.getElementById('activitiesTableBody');
    if (!tableBody) {
        console.warn('Activities table body not found');
        return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    tableBody.innerHTML = '';
    
    if (paginatedData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="8" class="px-6 py-8 text-center text-sm text-gray-500">
                <div class="flex flex-col items-center justify-center">
                    <i class="fas fa-search text-2xl mb-2 text-gray-400"></i>
                    <p>No activities found matching the current filters</p>
                    <p class="text-xs mt-1">Try adjusting your search criteria</p>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    } else {
        paginatedData.forEach(item => {
            const row = document.createElement('tr');
            
            // Format dates if they exist
            const startDate = item['Start Date'] ? formatDate(item['Start Date']) : 'N/A';
            const endDate = item['End Date'] ? formatDate(item['End Date']) : 'N/A';
            
            row.innerHTML = `
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
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${startDate}</td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${endDate}</td>
                <td class="px-4 py-4 whitespace-normal text-sm text-gray-500">
                    ${escapeHtml(item['Remarks and Details'] || item['Activity Details'] || 'N/A')}
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    updatePaginationInfo(filteredData.length, paginatedData.length, totalPages);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        // Try to parse the date
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Return original if can't parse
        
        return date.toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

function updatePerUacsTable(filteredData) {
    const tableBody = document.getElementById('perUacsTableBody');
    if (!tableBody) {
        console.warn('Per UACS table body not found');
        return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    tableBody.innerHTML = '';
    
    if (paginatedData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="8" class="px-6 py-8 text-center text-sm text-gray-500">
                <div class="flex flex-col items-center justify-center">
                    <i class="fas fa-search text-2xl mb-2 text-gray-400"></i>
                    <p>No Per UACS data found matching the current filters</p>
                    <p class="text-xs mt-1">Try adjusting your search criteria</p>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    } else {
        paginatedData.forEach(item => {
            const row = document.createElement('tr');
            
            const allocation = item.parsedAllocation || item.allocation || 0;
            const obligation = item.parsedObligation || item.obligation || 0;
            const bur = item.parsedBUR || item.bur || 0;
            const unobligated = item.parsedUnobligated || item.unobligated || 0;
            
            row.innerHTML = `
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
            `;
            tableBody.appendChild(row);
        });
    }
    
    updatePaginationInfo(filteredData.length, paginatedData.length, totalPages);
}


function updateFundsTable(filteredData) {
    const tableBody = document.getElementById('fundsTableBody');
    if (!tableBody) {
        console.warn('Funds table body not found');
        return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    tableBody.innerHTML = '';
    
    if (paginatedData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="8" class="px-6 py-8 text-center text-sm text-gray-500">
                <div class="flex flex-col items-center justify-center">
                    <i class="fas fa-search text-2xl mb-2 text-gray-400"></i>
                    <p>No Funds data found matching the current filters</p>
                    <p class="text-xs mt-1">Try adjusting your search criteria</p>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    } else {
        paginatedData.forEach(item => {
            const row = document.createElement('tr');
            
            const allocation = item.parsedAllocation || item.allocation || 0;
            const obligation = item.parsedObligation || item.obligation || 0;
            const bur = item.parsedBUR || item.bur || 0;
            const unobligated = item.parsedUnobligated || item.unobligated || 0;
            
            row.innerHTML = `
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
            `;
            tableBody.appendChild(row);
        });
    }
    
    updatePaginationInfo(filteredData.length, paginatedData.length, totalPages);
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
            paginationInfo.textContent = 'No activities found';
        } else {
            paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${total} activities (Page ${currentPage} of ${totalPages})`;
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
    const activitiesTable = document.getElementById('activitiesTableContainer');
    const perUacsTable = document.getElementById('perUacsTableContainer');
    const fundsTable = document.getElementById('fundsTableContainer');
    
    activitiesTable.classList.add('hidden');
    perUacsTable.classList.add('hidden');
    fundsTable.classList.add('hidden');
    
    if (dataSource === 'activities') {
        activitiesTable.classList.remove('hidden');
    } else if (dataSource === 'peruacs') {
        perUacsTable.classList.remove('hidden');
    } else if (dataSource === 'funds') {
        fundsTable.classList.remove('hidden');
    }
}

function getModalityClass(modality) {
    if (!modality) return 'modality-unknown';
    
    const modalityLower = modality.toLowerCase();
    if (modalityLower.includes('online')) return 'modality-online';
    if (modalityLower.includes('face') || modalityLower.includes('f2f')) return 'modality-f2f';
    if (modalityLower.includes('hybrid')) return 'modality-hybrid';
    return 'modality-unknown';
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

function clearAllFilters() {
    
    // Clear desktop filters
    const desktopFilters = document.getElementById('desktopFilters');
    if (desktopFilters) {
        const inputs = desktopFilters.querySelectorAll('.filter-input, .filter-select');
        inputs.forEach(input => {
            if (input.type === 'text') {
                input.value = '';
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            }
        });
    }
    
    // Clear mobile filters
    const mobileOverlay = document.getElementById('mobileFilterOverlay');
    if (mobileOverlay) {
        const inputs = mobileOverlay.querySelectorAll('.filter-input, .filter-select');
        inputs.forEach(input => {
            if (input.type === 'text') {
                input.value = '';
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            }
        });
    }
    
    currentFilteredData = [];
    applyFilters();
    updateFilterCount();
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

function waitForConnectorData(callback, maxAttempts = 10) {
    let attempts = 0;
    
    function checkConnector() {
        attempts++;
        if (window.sheetsConnector && window.sheetsConnector.cache) {
            callback();
        } else if (attempts < maxAttempts) {
            setTimeout(checkConnector, 500);
        } else {
            console.error('Connector data not available after maximum attempts');
        }
    }
    
    checkConnector();
}

function forceTableRefresh() {
    if (currentView === 'sheets') {
        const tables = [
            document.getElementById('activitiesTableContainer'),
            document.getElementById('perUacsTableContainer'),
            document.getElementById('fundsTableContainer')
        ];
        
        tables.forEach(table => {
            if (table && !table.classList.contains('hidden')) {
                // Force a reflow
                table.style.display = 'none';
                setTimeout(() => {
                    table.style.display = 'block';
                }, 10);
            }
        });
    }
}

// Call this after table updates
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
    
    updatePaginationInfo(filteredData.length, Math.min(itemsPerPage, filteredData.length), Math.ceil(filteredData.length / itemsPerPage));
    
    // Force refresh to fix alignment
    setTimeout(forceTableRefresh, 100);
}

// Make functions globally available
window.loadView = loadView;
window.initializeCharts = initializeChartsWithCurrentData;
window.applyFilters = applyFilters;
window.clearAllFilters = clearAllFilters;
window.updateTableWithFilteredData = updateTableWithFilteredData;
window.setActiveDataSource = setActiveDataSource;
window.updateTableWithDataSource = updateTableWithDataSource;