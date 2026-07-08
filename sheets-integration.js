// Google Sheets Integration for DICT ICT Industry Development
class GoogleSheetsIntegration {
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

    // Load configuration from text file
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
            console.warn('Falling back to demo data mode');
            return null;
        }
    }

    async fetchData() {
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

            // Use the connector for data fetching
            if (window.sheetsConnector) {
                const connectorData = await window.sheetsConnector.fetchAllData();
                this.cache = this.transformToLegacyFormat(connectorData);
                this.lastFetch = Date.now();
                return this.cache;
            }
            
            // Fallback to direct fetching if connector not available
            const [activitiesData, fundsData, uacsData, programData] = await Promise.all([
                this.fetchSheetData('Activities'),
                this.fetchSheetData('Funds'),
                this.fetchSheetData('Per UACS'),
                this.fetchSheetData('Program')
            ]);
            
            const processedData = this.processAllData({
                activities: activitiesData,
                funds: fundsData,
                uacs: uacsData,
                program: programData
            });
            
            this.cache = processedData;
            this.lastFetch = Date.now();
            
            return processedData;
            
        } catch (error) {
            console.error('Error fetching Google Sheets data:', error);
            return this.getDemoData();
        }
    }

    async fetchSheetData(sheetName) {
        if (!this.sheetId) {
            throw new Error('No sheet ID configured');
        }

        const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const csvText = await response.text();
            
            return this.parseCSV(csvText);
            
        } catch (error) {
            console.error(`Failed to load ${sheetName} sheet:`, error);
            return [];
        }
    }

    // Transform new connector format to legacy format for backward compatibility
    // In sheets-integration.js, update the transformToLegacyFormat method:
