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
let monthlyPerformanceChartInstance = null;
let currentUser = null;
let userPortfolioChartInstance = null;
let passwordsData = {};
let isAdmin = false;
let db = null; // Firebase Realtime Database reference

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check for file protocol
        if (window.location.protocol === 'file:') {
            console.warn('Running via file:// protocol. Fetch requests may be blocked by CORS policy.');
        }

        // Load passwords and wire up auth UI
        await loadPasswords();
        setupLoginListeners();
        setupChangePasswordModal();
        setupAdminListeners();
        document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

        await discoverParticipants();
        await loadAllData();
        await loadSymbolPrices();
        calculatePortfolioValues();
        updateStatsOverview();
        createTornadoChart();
        createLineChart();
        populateRankingsTable();
        
        // Enable login inputs
        const loginBtn = document.getElementById('login-button');
        const userInput = document.getElementById('username-input');
        const passwordInput = document.getElementById('password-input');
        if (loginBtn && userInput) {
            loginBtn.textContent = 'Login';
            loginBtn.disabled = false;
            userInput.disabled = false;
            if (passwordInput) passwordInput.disabled = false;
            userInput.focus();
        }

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
        'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo',
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

// Login logic
function setupLoginListeners() {
    const loginBtn = document.getElementById('login-button');
    const userInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('password-input');

    const attemptLogin = async () => {
        const username = userInput.value.trim();
        const password = passwordInput ? passwordInput.value : '';
        if (!username) return;
        if (!password) {
            showLoginError('Please enter your password.');
            return;
        }
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        await handleLogin(username, password);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    };

    if (loginBtn) loginBtn.addEventListener('click', attemptLogin);
    if (userInput) userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') passwordInput?.focus();
    });
    if (passwordInput) passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') attemptLogin();
    });
}

async function handleLogin(username, password) {
    const lowerUsername = username.toLowerCase();
    const isAdminLogin = lowerUsername === 'admin';

    // Check the username is valid
    const participant = PARTICIPANTS.find(p => p.toLowerCase() === lowerUsername);
    if (!participant && !isAdminLogin) {
        showLoginError('User not found. Please try again.');
        return;
    }

    // Validate password
    const enteredHash = await hashPassword(password);
    const storedHash = getStoredHash(username);
    if (!storedHash || enteredHash !== storedHash) {
        showLoginError('Incorrect password. Please try again.');
        return;
    }

    // Successful login
    currentUser = isAdminLogin ? 'admin' : participant;
    isAdmin = isAdminLogin;

    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) loginOverlay.style.display = 'none';

    const footer = document.getElementById('main-footer');
    if (footer) footer.style.display = 'block';

    if (isAdminLogin) {
        showAdminPanel();
    } else {
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.style.display = 'block';
        updateSymbolsTabForUser();
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    }

    updateUserInfoBar();
}

function showLoginError(message) {
    const errorMsg = document.getElementById('login-error');
    if (errorMsg) {
        errorMsg.textContent = message;
        setTimeout(() => errorMsg.textContent = '', 3000);
    }
}

function updateSymbolsTabForUser() {
    // Switch sections
    const individualSection = document.getElementById('individual-symbol-section');
    const userSection = document.getElementById('user-portfolio-section');
    const monthlySection = document.getElementById('monthly-performance-section');
    
    if (individualSection) individualSection.style.display = 'none';
    if (userSection) userSection.style.display = 'block';
    if (monthlySection) monthlySection.style.display = 'block';
    
    // Create Table
    renderUserPortfolioTable();
    // Create Chart
    renderMonthlyPerformanceChart();
}

