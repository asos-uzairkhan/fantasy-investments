// Fantasy Investments 2026 - Main JavaScript

const STARTING_AMOUNT = 50; // £50 starting capital
const COLORS = [
    '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f39c12',
    '#1abc9c', '#e91e63', '#00bcd4', '#ff5722', '#795548'
];

// Global data storage
let sp500Data = [];
let participantInvestments = {}; // Store investments for each participant
let symbolPricesData = {}; // Store price data for each symbol
let calculatedPortfolioData = []; // Calculated daily portfolio values
let PARTICIPANTS = []; // Will be populated dynamically from investments folder
let singleSymbolChartInstance = null; // Store chart instance for updates
let multiSymbolChartInstance = null; // Store chart instance for updates

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check for file protocol
        if (window.location.protocol === 'file:') {
            console.warn('Running via file:// protocol. Fetch requests may be blocked by CORS policy.');
        }

        await discoverParticipants();
        await loadAllData();
        await loadSymbolPrices();
        calculatePortfolioValues();
        updateStatsOverview();
        createTornadoChart();
        createLineChart();
        populateRankingsTable();
        
        // Initialize tabs
        initializeTabs();
        
        // Initialize symbol analysis controls
        populateSymbolSelectors();
        populateDateSelector();
        setupSymbolAnalysisListeners();
    } catch (error) {
        console.error('Error initializing application:', error);
        let msg = 'Failed to load data. Please check that all CSV files are present.';
        if (window.location.protocol === 'file:') {
            msg += ' NOTE: Browsers often block loading files directly. Please use a local server (e.g., VS Code Live Server extension).';
        }
        showError(msg);
    }
});

// Discover participants by checking which investment files exist
async function discoverParticipants() {
    // List of candidate names to try (alphabetically ordered)
    const candidateNames = [
        'Alpha', 'Beta', 'Charlie', 'Delta', 'Echo',
        'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet',
        'Kilo', 'Lima', 'Mike', 'November', 'Oscar',
        'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango',
        'Uniform', 'Victor', 'Whiskey', 'X-ray', 'Yankee', 'Zulu'
    ];
    
    PARTICIPANTS = [];
    
    // Try to load each candidate and only include those that exist
    const promises = candidateNames.map(async name => {
        try {
            const response = await fetch(`data/investments/${name}.csv`);
            if (response.ok) {
                PARTICIPANTS.push(name);
            }
        } catch (error) {
            // File doesn't exist, skip it
        }
    });
    
    await Promise.all(promises);
    
    console.log('Discovered participants:', PARTICIPANTS);
}

// Helper to fetch CSV file
async function fetchCSV(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    return await response.text();
}

// CSV Parser
function parseCSV(csvText) {
    if (!csvText) return [];
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || '';
        });
        data.push(row);
    }
    
    return data;
}

// Handle CSV lines with potential commas in quoted strings
function parseCSVLine(line) {
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
    return result;
}

// Load all CSV data
async function loadAllData() {
    // Load S&P 500 data
    try {
        const sp500Text = await fetchCSV('data/symbols/SPX.csv');
        sp500Data = parseCSV(sp500Text);
    } catch (e) {
        console.warn('Could not load S&P 500 data', e);
        sp500Data = [];
    }
    
    // Load individual participant investment files
    const promises = PARTICIPANTS.map(async participant => {
        try {
            const csvText = await fetchCSV(`data/investments/${participant}.csv`);
            const investments = parseCSV(csvText);
            participantInvestments[participant] = investments;
        } catch (error) {
            console.warn(`Failed to load investments for ${participant}:`, error);
            participantInvestments[participant] = [];
        }
    });
    
    await Promise.all(promises);
}

// Get list of participants who have data
function getParticipants() {
    return PARTICIPANTS.filter(p => Object.keys(participantInvestments).includes(p));
}

// Get unique symbols from all participants' investments
function getUniqueSymbols() {
    const symbols = new Set();
    PARTICIPANTS.forEach(participant => {
        const investments = participantInvestments[participant] || [];
        investments.forEach(inv => {
            if (inv.symbol) {
                symbols.add(inv.symbol);
            }
        });
    });
    return Array.from(symbols);
}

// Load price data for all investment symbols
async function loadSymbolPrices() {
    const symbols = getUniqueSymbols();
    const promises = symbols.map(async symbol => {
        try {
            const csvText = await fetchCSV(`data/symbols/${symbol}.csv`);
            let data = parseCSV(csvText);
            // Sort by date to ensure chronological order
            data.sort((a, b) => a.date.localeCompare(b.date));
            symbolPricesData[symbol] = data;
        } catch (error) {
            console.warn(`Failed to load price data for ${symbol}:`, error);
            symbolPricesData[symbol] = [];
        }
    });
    
    await Promise.all(promises);
}

