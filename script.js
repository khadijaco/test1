// ============================================
// 📊 منصة التداول الافتراضية - JavaScript
// ============================================

// ===== بيانات الأصول =====
const assets = {
    BTC: { name: 'Bitcoin', price: 45000, icon: '₿', color: '#f7931a' },
    ETH: { name: 'Ethereum', price: 3200, icon: '⟠', color: '#627eea' },
    AAPL: { name: 'Apple', price: 178, icon: '🍎', color: '#555555' },
    TSLA: { name: 'Tesla', price: 245, icon: '🚗', color: '#cc0000' },
    GOOGL: { name: 'Google', price: 142, icon: '🔍', color: '#4285f4' }
};

// ===== حالة المستخدم =====
let balance = 10000;
let portfolio = {}; // asset: { amount, avgPrice }
let trades = [];
let dailyProfit = 0;
let totalTrades = 0;
let winCount = 0;
let chart = null;
let priceHistory = [];
let tradeType = 'buy';

// ===== عناصر الصفحة =====
const balanceEl = document.getElementById('balance');
const dailyProfitEl = document.getElementById('dailyProfit');
const totalTradesEl = document.getElementById('totalTrades');
const winRateEl = document.getElementById('winRate');
const pricesGrid = document.getElementById('pricesGrid');
const assetSelect = document.getElementById('assetSelect');
const quantityInput = document.getElementById('quantityInput');
const currentPriceInput = document.getElementById('currentPriceInput');
const totalValueInput = document.getElementById('totalValueInput');
const portfolioGrid = document.getElementById('portfolioGrid');
const historyList = document.getElementById('historyList');
const buyBtn = document.getElementById('buyBtn');
const sellBtn = document.getElementById('sellBtn');
const executeBtn = document.getElementById('executeBtn');
const resetBtn = document.getElementById('resetBtn');
const exportBtn = document.getElementById('exportBtn');

// ===== Toast =====
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), duration);
}

function closeToast() {
    document.getElementById('toast').classList.remove('show');
}

// ===== تحديث الأسعار (محاكاة) =====
function updatePrices() {
    const symbols = Object.keys(assets);
    symbols.forEach(symbol => {
        // تغيير عشوائي ±2%
        const change = (Math.random() - 0.5) * 0.04;
        assets[symbol].price *= (1 + change);
        assets[symbol].price = Math.round(assets[symbol].price * 100) / 100;
    });
    
    renderPrices();
    updatePortfolio();
    updateChart();
    updateCurrentPrice();
}

// ===== عرض الأسعار =====
function renderPrices() {
    pricesGrid.innerHTML = Object.entries(assets).map(([symbol, data]) => {
        const change = ((data.price - 45000) / 45000 * 100).toFixed(2);
        const isUp = change >= 0;
        return `
            <div class="price-card">
                <div class="symbol">${data.icon} ${symbol}</div>
                <div class="name">${data.name}</div>
                <div class="price">$${data.price.toFixed(2)}</div>
                <div class="change ${isUp ? 'up' : 'down'}">
                    ${isUp ? '▲' : '▼'} ${Math.abs(change)}%
                </div>
            </div>
        `;
    }).join('');
}

// ===== تحديث الرسم البياني =====
function updateChart() {
    const ctx = document.getElementById('chart').getContext('2d');
    
    // إضافة سعر جديد
    const currentPrice = assets[assetSelect.value]?.price || 0;
    priceHistory.push(currentPrice);
    if (priceHistory.length > 50) priceHistory.shift();
    
    if (chart) {
        chart.destroy();
    }
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: priceHistory.map((_, i) => i + 1),
            datasets: [{
                label: assetSelect.value,
                data: priceHistory,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#8888aa' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#8888aa' }
                }
            }
        }
    });
}

// ===== تحديث السعر الحالي =====
function updateCurrentPrice() {
    const symbol = assetSelect.value;
    const price = assets[symbol]?.price || 0;
    currentPriceInput.value = `$${price.toFixed(2)}`;
    updateTotalValue();
}

