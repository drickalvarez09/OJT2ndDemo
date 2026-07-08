class GoogleSheetsConnector {
    constructor() {
        // Configuration file paths in connecttxt folder
        this.sheetIdConfig = 'connecttxt/googlesheets.txt';
        this.sheetId = null; // Will be loaded from config file
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
        this.cache = null;
        this.lastFetch = null;
        this.isInitialized = false;
    }

    // Initialize by loading the sheet ID from config file
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            this.sheetId = await this.loadConfig(this.sheetIdConfig);
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to load Google Sheets configuration:', error);
            throw error;
        }
    }

    // Load configuration from text file (shared method)
    async loadConfig(configFile) {
        try {
            const response = await fetch(configFile);
            if (!response.ok) {
                throw new Error(`Failed to load config file: ${response.status} ${response.statusText}`);
            }
            
            const configText = await response.text();
            const configValue = configText.trim();
            
            if (!configValue) {
                throw new Error(`Config file ${configFile} is empty`);
            }
            
            return configValue;
            
        } catch (error) {
            console.error(`Error loading config file ${configFile}:`, error);
            // Fallback to demo mode if config can't be loaded
            console.warn('Falling back to demo data mode for connector');
            return null;
        }
    }

async fetchAllData() {
    // Initialize first if needed
    if (!this.isInitialized) {
        await this.initialize();
    }

    // Check cache first
    if (this.cache && this.lastFetch && (Date.now() - this.lastFetch) < this.cacheDuration) {
        return this.cache;
    }

    try {
        
        // Check if we have a valid sheet ID
        if (!this.sheetId) {
            console.warn('No valid sheet ID configured, using demo data');
            return this.getDemoData();
        }
        
        
        // Fetch data from all sheets in parallel with timeout
        const fetchWithTimeout = async (sheetName, timeout = 10000) => {
            return Promise.race([
                this.fetchSheetData(sheetName),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Timeout fetching ${sheetName}`)), timeout)
                )
            ]);
        };

        const [activitiesData, fundsData, uacsData, programData] = await Promise.allSettled([
            fetchWithTimeout('Activities'),
            fetchWithTimeout('Funds'),
            fetchWithTimeout('Per UACS'),
            fetchWithTimeout('Program')
        ]);

        // Process the data
        const processedData = this.processData({
            activities: activitiesData.status === 'fulfilled' ? activitiesData.value : [],
            funds: fundsData.status === 'fulfilled' ? fundsData.value : [],
            uacs: uacsData.status === 'fulfilled' ? uacsData.value : [],
            program: programData.status === 'fulfilled' ? programData.value : []
        });
        
        // Cache the results
        this.cache = processedData;
        this.lastFetch = Date.now();

        return processedData;
        
    } catch (error) {
        console.error('Error fetching Google Sheets data:', error);
        // Return comprehensive demo data as fallback
        return this.getDemoData();
    }
}

    // ADDED MISSING METHOD: Process all data into unified structure
    processData(sheetData) {
        
        const activities = sheetData.activities || [];
        const funds = this.processFinancialData(sheetData.funds || []);
        const uacs = this.processFinancialData(sheetData.uacs || []);
        
        // Use UACS data as primary financial source (more accurate)
        const unifiedData = this.createUnifiedData(activities, uacs);
        
        // Generate all required data structures
        const processedData = {
            raw: {
                activities: activities,
                funds: funds,
                uacs: uacs,
                program: sheetData.program || [],
                unified: unifiedData
            },
            charts: {
                summary: this.generateChartSummary(unifiedData),
                programBreakdown: this.generateProgramBreakdown(unifiedData),
                provinceBreakdown: this.generateProvinceBreakdown(unifiedData),
                industryBreakdown: this.generateIndustryBreakdown(unifiedData),
                modalityBreakdown: this.generateModalityBreakdown(unifiedData)
            },
            filters: this.generateFilterOptions(unifiedData),
            financial: {
                totalAllocation: unifiedData.reduce((sum, item) => sum + (item.allocation || 0), 0),
                totalObligation: unifiedData.reduce((sum, item) => sum + (item.obligation || 0), 0),
                overallBUR: this.calculateOverallBUR(unifiedData)
            }
        };
        
        return processedData;
    }

    async fetchSheetData(sheetName) {
    if (!this.sheetId) {
        console.warn('No sheet ID configured, using demo data');
        return this.getDemoSheetData(sheetName);
    }

    const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error(`Failed to fetch ${sheetName}: HTTP ${response.status}`);
            return this.getDemoSheetData(sheetName);
        }
        
        const csvText = await response.text();
        
        const parsedData = this.parseCSV(csvText);
        
        if (parsedData.length > 0) {
        }
        
        return parsedData;
        
    } catch (error) {
        console.error(`Failed to load ${sheetName} sheet:`, error);
        return this.getDemoSheetData(sheetName);
    }
}

getDemoSheetData(sheetName) {
    
    switch(sheetName) {
        case 'Activities':
            return [
                {
                    'Component Program': 'Digital Startup Development and Acceleration Program',
                    'Activity': 'Startup Bootcamp 2024',
                    'Industry supported': 'Support to Startup Industry',
                    'Province': 'Metro Manila',
                    'Modality': 'Face-to-face',
                    'Start Date': '2024-01-15',
                    'End Date': '2024-01-20',
                    'Remarks and Details': '5-day intensive bootcamp for early-stage startups'
                },
                {
                    'Component Program': 'Project Support and Regional Activities',
                    'Activity': 'Regional ICT Summit',
                    'Industry supported': 'Support to Regional Activities',
                    'Province': 'Cebu',
                    'Modality': 'Hybrid',
                    'Start Date': '2024-02-10',
                    'End Date': '2024-02-12',
                    'Remarks and Details': 'Annual regional ICT conference'
                },
                {
                    'Component Program': 'Digital Startup Development and Acceleration Program',
                    'Activity': 'Investor Pitching Workshop',
                    'Industry supported': 'Support to Startup Industry',
                    'Province': 'Davao',
                    'Modality': 'Online',
                    'Start Date': '2024-03-05',
                    'End Date': '2024-03-05',
                    'Remarks and Details': 'Workshop on pitching to investors'
                }
            ];
            
        case 'Per UACS':
        case 'Funds':
            return [
                {
                    'Component Program': 'Digital Startup Development and Acceleration Program',
                    'Fund Source': 'FY 2025',
                    'Specific Activity': 'Startup Bootcamp',
                    'Sub-ARO No.': 'ICT-2024-001',
                    'Total Allocation per Sub-ARO': '₱500,000.00',
                    'Obligation': '₱350,000.00',
                    'Unobligated Balances': '₱150,000.00',
                    'BUR': '70%',
                    'Object Name': 'Training Expenses'
                },
                {
                    'Component Program': 'Project Support and Regional Activities',
                    'Fund Source': 'FY 2025',
                    'Specific Activity': 'Regional ICT Summit',
                    'Sub-ARO No.': 'ICT-2024-002',
                    'Total Allocation per Sub-ARO': '₱750,000.00',
                    'Obligation': '₱600,000.00',
                    'Unobligated Balances': '₱150,000.00',
                    'BUR': '80%',
                    'Object Name': 'Conference Expenses'
                },
                {
                    'Component Program': 'Digital Startup Development and Acceleration Program',
                    'Fund Source': 'FY 2025',
                    'Specific Activity': 'Investor Pitching Workshop',
                    'Sub-ARO No.': 'ICT-2024-003',
                    'Total Allocation per Sub-ARO': '₱250,000.00',
                    'Obligation': '₱125,000.00',
                    'Unobligated Balances': '₱125,000.00',
                    'BUR': '50%',
                    'Object Name': 'Workshop Expenses'
                }
            ];
            
        default:
            return [];
    }
}

    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return [];
        
        const headers = this.parseCSVLine(lines[0]);
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const row = {};
            
            headers.forEach((header, index) => {
                if (index < values.length) {
                    row[header] = values[index].trim();
                } else {
                    row[header] = '';
                }
            });
            
            // Only add row if it has meaningful data
            if (Object.values(row).some(value => value && value !== '')) {
                data.push(row);
            }
        }
        
        return data;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result.map(field => field.replace(/^"|"$/g, '').trim());
    }

    generateChartSummary(data) {
    // Use Per UACS data for financial calculations
    const financialItems = data.filter(item => item.type === 'financial' && item.allocation > 0);
    const activities = data.filter(item => item.type === 'activity');
    
    const totalAllocation = financialItems.reduce((sum, item) => sum + (item.allocation || 0), 0);
    const totalObligation = financialItems.reduce((sum, item) => sum + (item.obligation || 0), 0);
    const overallBUR = totalAllocation > 0 ? (totalObligation / totalAllocation) * 100 : 0;
    
    return {
        totalActivities: activities.length,
        totalAllocation: totalAllocation,
        totalObligation: totalObligation,
        activePrograms: new Set(activities.map(item => item['Component Program']).filter(Boolean)).size,
        overallBUR: overallBUR
    };
}


    generateProgramBreakdown(data) {
    const breakdown = {};
    
    // Use Per UACS data for financial breakdown (allocations)
    const financialItems = data.filter(item => item.type === 'financial' && item.allocation > 0);
    
    financialItems.forEach(item => {
        const program = item['Component Program'] || 'Uncategorized';
        if (!breakdown[program]) {
            breakdown[program] = { activities: 0, allocation: 0, obligation: 0 };
        }
        
        breakdown[program].allocation += item.allocation || 0;
        breakdown[program].obligation += item.obligation || 0;
    });
    
    // Use activities data for activity counts
    const activities = data.filter(item => item.type === 'activity');
    activities.forEach(item => {
        const program = item['Component Program'] || 'Uncategorized';
        if (!breakdown[program]) {
            breakdown[program] = { activities: 0, allocation: 0, obligation: 0 };
        }
        breakdown[program].activities += 1;
    });
    
    return breakdown;
}

    generateProvinceBreakdown(data) {
        const breakdown = {};
        
        // Count only activities
        const activities = data.filter(item => item.type === 'activity');
        
        activities.forEach(item => {
            const province = item.Province || 'Unknown';
            breakdown[province] = (breakdown[province] || 0) + 1;
        });
        
        return breakdown;
    }

    generateIndustryBreakdown(data) {
        const breakdown = {};
        
        // Count only activities
        const activities = data.filter(item => item.type === 'activity');
        
        activities.forEach(item => {
            const industry = item['Industry supported'] || 'Unknown';
            breakdown[industry] = (breakdown[industry] || 0) + 1;
        });
        
        return breakdown;
    }

    generateModalityBreakdown(data) {
        const breakdown = {};
        
        // Count only activities
        const activities = data.filter(item => item.type === 'activity');
        
        activities.forEach(item => {
            const modality = item.Modality || 'Unknown';
            breakdown[modality] = (breakdown[modality] || 0) + 1;
        });
        
        return breakdown;
    }

    processFinancialData(data) {
        return data.map(item => {
            const processed = { ...item };
            
            // Convert currency strings to numbers - FIXED PARSING
            if (item['Total Allocation per Sub-ARO']) {
                processed.parsedAllocation = this.parseCurrency(item['Total Allocation per Sub-ARO']);
            }
            if (item.Obligation) {
                processed.parsedObligation = this.parseCurrency(item.Obligation);
            }
            if (item['Unobligated Balances']) {
                processed.parsedUnobligated = this.parseCurrency(item['Unobligated Balances']);
            }
            if (item.BUR && typeof item.BUR === 'string') {
                processed.parsedBUR = parseFloat(item.BUR.replace('%', '')) || 0;
            }
            
            return processed;
        }).filter(item => item['Specific Activity'] || item['Component Program']);
    }

    // In connect.js, update the createUnifiedData method to ensure all necessary fields
// In connect.js, update the createUnifiedData method to ensure proper data structure
createUnifiedData(activities, funds) {
    const unified = [];
    
    
    // Process Per UACS data first (this is our primary financial data source)
    funds.forEach(fundItem => {
        // Create a comprehensive entry for each financial row
        const unifiedItem = {
            type: 'financial',
            'Component Program': fundItem['Component Program'] || 'Uncategorized',
            'Specific Activity': fundItem['Specific Activity'] || 'N/A',
            'Activity': fundItem['Specific Activity'] || 'N/A',
            'Industry supported': fundItem['Industry supported'] || 'N/A',
            'Province': fundItem.Province || 'N/A',
            'Modality': fundItem.Modality || 'N/A',
            'Fund Source': fundItem['Fund Source'] || 'N/A',
            'Sub-ARO No.': fundItem['Sub-ARO No.'] || 'N/A',
            'Object Name': fundItem['Object Name'] || 'N/A',
            allocation: fundItem.parsedAllocation || 0,
            obligation: fundItem.parsedObligation || 0,
            unobligated: fundItem.parsedUnobligated || 0,
            bur: fundItem.parsedBUR || 0
        };
        
        // Add legacy fields for compatibility with filter system
        unifiedItem['Total Allocation per Sub-ARO'] = unifiedItem.allocation;
        unifiedItem['Obligation'] = unifiedItem.obligation;
        unifiedItem['BUR'] = unifiedItem.bur;
        unifiedItem['Type'] = 'Financial';
        
        unified.push(unifiedItem);
    });
    
    // Add activities with financial data if available
    activities.forEach(activity => {
        const activityItem = {
            type: 'activity',
            ...activity,
            allocation: 0,
            obligation: 0,
            bur: 0,
            unobligated: 0
        };
        
        // Add legacy fields for compatibility
        activityItem['Total Allocation per Sub-ARO'] = 0;
        activityItem['Obligation'] = 0;
        activityItem['BUR'] = 0;
        activityItem['Type'] = 'Activity';
        
        unified.push(activityItem);
    });
    
    return unified;
}

    generateFilterOptions(data) {
        
        const programs = [...new Set(data.map(item => item['Component Program']).filter(Boolean))].sort();
        const industries = [...new Set(data.map(item => item['Industry supported']).filter(Boolean))].sort();
        const provinces = [...new Set(data.map(item => item.Province).filter(Boolean))].sort();
        const modalities = [...new Set(data.map(item => item.Modality).filter(Boolean))].sort();
        const fundSources = [...new Set(data.map(item => item['Fund Source']).filter(Boolean))].sort();
        
        const filterOptions = {
            programs: programs.filter(p => p !== 'N/A'),
            industries: industries.filter(i => i !== 'N/A'),
            provinces: provinces.filter(p => p !== 'N/A'),
            modalities: modalities.filter(m => m !== 'N/A'),
            fundSources: fundSources.filter(f => f !== 'N/A')
        };
        
        return filterOptions;
    }

    getUniqueValues(data, field) {
        const values = data.map(item => item[field])
            .filter(value => value && value.toString().trim() !== '')
            .map(value => value.toString().trim());
        return [...new Set(values)].sort();
    }

    parseCurrency(value) {
        if (!value || value === '' || value === 'N/A') return 0;
        if (typeof value === 'number') return value;
        
        
        // Handle currency format with commas and decimals
        let cleaned = value.toString().trim();
        
        // Remove currency symbols like ₱, $, etc.
        cleaned = cleaned.replace(/[₱$\s]/g, '');
        
        // If it's already a proper number with commas and decimal, parse it correctly
        if (cleaned.includes(',') && cleaned.includes('.')) {
            // Format: 371,127.00 - remove commas, keep decimal
            cleaned = cleaned.replace(/,/g, '');
        } else if (cleaned.includes(',') && !cleaned.includes('.')) {
            // Format: 371,127 - treat as thousands separator
            cleaned = cleaned.replace(/,/g, '');
        }
        
        const number = parseFloat(cleaned);
        
        if (isNaN(number)) {
            console.warn(`Could not parse currency value: "${value}" -> "${cleaned}"`);
            return 0;
        }
        
        return number;
    }

    calculateOverallBUR(data) {
        const totalAllocation = data.reduce((sum, item) => sum + (item.allocation || 0), 0);
        const totalObligation = data.reduce((sum, item) => sum + (item.obligation || 0), 0);
        
        return totalAllocation > 0 ? (totalObligation / totalAllocation) * 100 : 0;
    }

    getDemoData() {
        
        // Create demo unified data
        const demoUnifiedData = [
            {
                type: 'financial',
                'Component Program': 'Digital Startup Development and Acceleration Program',
                'Activity': 'Startup Bootcamp',
                'Specific Activity': 'Startup Bootcamp',
                'Industry supported': 'Support to Startup Industry',
                'Province': 'Regional Office',
                'Modality': 'Face-to-face',
                'Fund Source': 'FY 2025',
                'Sub-ARO No.': 'TEST-001',
                allocation: 500000.00,
                obligation: 0.00,
                unobligated: 500000.00,
                bur: 0
            },
            {
                type: 'financial',
                'Component Program': 'Project Support and Regional Activities',
                'Activity': 'Regional ICT Summit',
                'Specific Activity': 'Regional ICT Summit',
                'Industry supported': 'Support to Regional Activities',
                'Province': 'Pampanga',
                'Modality': 'Hybrid',
                'Fund Source': 'FY 2025',
                'Sub-ARO No.': 'TEST-002',
                allocation: 750000.00,
                obligation: 450000.00,
                unobligated: 300000.00,
                bur: 60
            }
        ];
        
        return {
            raw: {
                activities: [],
                funds: demoUnifiedData,
                uacs: demoUnifiedData,
                program: [],
                unified: demoUnifiedData
            },
            charts: {
                summary: this.generateChartSummary(demoUnifiedData),
                programBreakdown: this.generateProgramBreakdown(demoUnifiedData),
                provinceBreakdown: this.generateProvinceBreakdown(demoUnifiedData),
                industryBreakdown: this.generateIndustryBreakdown(demoUnifiedData),
                modalityBreakdown: this.generateModalityBreakdown(demoUnifiedData)
            },
            filters: this.generateFilterOptions(demoUnifiedData),
            financial: {
                totalAllocation: 1250000,
                totalObligation: 450000,
                overallBUR: 36
            }
        };
    }

    // Filter data based on current filter criteria
    filterData(data, filters) {
        if (!filters || Object.keys(filters).length === 0) {
            return data;
        }

        return data.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value || value === '') return true;
                
                const itemValue = item[key];
                if (!itemValue) return false;
                
                return itemValue.toString().toLowerCase().includes(value.toString().toLowerCase());
            });
        });
    }
}

// Initialize global connector
window.sheetsConnector = new GoogleSheetsConnector();