// Get all unique dates from symbol price data
function getAllDates() {
    const dates = new Set();
    
    // Add dates from all symbols
    Object.values(symbolPricesData).forEach(priceData => {
        priceData.forEach(row => {
            if (row.date) {
                dates.add(row.date);
            }
        });
    });
    
    // Convert to array and sort
    return Array.from(dates).sort();
}

// Get price for a symbol on or after a specific date (for start price)
function getPriceOnOrAfterDate(symbol, date) {
    const priceData = symbolPricesData[symbol] || [];
    // Find first record where row.date >= date
    const record = priceData.find(row => row.date >= date);
    return record ? parseFloat(record.value) : null;
}

// Get price for a symbol on or before a specific date (for current price)
function getPriceOnOrBeforeDate(symbol, date) {
    const priceData = symbolPricesData[symbol] || [];
    // Iterate backwards or find last record where row.date <= date
    // Since priceData is sorted, we can find the last one that matches
    let record = null;
    for (const row of priceData) {
        if (row.date <= date) {
            record = row;
        } else {
            // Once we pass the date, we can stop because the array is sorted
            break;
        }
    }
    return record ? parseFloat(record.value) : null;
}

// Get active investments for a participant on a specific date
function getActiveInvestments(participant, date) {
    const investments = participantInvestments[participant] || [];
    return investments.filter(inv => {
        // Check if date is within start_date and end_date (inclusive)
        return date >= inv.start_date && date <= inv.end_date;
    });
}

// Calculate portfolio values for all participants across all dates
function calculatePortfolioValues() {
    const participants = getParticipants();
    const allDates = getAllDates();
    
    if (allDates.length === 0) {
        console.warn('No price data available');
        // Don't throw here, just warn. The charts will be empty but no crash.
        return;
    }
    
    // Initialize portfolio data structure
    calculatedPortfolioData = allDates.map(date => {
        const row = { date };
        participants.forEach(p => row[p] = 0);
        return row;
    });
    
    // Calculate portfolio value for each participant on each date
    participants.forEach(participant => {
        allDates.forEach((date, dateIndex) => {
            const activeInvestments = getActiveInvestments(participant, date);
            let portfolioValue = 0;
            
            if (activeInvestments.length > 0) {
                // Split capital equally among active investments
                const investmentAmount = STARTING_AMOUNT / activeInvestments.length;
                
                activeInvestments.forEach(investment => {
                    const symbol = investment.symbol;
                    const startDate = investment.start_date;
                    
                    // Use price on or after start date for the buy price
                    const startPrice = getPriceOnOrAfterDate(symbol, startDate);
                    // Use price on or before current date for current value
                    const currentPrice = getPriceOnOrBeforeDate(symbol, date);
                    
                    if (startPrice && currentPrice) {
                        const shares = investmentAmount / startPrice;
                        const currentValue = shares * currentPrice;
                        portfolioValue += currentValue;
                    } else {
                        // If we can't determine value, assume it maintains cost basis
                        portfolioValue += investmentAmount;
                    }
                });
            } else {
                // No investments yet, maintain starting amount (cash)
                portfolioValue = STARTING_AMOUNT;
            }
            
            calculatedPortfolioData[dateIndex][participant] = portfolioValue;
        });
    });
}

// Get the latest values for each participant
function getLatestValues() {
    if (calculatedPortfolioData.length === 0) return {};
    
    const latestRow = calculatedPortfolioData[calculatedPortfolioData.length - 1];
    const values = {};
    
    const participants = getParticipants();
    participants.forEach(p => {
        values[p] = parseFloat(latestRow[p]) || STARTING_AMOUNT;
    });
    
    return values;
}

// Get the latest S&P 500 value and calculate return
function getSP500Return() {
    if (sp500Data.length === 0) return 0;
    
    const firstValue = parseFloat(sp500Data[0].value) || 100;
    const latestValue = parseFloat(sp500Data[sp500Data.length - 1].value) || 100;
    
    return ((latestValue - firstValue) / firstValue) * 100;
}

// Calculate participant rankings
function calculateRankings() {
    const latestValues = getLatestValues();
    const sp500Return = getSP500Return();
    const participants = getParticipants();
    
    const rankings = participants.map(p => {
        const currentValue = latestValues[p] || STARTING_AMOUNT;
        const profitLoss = currentValue - STARTING_AMOUNT;
        const percentReturn = ((currentValue - STARTING_AMOUNT) / STARTING_AMOUNT) * 100;
        const vsSP500 = percentReturn - sp500Return;
        
        return {
            name: p,
            value: currentValue,
            profitLoss: profitLoss,
            return: percentReturn,
            vsSP500: vsSP500
        };
    });
    
    return rankings.sort((a, b) => b.value - a.value);
}