// ===== تحديث القيمة الإجمالية =====
function updateTotalValue() {
    const symbol = assetSelect.value;
    const price = assets[symbol]?.price || 0;
    const quantity = parseFloat(quantityInput.value) || 0;
    totalValueInput.value = `$${(price * quantity).toFixed(2)}`;
}

// ===== تحديث المحفظة =====
function updatePortfolio() {
    if (Object.keys(portfolio).length === 0) {
        portfolioGrid.innerHTML = `
            <div class="empty-portfolio">
                <i class="fas fa-box-open"></i>
                <p>لا توجد أصول في المحفظة</p>
            </div>
        `;
        return;
    }
    
    portfolioGrid.innerHTML = Object.entries(portfolio).map(([symbol, data]) => {
        const currentPrice = assets[symbol]?.price || 0;
        const value = data.amount * currentPrice;
        const profit = value - (data.amount * data.avgPrice);
        const profitPercent = data.avgPrice > 0 ? (profit / (data.amount * data.avgPrice) * 100) : 0;
        const isUp = profit >= 0;
        
        return `
            <div class="portfolio-item">
                <div class="p-symbol">${assets[symbol]?.icon || ''} ${symbol}</div>
                <div class="p-amount">${data.amount.toFixed(4)}</div>
                <div class="p-value">$${value.toFixed(2)}</div>
                <div class="p-profit ${isUp ? 'up' : 'down'}">
                    ${isUp ? '▲' : '▼'} $${Math.abs(profit).toFixed(2)} (${profitPercent.toFixed(2)}%)
                </div>
            </div>
        `;
    }).join('');
}

// ===== تنفيذ صفقة =====
function executeTrade() {
    const symbol = assetSelect.value;
    const price = assets[symbol]?.price || 0;
    const quantity = parseFloat(quantityInput.value) || 0;
    
    if (quantity <= 0) {
        showToast('⚠️ الرجاء إدخال كمية صحيحة');
        return;
    }
    
    const total = price * quantity;
    
    if (tradeType === 'buy') {
        // شراء
        if (total > balance) {
            showToast('❌ الرصيد غير كافي!');
            return;
        }
        
        balance -= total;
        if (!portfolio[symbol]) {
            portfolio[symbol] = { amount: 0, avgPrice: 0 };
        }
        const totalCost = (portfolio[symbol].amount * portfolio[symbol].avgPrice) + total;
        portfolio[symbol].amount += quantity;
        portfolio[symbol].avgPrice = totalCost / portfolio[symbol].amount;
        
        trades.push({
            type: 'buy',
            symbol: symbol,
            quantity: quantity,
            price: price,
            total: total,
            time: new Date().toLocaleString()
        });
        
        showToast(`✅ تم شراء ${quantity} ${symbol} بمبلغ $${total.toFixed(2)}`);
    } else {
        // بيع
        if (!portfolio[symbol] || portfolio[symbol].amount < quantity) {
            showToast('❌ الكمية غير متوفرة في المحفظة!');
            return;
        }
        
        portfolio[symbol].amount -= quantity;
        balance += total;
        
        if (portfolio[symbol].amount <= 0) {
            delete portfolio[symbol];
        }
        
        // حساب الربح/الخسارة
        const avgPrice = portfolio[symbol]?.avgPrice || 0;
        const profit = (price - avgPrice) * quantity;
        dailyProfit += profit;
        
        trades.push({
            type: 'sell',
            symbol: symbol,
            quantity: quantity,
            price: price,
            total: total,
            profit: profit,
            time: new Date().toLocaleString()
        });
        
        totalTrades++;
        if (profit > 0) winCount++;
        
        const profitText = profit > 0 ? `ربح $${profit.toFixed(2)}` : `خسارة $${Math.abs(profit).toFixed(2)}`;
        showToast(`🔴 تم بيع ${quantity} ${symbol} (${profitText})`);
    }
    
    // تحديث الواجهة
    updateUI();
}

