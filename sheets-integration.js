// Google Sheets Integration for DICT ICT Industry Development
// This layer only reshapes connector data into the legacy view format.
class GoogleSheetsIntegration {
    constructor() {
        this.cacheDuration = 5 * 60 * 1000;
        this.cache = null;
        this.lastFetch = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        if (!window.sheetsConnector) {
            throw new Error('Sheets connector not available');
        }

        await window.sheetsConnector.initialize();
        this.isInitialized = true;
    }

    async fetchData() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.cache && this.lastFetch && (Date.now() - this.lastFetch) < this.cacheDuration) {
            return this.cache;
        }

        if (!window.sheetsConnector) {
            throw new Error('Sheets connector not available');
        }

        const connectorData = await window.sheetsConnector.fetchAllData();
        this.cache = this.transformToLegacyFormat(connectorData);
        this.lastFetch = Date.now();

        return this.cache;
    }

    transformToLegacyFormat(connectorData) {
        const legacyData = this.createLegacyDataArray(connectorData);

        const summary = {
            totalActivities: connectorData.charts?.summary?.totalActivities || 0,
            totalAllocation: connectorData.financial?.totalAllocation || 0,
            totalObligation: connectorData.financial?.totalObligation || 0,
            provinces: connectorData.charts?.provinceBreakdown || {},
            programs: {},
            industries: connectorData.charts?.industryBreakdown || {},
            modalities: connectorData.charts?.modalityBreakdown || {},
            overallBUR: connectorData.financial?.overallBUR || 0,
            activePrograms: connectorData.charts?.summary?.activePrograms || 0
        };

        if (connectorData.charts?.programBreakdown) {
            Object.keys(connectorData.charts.programBreakdown).forEach(program => {
                summary.programs[program] = connectorData.charts.programBreakdown[program].activities || 0;
            });
        }

        const financialSummary = {
            totalAllocation: connectorData.financial?.totalAllocation || 0,
            totalObligation: connectorData.financial?.totalObligation || 0,
            programBreakdown: connectorData.charts?.programBreakdown || {}
        };

        return {
            data: legacyData,
            summary: summary,
            filterOptions: connectorData.filters || {},
            financialSummary: financialSummary,
            financial: connectorData.financial || {}
        };
    }

    createLegacyDataArray(connectorData) {
        if (connectorData.raw && connectorData.raw.unified) {
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

        console.warn('No unified data available from connector');
        return [];
    }
}

// Initialize and expose globally
window.sheetsIntegration = new GoogleSheetsIntegration();