// Update the stats overview cards
function updateStatsOverview() {
    const rankings = calculateRankings();
    if (rankings.length === 0) return;
    
    const topPerformer = rankings[0];
    const sp500Return = getSP500Return();
    
    // Safe update helper
    const updateElement = (id, text, className) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = text;
            if (className) el.className = className;
        }
    };

    // Update elements that actually exist in HTML
    updateElement('current-leader', topPerformer.name);
    
    // S&P 500 Return
    const spClass = sp500Return >= 0 ? 'stat-value positive' : 'stat-value negative';
    updateElement('sp500-return', `${sp500Return.toFixed(2)}%`, spClass);
    
    // Participants Beating S&P
    const beatingCount = rankings.filter(r => r.return > sp500Return).length;
    updateElement('beating-sp500', `${beatingCount} / ${rankings.length}`);
}

// Populate the rankings table
function populateRankingsTable() {
    const rankings = calculateRankings();
    const tbody = document.querySelector('#rankings-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    rankings.forEach((rank, index) => {
        const tr = document.createElement('tr');
        
        // Add rank classes for top 3
        if (index === 0) tr.className = 'rank-1';
        if (index === 1) tr.className = 'rank-2';
        if (index === 2) tr.className = 'rank-3';
        
        const profitClass = rank.profitLoss >= 0 ? 'profit' : 'loss';
        const returnClass = rank.return >= 0 ? 'profit' : 'loss';
        const vsSP500Class = rank.vsSP500 >= 0 ? 'beating-sp500' : 'behind-sp500';
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${rank.name} ${index === 0 ? '👑' : ''}</td>
            <td>£${rank.value.toFixed(2)}</td>
            <td class="${profitClass}">
                ${rank.profitLoss >= 0 ? '+' : ''}£${rank.profitLoss.toFixed(2)}
            </td>
            <td class="${returnClass}">
                ${rank.return.toFixed(2)}%
            </td>
            <td class="${vsSP500Class}">
                ${rank.vsSP500 >= 0 ? '+' : ''}${rank.vsSP500.toFixed(2)}%
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Create Tornado Chart (Horizontal Bar Chart)
function createTornadoChart() {
    const canvas = document.getElementById('tornadoChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rankings = calculateRankings();
    
    // Sort by return for the chart
    rankings.sort((a, b) => b.return - a.return);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rankings.map(r => r.name),
            datasets: [{
                label: 'Return (%)',
                data: rankings.map(r => r.return),
                backgroundColor: rankings.map((r, i) => {
                    // Use specific colors for participants if possible, or cycle through COLORS
                    const pIndex = PARTICIPANTS.indexOf(r.name);
                    return pIndex >= 0 ? COLORS[pIndex % COLORS.length] : COLORS[i % COLORS.length];
                }),
                borderColor: 'rgba(0,0,0,0.1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Makes it horizontal
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#f0f0f0'
                    },
                    title: {
                        display: true,
                        text: 'Return (%)'
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Create Line Chart (Performance over time)
function createLineChart() {
    const canvas = document.getElementById('lineChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const participants = getParticipants();
    const allDates = getAllDates();
    
    // Filter dates to show reasonable amount of points if too many
    // For now, show all
    
    const datasets = participants.map((p, i) => {
        return {
            label: p,
            data: calculatedPortfolioData.map(row => row[p]),
            borderColor: COLORS[i % COLORS.length],
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1
        };
    });
    
    // Add S&P 500 benchmark line if data exists
    if (sp500Data.length > 0) {
        // Normalize S&P to start at £50 for comparison
        const startSP = parseFloat(sp500Data[0].value);
        const spData = allDates.map(date => {
            const record = sp500Data.find(r => r.date === date);
            if (record) {
                const val = parseFloat(record.value);
                return (val / startSP) * STARTING_AMOUNT;
            }
            return null;
        });
        
        datasets.push({
            label: 'S&P 500',
            data: spData,
            borderColor: '#000000',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1
        });
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: allDates, // Dates are already sorted strings YYYY-MM-DD
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: £${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    grid: {
                        color: '#f0f0f0'
                    },
                    title: {
                        display: true,
                        text: 'Portfolio Value (£)'
                    }
                }
            }
        }
    });
}

// Show error message
function showError(message) {
    const container = document.querySelector('.container') || document.body;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.backgroundColor = '#ffebee';
    errorDiv.style.color = '#c62828';
    errorDiv.style.padding = '1rem';
    errorDiv.style.marginBottom = '1rem';
    errorDiv.style.borderRadius = '4px';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.width = '100%';
    errorDiv.style.zIndex = '1000';
    errorDiv.textContent = message;
    
    container.insertBefore(errorDiv, container.firstChild);
}

// ===== TAB FUNCTIONALITY =====

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// ===== SYMBOL ANALYSIS FUNCTIONALITY =====

function populateSymbolSelectors() {
    const symbols = Object.keys(symbolPricesData).sort();
    
    const singleSelect = document.getElementById('single-symbol-select');
    const multiSelect = document.getElementById('multi-symbol-select');
    
    if (singleSelect) {
        symbols.forEach(symbol => {
            const option = document.createElement('option');
            option.value = symbol;
            option.textContent = symbol;
            singleSelect.appendChild(option);
        });
    }
    
    if (multiSelect) {
        symbols.forEach(symbol => {
            const option = document.createElement('option');
            option.value = symbol;
            option.textContent = symbol;
            multiSelect.appendChild(option);
        });
    }
}

function populateDateSelector() {
    const dates = getAllDates();
    const dateSelect = document.getElementById('start-date-select');
    
    if (dateSelect && dates.length > 0) {
        dates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            dateSelect.appendChild(option);
        });
        
        // Set default to first date
        dateSelect.value = dates[0];
    }
}

function setupSymbolAnalysisListeners() {
    const singleSelect = document.getElementById('single-symbol-select');
    const multiSelect = document.getElementById('multi-symbol-select');
    const dateSelect = document.getElementById('start-date-select');
    
    if (singleSelect) {
        singleSelect.addEventListener('change', () => {
            const symbol = singleSelect.value;
            if (symbol) {
                createSingleSymbolChart(symbol);
            }
        });
    }
    
    if (multiSelect && dateSelect) {
        const updateMultiChart = () => {
            const selectedOptions = Array.from(multiSelect.selectedOptions);
            const symbols = selectedOptions.map(opt => opt.value);
            const startDate = dateSelect.value;
            
            if (symbols.length > 0 && startDate) {
                createMultiSymbolChart(symbols, startDate);
            }
        };
        
        multiSelect.addEventListener('change', updateMultiChart);
        dateSelect.addEventListener('change', updateMultiChart);
    }
}

// Create chart showing single symbol price over time
function createSingleSymbolChart(symbol) {
    const canvas = document.getElementById('singleSymbolChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const priceData = symbolPricesData[symbol] || [];
    
    if (priceData.length === 0) {
        console.warn(`No price data for ${symbol}`);
        return;
    }
    
    const dates = priceData.map(row => row.date);
    const prices = priceData.map(row => parseFloat(row.value));
    
    // Destroy existing chart if it exists
    if (singleSymbolChartInstance) {
        singleSymbolChartInstance.destroy();
    }
    
    singleSymbolChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: `${symbol} Price`,
                data: prices,
                borderColor: COLORS[0],
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 2,
                pointHoverRadius: 5,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Price: £${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    grid: {
                        color: '#f0f0f0'
                    },
                    title: {
                        display: true,
                        text: 'Price (£)'
                    }
                }
            }
        }
    });
}