// ===== تحديث الواجهة =====
function updateUI() {
    balanceEl.textContent = balance.toFixed(2);
    dailyProfitEl.textContent = `${dailyProfit >= 0 ? '+' : ''}${dailyProfit.toFixed(2)}`;
    dailyProfitEl.className = dailyProfit >= 0 ? 'profit' : 'profit negative';
    totalTradesEl.textContent = totalTrades;
    winRateEl.textContent = totalTrades > 0 ? `${Math.round(winCount / totalTrades * 100)}%` : '0%';
    
    updatePortfolio();
    updateHistory();
    updateCurrentPrice();
}

// ===== تحديث تاريخ الصفقات =====
function updateHistory() {
    if (trades.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <p>📭 لا توجد صفقات بعد</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = trades.slice().reverse().map(trade => `
        <div class="history-item ${trade.type}">
            <span class="h-asset">${assets[trade.symbol]?.icon || ''} ${trade.symbol}</span>
            <span class="h-type ${trade.type}">${trade.type === 'buy' ? '🟢 شراء' : '🔴 بيع'}</span>
            <span>${trade.quantity} × $${trade.price.toFixed(2)}</span>
            <span class="h-price">$${trade.total.toFixed(2)}</span>
            ${trade.profit ? `<span style="color: ${trade.profit >= 0 ? 'var(--green)' : 'var(--red)'}">
                ${trade.profit >= 0 ? '▲' : '▼'} $${Math.abs(trade.profit).toFixed(2)}
            </span>` : ''}
            <span style="font-size:12px;color:var(--text-secondary)">${trade.time}</span>
        </div>
    `).join('');
}

// ===== إعادة تعيين =====
function resetAll() {
    if (confirm('⚠️ هل أنت متأكد من إعادة تعيين كل شيء؟')) {
        balance = 10000;
        portfolio = {};
        trades = [];
        dailyProfit = 0;
        totalTrades = 0;
        winCount = 0;
        priceHistory = [];
        
        if (chart) {
            chart.destroy();
            chart = null;
        }
        
        updateUI();
        renderPrices();
        showToast('🔄 تم إعادة التعيين');
    }
}

// ===== تصدير التقرير =====
function exportReport() {
    let text = '📊 تقرير التداول\n';
    text += '='.repeat(40) + '\n';
    text += `💰 الرصيد: $${balance.toFixed(2)}\n`;
    text += `📈 الربح اليومي: $${dailyProfit.toFixed(2)}\n`;
    text += `📊 عدد الصفقات: ${totalTrades}\n`;
    text += `🏆 نسبة الربح: ${totalTrades > 0 ? Math.round(winCount / totalTrades * 100) : 0}%\n`;
    text += '='.repeat(40) + '\n';
    text += '📝 تاريخ الصفقات:\n';
    
    trades.forEach((t, i) => {
        text += `${i+1}. ${t.type.toUpperCase()} ${t.symbol} ${t.quantity} × $${t.price.toFixed(2)} = $${t.total.toFixed(2)}`;
        if (t.profit) text += ` (${t.profit >= 0 ? '+' : ''}${t.profit.toFixed(2)})`;
        text += ` [${t.time}]\n`;
    });
    
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trading_report_${new Date().toISOString().slice(0,10)}.txt`;
    link.click();
    showToast('📤 تم تصدير التقرير');
}

// ===== الأحداث =====
assetSelect.addEventListener('change', () => {
    updateCurrentPrice();
    updateChart();
});

quantityInput.addEventListener('input', updateTotalValue);

buyBtn.addEventListener('click', () => {
    tradeType = 'buy';
    buyBtn.classList.add('active');
    sellBtn.classList.remove('active');
});

sellBtn.addEventListener('click', () => {
    tradeType = 'sell';
    sellBtn.classList.add('active');
    buyBtn.classList.remove('active');
});

executeBtn.addEventListener('click', executeTrade);

resetBtn.addEventListener('click', resetAll);

exportBtn.addEventListener('click', exportReport);

// ===== بدء التطبيق =====
buyBtn.classList.add('active');
renderPrices();
updateUI();
updateCurrentPrice();
updateChart();

// ===== تحديث الأسعار كل 3 ثواني =====
setInterval(() => {
    updatePrices();
    updateUI();
}, 3000);

console.log('📊 منصة التداول الافتراضية جاهزة!');
console.log('💰 رصيدك:', balance);
console