function renderMonthlyPerformanceChart() {
    const canvas = document.getElementById('monthlyPerformanceChart');
    if (!canvas || !currentUser) return;

    const ctx = canvas.getContext('2d');
    
    // Determine dates
    const allDates = getAllDates();
    if (allDates.length === 0) return;
    
    const latestDate = allDates[allDates.length - 1]; // e.g., "2026-01-14"
    // Get start of month from latest date
    // Format is YYYY-MM-DD
    const parts = latestDate.split('-');
    const year = parts[0];
    const month = parts[1];
    const firstOfMonth = `${year}-${month}-01`;

    // Active investments for this user
    const activeInvestments = getActiveInvestments(currentUser, latestDate);
    
    const labels = [];
    const data = [];
    const backgroundColors = [];
    const borderColors = [];

    activeInvestments.forEach(inv => {
        const symbol = inv.symbol;
        
        // Use price on or after first of month
        const startPrice = getPriceOnOrAfterDate(symbol, firstOfMonth);
        // Use price on or before latest date
        const currentPrice = getPriceOnOrBeforeDate(symbol, latestDate);
        
        if (startPrice && currentPrice) {
            const roi = ((currentPrice - startPrice) / startPrice) * 100;
            labels.push(symbol);
            data.push(roi);
            
            // Color coding
            if (roi >= 0) {
                backgroundColors.push('rgba(46, 204, 113, 0.6)'); // Green
                borderColors.push('rgba(46, 204, 113, 1)');
            } else {
                backgroundColors.push('rgba(231, 76, 60, 0.6)'); // Red
                borderColors.push('rgba(231, 76, 60, 1)');
            }
        }
    });

    if (monthlyPerformanceChartInstance) {
        monthlyPerformanceChartInstance.destroy();
    }

    monthlyPerformanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'ROI (%)',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: `Performance from ${firstOfMonth} to ${latestDate}`
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
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#f0f0f0'
                    },
                    title: {
                        display: true,
                        text: 'Return on Investment (%)'
                    }
                }
            }
        }
    });
}