// Create chart showing portfolio performance if invested in multiple symbols from start date
function createMultiSymbolChart(symbols, startDate) {
    const canvas = document.getElementById('multiSymbolChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Get all dates from start date onwards
    const allDates = getAllDates();
    const startIndex = allDates.indexOf(startDate);
    if (startIndex === -1) {
        console.warn('Start date not found in data');
        return;
    }
    
    const relevantDates = allDates.slice(startIndex);
    
    // Calculate portfolio value for each symbol
    const datasets = symbols.map((symbol, index) => {
        const priceData = symbolPricesData[symbol] || [];
        
        // Get start price (on or after start date)
        const startPrice = getPriceOnOrAfterDate(symbol, startDate);
        if (!startPrice) {
            console.warn(`No start price for ${symbol} on ${startDate}`);
            return null;
        }
        
        // Calculate shares purchased
        const shares = STARTING_AMOUNT / startPrice;
        
        // Calculate portfolio value for each date
        const portfolioValues = relevantDates.map(date => {
            const currentPrice = getPriceOnOrBeforeDate(symbol, date);
            if (currentPrice) {
                const portfolioValue = shares * currentPrice;
                // Return percentage change
                return ((portfolioValue - STARTING_AMOUNT) / STARTING_AMOUNT) * 100;
            }
            return null;
        });
        
        return {
            label: symbol,
            data: portfolioValues,
            borderColor: COLORS[index % COLORS.length],
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1
        };
    }).filter(dataset => dataset !== null);
    
    // Destroy existing chart if it exists
    if (multiSymbolChartInstance) {
        multiSymbolChartInstance.destroy();
    }
    
    multiSymbolChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: relevantDates,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            return `${context.dataset.label}: ${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    grid: {
                        color: '#f0f0f0'
                    },
                    title: {
                        display: true,
                        text: 'Return (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}
