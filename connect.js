class GoogleSheetsConnector {
    constructor() {
        this.sheetIdConfig = 'connecttxt/googlesheets.txt';
        this.sheetId = null;
        this.cacheDuration = 5 * 60 * 1000;
        this.cache = null;
        this.lastFetch = null;
        this.isInitialized = false;
    }

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

    async loadConfig(configFile) {
        try {
            const response = await fetch(configFile);
            if (!response.ok) {
                throw new Error(`Failed to load config file: ${response.status} ${response.statusText}`);
            }

            const configValue = (await response.text()).trim();

            if (!configValue) {
                throw new Error(`Config file ${configFile} is empty`);
            }

            return configValue;
        } catch (error) {
            console.error(`Error loading config file ${configFile}:`, error);
            console.warn('Falling back to demo data mode for connector');
            return null;
        }
    }

    async fetchAllData() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.cache && this.lastFetch && (Date.now() - this.lastFetch) < this.cacheDuration) {
            return this.cache;
        }

        try {
            if (!this.sheetId) {
                console.warn('No valid sheet ID configured, using demo data');
                return this.storeCache(this.getDemoData());
            }

            const fetchWithTimeout = (sheetName, timeout = 10000) => {
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

            const processedData = this.processData({
                activities: activitiesData.status === 'fulfilled' ? activitiesData.value : [],
                funds: fundsData.status === 'fulfilled' ? fundsData.value : [],
                uacs: uacsData.status === 'fulfilled' ? uacsData.value : [],
                program: programData.status === 'fulfilled' ? programData.value : []
            });

            return this.storeCache(processedData);
        } catch (error) {
            console.error('Error fetching Google Sheets data:', error);
            return this.storeCache(this.getDemoData());
        }
    }

    storeCache(data) {
        this.cache = data;
        this.lastFetch = Date.now();
        return data;
    }

    processData(sheetData) {
        const activities = sheetData.activities || [];
        const funds = this.processFinancialData(sheetData.funds || []);
        const uacs = this.processFinancialData(sheetData.uacs || []);

        // Use UACS data as primary financial source (more accurate)
        const unifiedData = this.createUnifiedData(activities, uacs);

        return {
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

            return this.parseCSV(await response.text());
        } catch (error) {
            console.error(`Failed to load ${sheetName} sheet:`, error);
            return this.getDemoSheetData(sheetName);
        }
    }

    getDemoSheetData(sheetName) {
        switch (sheetName) {
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
        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;

        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];

            if (inQuotes) {
                if (char === '"') {
                    if (csvText[i + 1] === '"') {
                        field += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field += char;
                }
            } else if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                row.push(field);
                field = '';
            } else if (char === '\n' || char === '\r') {
                if (char === '\r' && csvText[i + 1] === '\n') {
                    i++;
                }
                row.push(field);
                field = '';
                if (row.some(value => value.trim() !== '')) {
                    rows.push(row);
                }
                row = [];
            } else {
                field += char;
            }
        }

        row.push(field);
        if (row.some(value => value.trim() !== '')) {
            rows.push(row);
        }

        if (rows.length < 2) return [];

        const headers = rows[0].map(header => header.replace(/^﻿/, '').trim());

        return rows.slice(1).map(values => {
            const item = {};
            headers.forEach((header, index) => {
                item[header] = (values[index] || '').trim();
            });
            return item;
        }).filter(item => Object.values(item).some(value => value !== ''));
    }

    generateChartSummary(data) {
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

        const financialItems = data.filter(item => item.type === 'financial' && item.allocation > 0);

        financialItems.forEach(item => {
            const program = item['Component Program'] || 'Uncategorized';
            if (!breakdown[program]) {
                breakdown[program] = { activities: 0, allocation: 0, obligation: 0 };
            }

            breakdown[program].allocation += item.allocation || 0;
            breakdown[program].obligation += item.obligation || 0;
        });

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
        const activities = data.filter(item => item.type === 'activity');

        activities.forEach(item => {
            const province = item.Province || 'Unknown';
            breakdown[province] = (breakdown[province] || 0) + 1;
        });

        return breakdown;
    }

    generateIndustryBreakdown(data) {
        const breakdown = {};
        const activities = data.filter(item => item.type === 'activity');

        activities.forEach(item => {
            const industry = item['Industry supported'] || 'Unknown';
            breakdown[industry] = (breakdown[industry] || 0) + 1;
        });

        return breakdown;
    }

    generateModalityBreakdown(data) {
        const breakdown = {};
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

    createUnifiedData(activities, funds) {
        const unified = [];

        funds.forEach(fundItem => {
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

            unifiedItem['Total Allocation per Sub-ARO'] = unifiedItem.allocation;
            unifiedItem['Obligation'] = unifiedItem.obligation;
            unifiedItem['BUR'] = unifiedItem.bur;
            unifiedItem['Type'] = 'Financial';

            unified.push(unifiedItem);
        });

        activities.forEach(activity => {
            const activityItem = {
                type: 'activity',
                ...activity,
                allocation: 0,
                obligation: 0,
                bur: 0,
                unobligated: 0
            };

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

        return {
            programs: programs.filter(value => value !== 'N/A'),
            industries: industries.filter(value => value !== 'N/A'),
            provinces: provinces.filter(value => value !== 'N/A'),
            modalities: modalities.filter(value => value !== 'N/A'),
            fundSources: fundSources.filter(value => value !== 'N/A')
        };
    }

    parseCurrency(value) {
        if (!value || value === '' || value === 'N/A') return 0;
        if (typeof value === 'number') return value;

        let cleaned = value.toString().trim();
        cleaned = cleaned.replace(/[₱$\s]/g, '');

        if (cleaned.includes(',')) {
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
}

// Initialize global connector
window.sheetsConnector = new GoogleSheetsConnector();
