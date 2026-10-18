// Enhanced Chart.js Renderer with Per UACS Data and Million Formatting
class ChartRenderer {
    constructor() {
        this.charts = {};
        this.colors = {
            verticalBar: 'rgb(0, 136, 254)',
            horizontalBar: 'rgb(255, 128, 66)',
            pieColors: [
                'rgb(0, 136, 254)', 'rgb(164, 222, 108)', 'rgb(255, 128, 66)',
                'rgb(255, 99, 132)', 'rgb(153, 102, 255)', 'rgb(75, 192, 192)',
                'rgb(255, 159, 64)', 'rgb(54, 162, 235)', 'rgb(255, 205, 86)',
                'rgb(201, 203, 207)'
            ]
        };
        this.animationDuration = 800;
        this.easing = 'easeOutQuart';
        this.lastChartData = null;
        
        // Add resize handler with debouncing
        this.handleResize = this.debounce(this.handleResize.bind(this), 250);
        window.addEventListener('resize', this.handleResize);
    }

    debounce(func, wait) {
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

    handleResize() {
        if (this.lastChartData) {
            this.updateCharts(this.lastChartData);
        }
    }

    destroy() {
        window.removeEventListener('resize', this.handleResize);
        this.destroyAllCharts();
        this.lastChartData = null;
    }

    formatMillions(value) {
        if (value >= 1000000) {
            return `₱${(value / 1000000).toFixed(3)}M`;
        } else if (value >= 1000) {
            return `₱${(value / 1000).toFixed(0)}K`;
        } else {
            return `₱${value}`;
        }
    }

    renderAllocationChart(programData) {
        const ctx = document.getElementById('programBudgetChart');
        if (!ctx || !programData) {
            return;
        }

        const programs = Object.keys(programData);
        const allocations = programs.map(program => programData[program].allocation || 0);
        

        if (this.charts.allocation) {
            this.charts.allocation.destroy();
        }

        // Process labels for multi-line display
        const processedLabels = programs.map(label => {
            if (typeof label !== 'string') return String(label);

            const words = label.trim().split(/\s+/);
            
            const processWord = (word) => {
                const maxLengthBeforeCut = 6;
                const shortenTo = 4;
                
                if (word.length >= maxLengthBeforeCut) {
                    return word.slice(0, shortenTo) + "...";
                }
                return word;
            };

            let line1 = "";
            let line2 = "";
            
            if (words.length >= 1) {
                line1 = processWord(words[0]);
            }
            
            if (words.length >= 2) {
                line2 = processWord(words[1]);
                
                if (words.length > 2) {
                    line2 += "...";
                }
            }

            return [line1, line2].filter(line => line !== "");
        });

        this.charts.allocation = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: processedLabels,
                datasets: [{
                    label: 'Total Allocation (₱)',
                    data: allocations,
                    backgroundColor: this.colors.verticalBar,
                    borderColor: this.colors.verticalBar,
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.5,
                    categoryPercentage: 0.7,
                    barThickness: 'flex',
                    maxBarThickness: 35,
                    minBarLength: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 48,
                        right: 24,
                        bottom: 80,
                        left: 24
                    }
                },
                animation: {
                    duration: this.animationDuration,
                    easing: this.easing
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        position: 'nearest',
                        callbacks: {
                            label: (context) => {
                                return `Allocation: ${this.formatMillions(context.parsed.y)}`;
                            },
                            title: (context) => {
                                const index = context[0].dataIndex;
                                return programs[index];
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        color: this.colors.verticalBar,
                        font: {
                            weight: 'bold',
                            size: 11
                        },
                        anchor: 'end',
                        align: 'top',
                        offset: 4,
                        formatter: (value) => {
                            return this.formatMillions(value);
                        },
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderColor: this.colors.verticalBar,
                        borderWidth: 1,
                        borderRadius: 4,
                        padding: {
                            top: 4,
                            bottom: 4,
                            left: 6,
                            right: 6
                        },
                        clip: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Total Allocation (₱)',
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            callback: (value) => this.formatMillions(value),
                            padding: 12,
                            font: {
                                size: 11
                            }
                        },
                        afterFit: function(scale) {
                            scale.paddingTop = 15;
                            scale.paddingBottom = 8;
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 0,
                            minRotation: 0,
                            autoSkip: false,
                            font: {
                                size: 10,
                                weight: 'normal'
                            },
                            padding: 15,
                            callback: function(value, index, values) {
                                const label = this.chart.data.labels[index];
                                return label;
                            }
                        },
                        offset: true,
                        afterFit: function(scale) {
                            scale.paddingLeft = 12;
                            scale.paddingRight = 12;
                            const hasMultiLineLabels = scale.chart.data.labels.some(label => 
                                Array.isArray(label)
                            );
                            if (hasMultiLineLabels) {
                                scale.height += 20;
                            }
                        }
                    }
                }
            }
        });
    }

    renderProgramChart(programData) {
        const ctx = document.getElementById('modalityChart');
        if (!ctx || !programData) {
            return;
        }

        const programs = Object.keys(programData);
        const activities = programs.map(program => programData[program].activities || 0);


        if (this.charts.program) {
            this.charts.program.destroy();
        }

        // MULTI-LINE LABELS for horizontal bar chart
        const processedLabels = programs.map(label => {
            if (typeof label !== 'string') return String(label);

            const words = label.trim().split(/\s+/);

            // Line 1: first 2 words
            const line1 = words.slice(0, 2).join(" ");

            // Line 2: next 2 words
            let line2Words = words.slice(2, 4);
            let line2 = line2Words.join(" ");

            // Add "..." if more than 4 words total
            if (words.length > 4) {
                line2 += "...";
            }

            return [line1, line2];
        });

        this.charts.program = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: processedLabels,
                datasets: [{
                    label: 'Activities',
                    data: activities,
                    backgroundColor: this.colors.horizontalBar,
                    borderColor: this.colors.horizontalBar,
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 15,
                        right: 48,
                        bottom: 15,
                        left: 15
                    }
                },
                animation: {
                    duration: this.animationDuration,
                    easing: this.easing
                },
                plugins: {
                    legend: { 
                        display: false 
                    },
                    tooltip: {
                        enabled: true,
                        position: 'nearest',
                        callbacks: {
                            title: (context) => {
                                const index = context[0].dataIndex;
                                return programs[index];
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        color: this.colors.horizontalBar,
                        font: {
                            weight: 'bold',
                            size: 11
                        },
                        anchor: 'end',
                        align: 'right',
                        offset: 4,
                        formatter: (value) => {
                            return value;
                        },
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderColor: this.colors.horizontalBar,
                        borderWidth: 1,
                        borderRadius: 4,
                        padding: {
                            top: 4,
                            bottom: 4,
                            left: 6,
                            right: 6
                        },
                        clip: false
                    }
                },
                scales: { 
                    x: { 
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Activities',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            padding: 10
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 10
                            },
                            padding: 8,
                            callback: function(value, index, values) {
                                const label = this.chart.data.labels[index];
                                return label;
                            }
                        },
                        afterFit: function(scale) {
                            const maxLines = Math.max(...scale.chart.data.labels.map(label => 
                                Array.isArray(label) ? label.length : 1
                            ));
                            scale.width += (maxLines - 1) * 8;
                        }
                    }
                }
            }
        });
    }

    renderProvinceChart(provinceData) {
        const ctx = document.getElementById('provincesPieChart');
        if (!ctx || !provinceData) {
            return;
        }

        const provinces = Object.keys(provinceData);
        const counts = Object.values(provinceData);
        const containerWidth = ctx.parentElement ? ctx.parentElement.clientWidth : window.innerWidth;
        const compact = containerWidth < 500;

        if (this.charts.provinces) {
            this.charts.provinces.destroy();
        }

        this.charts.provinces = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: provinces,
                datasets: [{
                    data: counts,
                    backgroundColor: this.getPieColors(provinces.length),
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    hoverBorderWidth: 3,
                    offset: 10,
                    spacing: 2,
                    radius: '85%',
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: compact ? 16 : 40,
                        right: compact ? 16 : 40,
                        bottom: compact ? 16 : 40,
                        left: compact ? 16 : 40
                    }
                },
                animation: {
                    duration: this.animationDuration,
                    easing: this.easing
                },
                plugins: {
                    legend: {
                        position: compact ? 'bottom' : 'right',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: compact ? 9 : 11
                            },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: compact ? 8 : 15
                        }
                    },
                    tooltip: {
                        enabled: true,
                        position: 'nearest'
                    },
                    datalabels: {
                        display: (context) => {
                            const data = context.dataset.data || [];
                            const value = data[context.dataIndex] || 0;
                            const total = data.reduce((a, b) => a + b, 0);
                            const threshold = context.chart.width < 500 ? 5 : 3;
                            return total > 0 && (value / total) * 100 > threshold;
                        },
                        color: (context) => {
                            return context.dataset.backgroundColor[context.dataIndex];
                        },
                        font: {
                            weight: 'bold',
                            size: compact ? 9 : 10,
                        },
                        formatter: (value, context) => {
                            const data = context.chart.data.datasets[0].data || [];
                            const total = data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                            return `${value}\n(${percentage}%)`;
                        },
                        textAlign: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderColor: (context) => {
                            return context.dataset.backgroundColor[context.dataIndex];
                        },
                        borderWidth: 1,
                        borderRadius: 6,
                        padding: {
                            top: 3,
                            bottom: 3,
                            left: 5,
                            right: 5
                        },
                        align: compact ? 'center' : 'end',
                        anchor: compact ? 'center' : 'end',
                        offset: compact ? 0 : 8,
                        clip: false
                    }
                }
            }
        });
    }

    renderIndustryChart(industryData) {
        const ctx = document.getElementById('industryChart');
        if (!ctx || !industryData) return;

        const industries = Object.keys(industryData);
        const counts = Object.values(industryData);
        const containerWidth = ctx.parentElement ? ctx.parentElement.clientWidth : window.innerWidth;
        const compact = containerWidth < 500;

        if (this.charts.industry) {
            this.charts.industry.destroy();
        }

        this.charts.industry = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: industries,
                datasets: [{
                    data: counts,
                    backgroundColor: this.getPieColors(industries.length),
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    hoverBorderWidth: 3,
                    offset: 10,
                    spacing: 2,
                    radius: '85%',
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: compact ? 16 : 40,
                        right: compact ? 16 : 40,
                        bottom: compact ? 16 : 40,
                        left: compact ? 16 : 40
                    }
                },
                animation: {
                    duration: this.animationDuration,
                    easing: this.easing
                },
                plugins: {
                    legend: {
                        position: compact ? 'bottom' : 'right',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: compact ? 9 : 11
                            },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: compact ? 8 : 15
                        }
                    },
                    tooltip: {
                        enabled: true,
                        position: 'nearest'
                    },
                    datalabels: {
                        display: (context) => {
                            const data = context.dataset.data || [];
                            const value = data[context.dataIndex] || 0;
                            const total = data.reduce((a, b) => a + b, 0);
                            const threshold = context.chart.width < 500 ? 5 : 3;
                            return total > 0 && (value / total) * 100 > threshold;
                        },
                        color: (context) => {
                            return context.dataset.backgroundColor[context.dataIndex];
                        },
                        font: {
                            weight: 'bold',
                            size: compact ? 9 : 10,
                        },
                        formatter: (value, context) => {
                            const data = context.chart.data.datasets[0].data || [];
                            const total = data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                            return `${value}\n(${percentage}%)`;
                        },
                        textAlign: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderColor: (context) => {
                            return context.dataset.backgroundColor[context.dataIndex];
                        },
                        borderWidth: 1,
                        borderRadius: 6,
                        padding: {
                            top: 3,
                            bottom: 3,
                            left: 5,
                            right: 5
                        },
                        align: compact ? 'center' : 'end',
                        anchor: compact ? 'center' : 'end',
                        offset: compact ? 0 : 8,
                        clip: false
                    }
                }
            }
        });
    }

    getPieColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(this.colors.pieColors[i % this.colors.pieColors.length]);
        }
        return colors;
    }

    initializeCharts(chartData) {
        if (!chartData) {
            console.error('No chart data provided');
            return;
        }

        this.lastChartData = chartData;
        this.destroyAllCharts();

        this.renderAllocationChart(chartData.programBreakdown);
        this.renderProgramChart(chartData.programBreakdown);
        this.renderProvinceChart(chartData.provinceBreakdown);
        this.renderIndustryChart(chartData.industryBreakdown);
    }

    updateCharts(chartData) {
        if (!chartData) {
            console.error('No chart data provided for update');
            return;
        }
        this.lastChartData = chartData;
        this.updateAllocationChartWithTransition(chartData.programBreakdown);
        this.updateProgramChartWithTransition(chartData.programBreakdown);
        this.updateProvinceChartWithTransition(chartData.provinceBreakdown);
        this.updateIndustryChartWithTransition(chartData.industryBreakdown);
    }

    updateAllocationChartWithTransition(programData) {
        if (!this.charts.allocation || !programData) return;
        const programs = Object.keys(programData);
        const allocations = programs.map(program => programData[program].allocation || 0);
        
        const processedLabels = programs.map(label => {
            if (typeof label !== 'string') {
                return String(label);
            }
            
            const words = label.split(' ');
            const shortWords = ['of', 'the', 'in', 'and', 'for', 'to', 'a', 'an', 'on', 'at', 'by'];
            
            if (words.length <= 2) {
                return label;
            }
            
            let line1 = '';
            let line2 = '';
            let wordCount = 0;
            
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                
                if (wordCount < 2) {
                    line1 += (line1 ? ' ' : '') + word;
                    wordCount++;
                } else {
                    if (shortWords.includes(word.toLowerCase())) {
                        line1 += ' ' + word;
                        line2 = '...';
                        break;
                    } else {
                        line2 = word;
                        if (i + 1 < words.length) {
                            line2 += '...';
                        }
                        break;
                    }
                }
            }
            
            if (!line2) {
                return line1;
            }
            
            return [line1, line2];
        });

        this.charts.allocation.data.labels = processedLabels;
        this.charts.allocation.data.datasets[0].data = allocations;
        this.charts.allocation.update();
    }

    updateProgramChartWithTransition(programData) {
        if (!this.charts.program || !programData) return;
        const programs = Object.keys(programData);
        const activities = programs.map(program => programData[program].activities || 0);
        
        const processedLabels = programs.map(label => {
            if (typeof label !== 'string') return String(label);

            const words = label.trim().split(/\s+/);
            const shortWords = ["the", "of", "in", "and", "for", "to", "a", "an", "on", "at", "by"];

            let line1 = words[0] || "";
            let line2 = "";
            let line3 = "";

            if (words.length >= 2) {
                line2 = words[1];
                
                if (shortWords.includes(line2.toLowerCase()) && words.length >= 3) {
                    line2 += " " + words[2];
                    
                    if (words.length >= 4) {
                        line3 = words[3];
                        if (words.length > 4) line3 += "...";
                    }
                } else if (words.length >= 3) {
                    line3 = words[2];
                    if (words.length > 3) line3 += "...";
                }
            }

            const lines = [line1];
            if (line2) lines.push(line2);
            if (line3) lines.push(line3);
            
            return lines;
        });

        this.charts.program.data.labels = processedLabels;
        this.charts.program.data.datasets[0].data = activities;
        this.charts.program.update();
    }

    applyPieResponsiveOptions(chart) {
        if (!chart) return;

        const compact = chart.width < 500;
        const options = chart.options;

        options.plugins.legend.position = compact ? 'bottom' : 'right';
        options.plugins.legend.labels.padding = compact ? 8 : 15;
        options.plugins.legend.labels.font.size = compact ? 9 : 11;
        options.layout.padding = compact
            ? { top: 16, right: 16, bottom: 16, left: 16 }
            : { top: 40, right: 40, bottom: 40, left: 40 };

        options.plugins.datalabels.align = compact ? 'center' : 'end';
        options.plugins.datalabels.anchor = compact ? 'center' : 'end';
        options.plugins.datalabels.offset = compact ? 0 : 8;
        options.plugins.datalabels.font.size = compact ? 9 : 10;
    }

    updateProvinceChartWithTransition(provinceData) {
        if (!this.charts.provinces || !provinceData) return;
        const provinces = Object.keys(provinceData);
        const counts = Object.values(provinceData);
        this.charts.provinces.data.labels = provinces;
        this.charts.provinces.data.datasets[0].data = counts;
        this.charts.provinces.data.datasets[0].backgroundColor = this.getPieColors(provinces.length);
        this.applyPieResponsiveOptions(this.charts.provinces);
        this.charts.provinces.update();
    }

    updateIndustryChartWithTransition(industryData) {
        if (!this.charts.industry || !industryData) return;
        const industries = Object.keys(industryData);
        const counts = Object.values(industryData);
        this.charts.industry.data.labels = industries;
        this.charts.industry.data.datasets[0].data = counts;
        this.charts.industry.data.datasets[0].backgroundColor = this.getPieColors(industries.length);
        this.applyPieResponsiveOptions(this.charts.industry);
        this.charts.industry.update();
    }

    destroyAllCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }
}

// Initialize global chart renderer
window.chartRenderer = new ChartRenderer();