transformToLegacyFormat(connectorData) {
    const legacyData = this.createLegacyDataArray(connectorData);
    
    // Create summary with proper structure
    const summary = {
        totalActivities: connectorData.charts?.summary?.totalActivities || 0,
        totalAllocation: connectorData.financial?.totalAllocation || 0,
        totalObligation: connectorData.financial?.totalObligation || 0,
        provinces: connectorData.charts?.provinceBreakdown || {},
        programs: {}, // Will be filled from program breakdown
        industries: connectorData.charts?.industryBreakdown || {},
        modalities: connectorData.charts?.modalityBreakdown || {},
        overallBUR: connectorData.financial?.overallBUR || 0,
        activePrograms: connectorData.charts?.summary?.activePrograms || 0
    };
    
    // Convert program breakdown to simple count format
    if (connectorData.charts?.programBreakdown) {
        Object.keys(connectorData.charts.programBreakdown).forEach(program => {
            summary.programs[program] = connectorData.charts.programBreakdown[program].activities || 0;
        });
    }
    
    // Create financial summary
    const financialSummary = {
        totalAllocation: connectorData.financial?.totalAllocation || 0,
        totalObligation: connectorData.financial?.totalObligation || 0,
        programBreakdown: connectorData.charts?.programBreakdown || {}
    };
    
    return {
        data: legacyData,
        summary: summary,
        filterOptions: connectorData.filters || this.generateFilterOptions(legacyData),
        financialSummary: financialSummary,
        financial: connectorData.financial || {}
    };
}

    createLegacyDataArray(connectorData) {
        // Use the unified data from connector if available
        if (connectorData.raw && connectorData.raw.unified) {
            // Convert unified format to legacy format
            return connectorData.raw.unified.map(item => {
                return {
                    ...item,
                    'Total Allocation per Sub-ARO': item.allocation || 0,
                    'Obligation': item.obligation || 0,
                    'BUR': item.bur || 0,
                    'Type': item.type || 'Activity'
                };
            });
        }
        
        // Fallback to empty array
        console.warn('No unified data available from connector');
        return [];
    }

    createLegacySummary(connectorData, legacyData) {
        
        if (connectorData.charts && connectorData.charts.summary) {
            return {
                totalActivities: connectorData.charts.summary.totalActivities || 0,
                totalAllocation: connectorData.charts.summary.totalAllocation || 0,
                totalObligation: connectorData.charts.summary.totalObligation || 0,
                provinces: connectorData.charts.provinceBreakdown || {},
                programs: this.convertProgramBreakdown(connectorData.charts.programBreakdown || {}),
                industries: connectorData.charts.industryBreakdown || {},
                modalities: connectorData.charts.modalityBreakdown || {},
                overallBUR: connectorData.financial?.overallBUR || 0
            };
        }
        
        // Generate from legacy data if no connector summary
        return this.generateSummary(legacyData);
    }

    convertProgramBreakdown(programBreakdown) {
        const result = {};
        Object.keys(programBreakdown).forEach(program => {
            result[program] = programBreakdown[program].activities || 0;
        });
        return result;
    }

    createLegacyFinancialSummary(connectorData, legacyData) {
        
        if (connectorData.charts && connectorData.charts.programBreakdown) {
            return {
                totalAllocation: connectorData.financial?.totalAllocation || 0,
                totalObligation: connectorData.financial?.totalObligation || 0,
                programBreakdown: connectorData.charts.programBreakdown
            };
        }
        
        // Generate from legacy data
        return this.generateFinancialSummary(legacyData);
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

    processAllData(sheetData) {
        
        const activitiesData = sheetData.activities || [];
        const fundsData = this.processFundsData(sheetData.funds || []);
        const uacsData = this.processUACSData(sheetData.uacs || []);
        
        // Use Per UACS data for financial information (more accurate)
        const combinedData = this.combineActivitiesWithFinancialData(activitiesData, uacsData);
        
        return {
            data: combinedData,
            summary: this.generateSummary(combinedData),
            filterOptions: this.generateFilterOptions(combinedData),
            financialSummary: this.generateFinancialSummary(combinedData)
        };
    }

    // NEW METHOD: Properly combine activities with financial data
    combineActivitiesWithFinancialData(activities, funds) {
        const combined = [];
        
        // Process each activity and find matching financial data
        activities.forEach(activity => {
            const combinedItem = {
                ...activity,
                Type: 'Activity',
                'Total Allocation per Sub-ARO': 0,
                'Obligation': 0,
                'BUR': 0
            };
            
            // Find matching financial data - use multiple matching strategies
            let financialMatch = null;
            
            // Strategy 1: Exact match on Activity name
            if (activity.Activity) {
                financialMatch = funds.find(fund => 
                    fund['Specific Activity'] && 
                    fund['Specific Activity'].toLowerCase() === activity.Activity.toLowerCase()
                );
            }
            
            // Strategy 2: Match on Component Program if activity match fails
            if (!financialMatch && activity['Component Program']) {
                financialMatch = funds.find(fund => 
                    fund['Component Program'] && 
                    fund['Component Program'].toLowerCase() === activity['Component Program'].toLowerCase()
                );
            }
            
            // Strategy 3: Partial match on activity name
            if (!financialMatch && activity.Activity) {
                financialMatch = funds.find(fund => 
                    fund['Specific Activity'] && 
                    fund['Specific Activity'].toLowerCase().includes(activity.Activity.toLowerCase())
                );
            }
            
            // Add financial data if found
            if (financialMatch) {
                combinedItem['Total Allocation per Sub-ARO'] = financialMatch.parsedAllocation || 0;
                combinedItem['Obligation'] = financialMatch.parsedObligation || 0;
                combinedItem['BUR'] = financialMatch.parsedBUR || 0;
            }
            
            combined.push(combinedItem);
        });
        
        // Add standalone financial items that don't have matching activities
        funds.forEach(fundItem => {
            const exists = combined.some(item => 
                item.Activity && fundItem['Specific Activity'] &&
                item.Activity.toLowerCase() === fundItem['Specific Activity'].toLowerCase()
            );
            
            if (!exists && fundItem['Specific Activity']) {
                combined.push({
                    'Component Program': fundItem['Component Program'],
                    'Specific Activity': fundItem['Specific Activity'],
                    'Activity': fundItem['Specific Activity'],
                    'Total Allocation per Sub-ARO': fundItem.parsedAllocation || 0,
                    'Obligation': fundItem.parsedObligation || 0,
                    'BUR': fundItem.parsedBUR || 0,
                    'Type': 'Financial',
                    'Province': 'N/A',
                    'Industry supported': 'N/A',
                    'Modality': 'N/A'
                });
            }
        });
        
        return combined;
    }

    processFundsData(fundsData) {
        return fundsData.map(item => {
            const allocation = this.parseCurrency(item['Total Allocation per Sub-ARO']);
            const obligation = this.parseCurrency(item.Obligation);
            const bur = allocation > 0 ? (obligation / allocation) * 100 : 0;
            
            return {
                ...item,
                parsedAllocation: allocation,
                parsedObligation: obligation,
                parsedBUR: bur
            };
        });
    }

    processUACSData(uacsData) {
        return uacsData.map(item => {
            const allocation = this.parseCurrency(item['Total Allocation per Sub-ARO']);
            const obligation = this.parseCurrency(item.Obligation);
            const bur = allocation > 0 ? (obligation / allocation) * 100 : 0;
            
            return {
                ...item,
                parsedAllocation: allocation,
                parsedObligation: obligation,
                parsedBUR: bur
            };
        });
    }

    parseCurrency(value) {
        if (!value || value === 'N/A') return 0;
        
        // Remove currency symbols, commas, and other non-numeric characters except decimal point
        const numericString = String(value).replace(/[^\d.-]/g, '');
        const parsed = parseFloat(numericString);
        
        return isNaN(parsed) ? 0 : parsed;
    }

    generateSummary(data) {
        
        const activities = data.filter(item => item.Type !== 'Financial');
        const totalActivities = activities.length;
        
        const totalAllocation = data.reduce((sum, item) => sum + (parseFloat(item['Total Allocation per Sub-ARO']) || 0), 0);
        const totalObligation = data.reduce((sum, item) => sum + (parseFloat(item.Obligation) || 0), 0);
        const overallBUR = totalAllocation > 0 ? (totalObligation / totalAllocation) * 100 : 0;
        
        const provinces = {};
        const programs = {};
        const industries = {};
        const modalities = {};
        
        activities.forEach(item => {
            const province = item.Province || 'Unknown';
            provinces[province] = (provinces[province] || 0) + 1;
            
            const program = item['Component Program'] || 'Uncategorized';
            programs[program] = (programs[program] || 0) + 1;
            
            const industry = item['Industry supported'] || 'Unknown';
            industries[industry] = (industries[industry] || 0) + 1;
            
            const modality = item.Modality || 'Unknown';
            modalities[modality] = (modalities[modality] || 0) + 1;
        });
        
        const summary = {
            totalActivities,
            totalAllocation,
            totalObligation,
            overallBUR,
            provinces,
            programs,
            industries,
            modalities
        };
        
        return summary;
    }

    generateFinancialSummary(data) {
        const programBreakdown = {};
        
        data.forEach(item => {
            const program = item['Component Program'] || 'Uncategorized';
            const allocation = parseFloat(item['Total Allocation per Sub-ARO']) || 0;
            const obligation = parseFloat(item.Obligation) || 0;
            
            if (!programBreakdown[program]) {
                programBreakdown[program] = {
                    allocation: 0,
                    obligation: 0,
                    activities: 0
                };
            }
            
            programBreakdown[program].allocation += allocation;
            programBreakdown[program].obligation += obligation;
            
            if (item.Type !== 'Financial') {
                programBreakdown[program].activities += 1;
            }
        });
        
        return {
            totalAllocation: data.reduce((sum, item) => sum + (parseFloat(item['Total Allocation per Sub-ARO']) || 0), 0),
            totalObligation: data.reduce((sum, item) => sum + (parseFloat(item.Obligation) || 0), 0),
            programBreakdown
        };
    }

    generateFilterOptions(data) {
        
        const programs = [...new Set(data.map(item => item['Component Program']).filter(Boolean))].sort();
        const industries = [...new Set(data.map(item => item['Industry supported']).filter(Boolean))].sort();
        const provinces = [...new Set(data.map(item => item.Province).filter(Boolean))].sort();
        const modalities = [...new Set(data.map(item => item.Modality).filter(Boolean))].sort();
        const fundSources = [...new Set(data.map(item => item['Fund Source']).filter(Boolean))].sort();
        
        const filterOptions = {
            programs,
            industries,
            provinces,
            modalities,
            fundSources
        };
        
        return filterOptions;
    }

    filterData(data, filters) {
        if (!data || !Array.isArray(data)) {
            console.error('Invalid data for filtering:', data);
            return [];
        }
        
        let filtered = [...data];
        
        // Apply search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(item => {
                return Object.values(item).some(value => 
                    String(value).toLowerCase().includes(searchTerm)
                );
            });
        }
        
        // Apply specific filters
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
        
        if (filters['Fund Source'] && filters['Fund Source'] !== 'All') {
            filtered = filtered.filter(item => item['Fund Source'] === filters['Fund Source']);
        }
        
        return filtered;
    }

    getDemoData() {
        console.warn('Using demo data due to fetch failure');
        
        const demoData = [
            {
                'Component Program': 'Digital Cities Program',
                'Activity': 'Smart City Workshop',
                'Industry supported': 'ICT Services',
                'Province': 'Metro Manila',
                'Modality': 'Face-to-Face',
                'Total Allocation per Sub-ARO': 500000,
                'Obligation': 350000,
                'BUR': 70
            },
            {
                'Component Program': 'Innovation Hub Development',
                'Activity': 'Startup Incubation',
                'Industry supported': 'Software Development',
                'Province': 'Cebu',
                'Modality': 'Hybrid',
                'Total Allocation per Sub-ARO': 750000,
                'Obligation': 600000,
                'BUR': 80
            }
        ];
        
        return {
            data: demoData,
            summary: this.generateSummary(demoData),
            filterOptions: this.generateFilterOptions(demoData),
            financialSummary: this.generateFinancialSummary(demoData)
        };
    }
}

// Initialize and expose globally
window.sheetsIntegration = new GoogleSheetsIntegration();