function renderUserPortfolioTable() {
    const tbody = document.getElementById('portfolio-body');
    if (!tbody || !currentUser) return;
    
    tbody.innerHTML = '';
    
    // Get active investments for current date (using context: Jan 14, 2026)
    // In a real scenario, this might use current system date, but here we use context.
    // However, calculatePortfolioValues uses strict dates. 
    // To be safe, let's just list ALL unique symbols the user has invested in for the year 2026.
    // As per rules, substitution is monthly, so "portfolio" is dynamic.
    // The prompt asks for "symbols the user is invested in".
    const investments = participantInvestments[currentUser] || [];
    
    // Unique symbols
    const userSymbols = [...new Set(investments.map(inv => inv.symbol))];
    
    userSymbols.sort();
    
    userSymbols.forEach(symbol => {
        const meta = getSymbolMetadata(symbol);
        const tr = document.createElement('tr');
        
        const categoryClass = getCategoryClass(meta.category);
        
        tr.innerHTML = `
            <td><strong>${symbol}</strong></td>
            <td>${meta.name}</td>
            <td><span class="category-badge ${categoryClass}">${meta.category}</span></td>
            <td>${meta.sector}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

function getCategoryClass(category) {
    if (!category) return 'category-other';
    switch (category.toLowerCase()) {
        case 'stock': return 'category-stock';
        case 'fund': return 'category-fund';
        case 'cryptocurrency': return 'category-crypto';
        case 'commodity': return 'category-commodity';
        default: return 'category-other';
    }
}


const SYMBOL_METADATA = {
    'AAPL': { name: 'Apple Inc.', category: 'Stock', sector: 'Technology' },
    'ALUMINIUM': { name: 'Aluminium', category: 'Commodity', sector: 'Materials' },
    'AMD': { name: 'Advanced Micro Devices', category: 'Stock', sector: 'Technology' },
    'AMZN': { name: 'Amazon.com Inc.', category: 'Stock', sector: 'Consumer Cyclical' },
    'ARAMCO': { name: 'Saudi Aramco', category: 'Stock', sector: 'Energy' },
    'ASML': { name: 'ASML Holding', category: 'Stock', sector: 'Technology' },
    'AVGO': { name: 'Broadcom Inc.', category: 'Stock', sector: 'Technology' },
    'AXP': { name: 'American Express', category: 'Stock', sector: 'Financial Services' },
    'AZN': { name: 'AstraZeneca', category: 'Stock', sector: 'Healthcare' },
    'BAC': { name: 'Bank of America', category: 'Stock', sector: 'Financial Services' },
    'BP': { name: 'BP p.l.c.', category: 'Stock', sector: 'Energy' },
    'BRK': { name: 'Berkshire Hathaway', category: 'Stock', sector: 'Financial Services' },
    'BTC': { name: 'Bitcoin', category: 'Cryptocurrency', sector: 'Digital Assets' },
    'BYDDF': { name: 'BYD Co.', category: 'Stock', sector: 'Automotive' },
    'CJ6': { name: 'Unknown Asset', category: 'Other', sector: 'Other' },
    'COPPER': { name: 'Copper', category: 'Commodity', sector: 'Materials' },
    'DIA': { name: 'SPDR Dow Jones ETF', category: 'Fund', sector: 'Index ETF' },
    'DOGE': { name: 'Dogecoin', category: 'Cryptocurrency', sector: 'Digital Assets' },
    'ETH': { name: 'Ethereum', category: 'Cryptocurrency', sector: 'Digital Assets' },
    'FSLR': { name: 'First Solar', category: 'Stock', sector: 'Energy' },
    'GOLD': { name: 'Gold', category: 'Commodity', sector: 'Precious Metals' },
    'GOOGL': { name: 'Alphabet Inc.', category: 'Stock', sector: 'Technology' },
    'GSK': { name: 'GSK plc', category: 'Stock', sector: 'Healthcare' },
    'HIWS': { name: 'Unknown Asset', category: 'Other', sector: 'Other' },
    'HLAL': { name: 'Wahed FTSE USA Shariah ETF', category: 'Fund', sector: 'Shariah Compliant' },
    'ISWD': { name: 'iShares MSCI World Islamic ETF', category: 'Fund', sector: 'Shariah Compliant' },
    'JNJ': { name: 'Johnson & Johnson', category: 'Stock', sector: 'Healthcare' },
    'JPM': { name: 'JPMorgan Chase', category: 'Stock', sector: 'Financial Services' },
    'KO': { name: 'Coca-Cola', category: 'Stock', sector: 'Consumer Defensive' },
    'LLY': { name: 'Eli Lilly and Co', category: 'Stock', sector: 'Healthcare' },
    'MA': { name: 'Mastercard', category: 'Stock', sector: 'Financial Services' },
    'META': { name: 'Meta Platforms', category: 'Stock', sector: 'Technology' },
    'MRNA': { name: 'Moderna', category: 'Stock', sector: 'Healthcare' },
    'MSFT': { name: 'Microsoft Corp', category: 'Stock', sector: 'Technology' },
    'MU': { name: 'Micron Technology', category: 'Stock', sector: 'Technology' },
    'NKE': { name: 'Nike Inc.', category: 'Stock', sector: 'Consumer Cyclical' },
    'NOVN': { name: 'Novartis', category: 'Stock', sector: 'Healthcare' },
    'NVDA': { name: 'NVIDIA Corp', category: 'Stock', sector: 'Technology' },
    'OIL': { name: 'Crude Oil', category: 'Commodity', sector: 'Energy' },
    'OMER': { name: 'Omeros Corp', category: 'Stock', sector: 'Healthcare' },
    'PG': { name: 'Procter & Gamble', category: 'Stock', sector: 'Consumer Defensive' },
    'PYPL': { name: 'PayPal', category: 'Stock', sector: 'Financial Services' },
    'QBTS': { name: 'D-Wave Quantum', category: 'Stock', sector: 'Technology' },
    'QCOM': { name: 'Qualcomm', category: 'Stock', sector: 'Technology' },
    'QQQ': { name: 'Invesco QQQ', category: 'Fund', sector: 'Index ETF' },
    'ROG': { name: 'Roche Holding', category: 'Stock', sector: 'Healthcare' },
    'SAMSUNG': { name: 'Samsung Electronics', category: 'Stock', sector: 'Technology' },
    'SHEL': { name: 'Shell plc', category: 'Stock', sector: 'Energy' },
    'SHIB': { name: 'Shiba Inu', category: 'Cryptocurrency', sector: 'Digital Assets' },
    'SILVER': { name: 'Silver', category: 'Commodity', sector: 'Precious Metals' },
    'SLB': { name: 'Schlumberger', category: 'Stock', sector: 'Energy' },
    'SOL': { name: 'Solana', category: 'Cryptocurrency', sector: 'Digital Assets' },
    'SONY': { name: 'Sony Group', category: 'Stock', sector: 'Technology' },
    'SPX': { name: 'S&P 500', category: 'Fund', sector: 'Index' },
    'SSW': { name: 'Sibanye Stillwater', category: 'Stock', sector: 'Basic Materials' },
    'TSLA': { name: 'Tesla Inc.', category: 'Stock', sector: 'Automotive' },
    'UMMA': { name: 'Wahed Dow Jones Islamic ETF', category: 'Fund', sector: 'Shariah Compliant' },
    'USDT': { name: 'Tether', category: 'Cryptocurrency', sector: 'Stablecoin' },
    'V': { name: 'Visa Inc.', category: 'Stock', sector: 'Financial Services' },
    'VOW3': { name: 'Volkswagen', category: 'Stock', sector: 'Automotive' },
    'WHEAT': { name: 'Wheat', category: 'Commodity', sector: 'Agriculture' }
};

function getSymbolMetadata(symbol) {
    return SYMBOL_METADATA[symbol] || { name: symbol, category: 'Unknown', sector: 'Unknown' };
}

// ─── Password Hashing ────────────────────────────────────────────────────────

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function loadPasswords() {
    const cfg = window.FIREBASE_CONFIG || window.firebaseConfig;

    if (!cfg || cfg.apiKey === 'YOUR_API_KEY') {
        showLoginError('⚠️ Firebase is not configured. Please fill in firebase-config.js.');
        passwordsData = { users: {}, admin: '' };
        return;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(cfg);
        }
        db = firebase.database();

        const snapshot = await db.ref('passwords').get();
        if (snapshot.exists()) {
            const remote = snapshot.val() || {};
            passwordsData = {
                users: remote.users || {},
                admin: remote.admin || ''
            };

            // Repair partially populated data (for example when initial seed failed).
            if (!passwordsData.admin || Object.keys(passwordsData.users).length === 0) {
                await seedFirebaseFromJson();
            }
        } else {
            // First-time setup: seed Firebase from the local passwords.json
            await seedFirebaseFromJson();
        }
    } catch (error) {
        console.error('Firebase error:', error);
        showLoginError('⚠️ Could not connect to database. Check your connection and firebase-config.js.');
        passwordsData = { users: {}, admin: '' };
    }
}

// Runs once on first deployment: pushes passwords.json into Firebase
async function seedFirebaseFromJson() {
    try {
        const response = await fetch('data/passwords.json');
        if (!response.ok) throw new Error('passwords.json not found');
        const data = await response.json();
        // Set local data first so login works even if the Firebase write fails
        passwordsData = {
            users: data.users || {},
            admin: data.admin || ''
        };
        try {
            // Rules currently allow writes to /passwords/users/$user and /passwords/admin,
            // but not a full write to /passwords in one operation.
            const writes = [];

            if (passwordsData.admin) {
                writes.push(db.ref('passwords/admin').set(passwordsData.admin));
            }

            Object.entries(passwordsData.users).forEach(([username, hash]) => {
                writes.push(db.ref(`passwords/users/${username}`).set(hash));
            });

            await Promise.all(writes);
            console.log('Firebase seeded from passwords.json');
        } catch (writeError) {
            console.warn('Could not write passwords to Firebase, using local passwords.json:', writeError);
        }
    } catch (error) {
        console.warn('Could not load passwords.json:', error);
        passwordsData = { users: {}, admin: '' };
    }
}

// Returns the stored hash for a user from the in-memory passwordsData (loaded from Firebase).
function getStoredHash(username) {
    if (username.toLowerCase() === 'admin') {
        return passwordsData.admin || '';
    }

    // Primary lookup: participant name discovered from investments files.
    const participant = PARTICIPANTS.find(p => p.toLowerCase() === username.toLowerCase());
    if (participant && passwordsData.users?.[participant]) {
        return passwordsData.users[participant];
    }

    // Fallback lookup: case-insensitive scan of Firebase user keys.
    const users = passwordsData.users || {};
    const matchedKey = Object.keys(users).find(key => key.toLowerCase() === username.toLowerCase());
    if (matchedKey) {
        return users[matchedKey] || '';
    }

    return '';
}

// ─── User Info Bar & Logout ───────────────────────────────────────────────────

function updateUserInfoBar() {
    const bar = document.getElementById('user-info-bar');
    const nameDisplay = document.getElementById('user-display-name');
    if (bar) bar.style.display = 'flex';
    if (nameDisplay) {
        nameDisplay.textContent = `👤 ${currentUser}${isAdmin ? ' (Admin)' : ''}`;
    }
}

function handleLogout() {
    currentUser = null;
    isAdmin = false;

    const mainContent = document.getElementById('main-content');
    const adminPanel = document.getElementById('admin-panel');
    const footer = document.getElementById('main-footer');
    const userInfoBar = document.getElementById('user-info-bar');

    if (mainContent) mainContent.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'none';
    if (footer) footer.style.display = 'none';
    if (userInfoBar) userInfoBar.style.display = 'none';

    const loginOverlay = document.getElementById('login-overlay');
    const passwordInput = document.getElementById('password-input');
    const usernameInput = document.getElementById('username-input');
    if (loginOverlay) loginOverlay.style.display = 'flex';
    if (passwordInput) passwordInput.value = '';
    if (usernameInput) {
        usernameInput.value = '';
        usernameInput.focus();
    }
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function setupChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    const changeBtn = document.getElementById('change-password-btn');
    const cancelBtn = document.getElementById('change-password-cancel');
    const confirmBtn = document.getElementById('change-password-confirm');

    if (changeBtn) changeBtn.addEventListener('click', () => {
        if (modal) modal.style.display = 'flex';
        document.getElementById('current-password-input')?.focus();
    });

    if (cancelBtn) cancelBtn.addEventListener('click', closeChangePasswordModal);
    if (confirmBtn) confirmBtn.addEventListener('click', attemptChangePassword);

    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeChangePasswordModal();
    });

    document.getElementById('confirm-password-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') attemptChangePassword();
    });
}

function closeChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) modal.style.display = 'none';
    ['current-password-input', 'new-password-input', 'confirm-password-input'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const errorEl = document.getElementById('change-password-error');
    const successEl = document.getElementById('change-password-success');
    if (errorEl) errorEl.textContent = '';
    if (successEl) successEl.textContent = '';
}

async function attemptChangePassword() {
    const currentPw = document.getElementById('current-password-input')?.value || '';
    const newPw = document.getElementById('new-password-input')?.value || '';
    const confirmPw = document.getElementById('confirm-password-input')?.value || '';
    const errorEl = document.getElementById('change-password-error');
    const successEl = document.getElementById('change-password-success');

    if (errorEl) errorEl.textContent = '';
    if (successEl) successEl.textContent = '';

    if (!currentPw || !newPw || !confirmPw) {
        if (errorEl) errorEl.textContent = 'All fields are required.';
        return;
    }
    if (newPw !== confirmPw) {
        if (errorEl) errorEl.textContent = 'New passwords do not match.';
        return;
    }
    if (newPw.length < 4) {
        if (errorEl) errorEl.textContent = 'New password must be at least 4 characters.';
        return;
    }

    const currentHash = await hashPassword(currentPw);
    const storedHash = getStoredHash(currentUser);
    if (currentHash !== storedHash) {
        if (errorEl) errorEl.textContent = 'Current password is incorrect.';
        return;
    }

    const newHash = await hashPassword(newPw);

    try {
        const path = currentUser.toLowerCase() === 'admin'
            ? 'passwords/admin'
            : `passwords/users/${currentUser}`;
        await db.ref(path).set(newHash);
        // Update local cache
        if (currentUser.toLowerCase() === 'admin') {
            passwordsData.admin = newHash;
        } else {
            if (!passwordsData.users) passwordsData.users = {};
            passwordsData.users[currentUser] = newHash;
        }
    } catch (error) {
        if (errorEl) errorEl.textContent = '❌ Failed to save. Check your connection and try again.';
        return;
    }

    if (successEl) successEl.textContent = '✅ Password changed successfully!';
    setTimeout(closeChangePasswordModal, 2000);
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────

function showAdminPanel() {
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) adminPanel.style.display = 'block';
    renderAdminUsersTable();
}

async function renderAdminUsersTable() {
    const tbody = document.getElementById('admin-users-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" style="color:#999;padding:1rem;">Loading...</td></tr>';

    const rows = await Promise.all(PARTICIPANTS.map(async name => {
        const defaultHash = await hashPassword(name.toLowerCase());
        const storedHash = passwordsData.users?.[name] || '';
        const isCustom = storedHash && storedHash !== defaultHash;
        return { name, isCustom };
    }));

    tbody.innerHTML = '';
    rows.forEach(({ name, isCustom }) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${name}</td>
            <td><span class="${isCustom ? 'custom-pw' : 'default-pw'}">${isCustom ? '🔑 Custom password' : '🔓 Default (username)'}</span></td>
            <td>
                <button class="admin-reset-btn" onclick="adminResetPassword('${name}')">Reset to Default</button>
                <button class="admin-set-btn" onclick="adminSetPassword('${name}')">Set Password</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function adminResetPassword(username) {
    const defaultHash = await hashPassword(username.toLowerCase());
    try {
        await db.ref(`passwords/users/${username}`).set(defaultHash);
        if (!passwordsData.users) passwordsData.users = {};
        passwordsData.users[username] = defaultHash;
        renderAdminUsersTable();
        showAdminMessage(`✅ ${username}'s password has been reset to default (their username in lowercase).`);
    } catch (error) {
        showAdminMessage(`❌ Failed to reset ${username}'s password. Check your connection.`);
    }
}

function adminSetPassword(username) {
    const modal = document.getElementById('admin-set-password-modal');
    const usernameEl = document.getElementById('admin-reset-username');
    if (usernameEl) usernameEl.textContent = username;
    if (modal) {
        modal.style.display = 'flex';
        modal.dataset.targetUser = username;
    }
    document.getElementById('admin-new-password')?.focus();
}

function closeAdminSetPasswordModal() {
    const modal = document.getElementById('admin-set-password-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.dataset.targetUser = '';
    }
    ['admin-new-password', 'admin-confirm-password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const errorEl = document.getElementById('admin-set-password-error');
    if (errorEl) errorEl.textContent = '';
}

async function confirmAdminSetPassword() {
    const modal = document.getElementById('admin-set-password-modal');
    const targetUser = modal?.dataset.targetUser;
    const newPw = document.getElementById('admin-new-password')?.value || '';
    const confirmPw = document.getElementById('admin-confirm-password')?.value || '';
    const errorEl = document.getElementById('admin-set-password-error');

    if (errorEl) errorEl.textContent = '';

    if (!newPw || !confirmPw) {
        if (errorEl) errorEl.textContent = 'Both fields are required.';
        return;
    }
    if (newPw !== confirmPw) {
        if (errorEl) errorEl.textContent = 'Passwords do not match.';
        return;
    }
    if (newPw.length < 4) {
        if (errorEl) errorEl.textContent = 'Password must be at least 4 characters.';
        return;
    }

    const hash = await hashPassword(newPw);
    try {
        await db.ref(`passwords/users/${targetUser}`).set(hash);
        if (!passwordsData.users) passwordsData.users = {};
        passwordsData.users[targetUser] = hash;
    } catch (error) {
        if (errorEl) errorEl.textContent = '❌ Failed to save. Check your connection and try again.';
        return;
    }

    closeAdminSetPasswordModal();
    renderAdminUsersTable();
    showAdminMessage(`✅ ${targetUser}'s password has been updated successfully.`);
}

function showAdminMessage(message) {
    const msgEl = document.getElementById('admin-message');
    if (msgEl) {
        msgEl.textContent = message;
        setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 5000);
    }
}

function setupAdminListeners() {
    document.getElementById('admin-set-cancel')?.addEventListener('click', closeAdminSetPasswordModal);
    document.getElementById('admin-set-confirm')?.addEventListener('click', confirmAdminSetPassword);

    const modal = document.getElementById('admin-set-password-modal');
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAdminSetPasswordModal();
    });

    document.getElementById('admin-confirm-password')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirmAdminSetPassword();
    });
}
