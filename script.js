/* --- CONSTANTS & CONFIG --- */
const STORAGE = {
    MILK: 'milkData',
    SEP: 'separationResults',
    JOURNAL: 'journal'
};

const DENSITIES = {
    MILK: 1.030,
    CREAM: 1.010,
    SKIM: 1.035
};

/* --- STORAGE HELPERS --- */
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

function clearData(key) {
    localStorage.removeItem(key);
}

/* --- UI HELPERS --- */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function validateInput(id, required = true) {
    const el = document.getElementById(id);
    if (!el) return { valid: true, value: null };
    const val = parseFloat(el.value);
    const errorSpan = el.parentElement.querySelector('.error-msg');
    
    if (required && (el.value === '' || isNaN(val))) {
        if (errorSpan) errorSpan.textContent = 'Обязательное поле';
        el.style.borderColor = 'var(--error)';
        return { valid: false, value: null };
    }
    
    if (!isNaN(val) && val < 0) {
        if (errorSpan) errorSpan.textContent = 'Значение не может быть отрицательным';
        el.style.borderColor = 'var(--error)';
        return { valid: false, value: null };
    }

    if (errorSpan) errorSpan.textContent = '';
    el.style.borderColor = '#ddd';
    return { valid: true, value: val };
}

function checkLosses(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    const val = parseFloat(el.value) || 0;
    if (val > 5) {
        el.classList.add('high-loss');
    } else {
        el.classList.remove('high-loss');
    }
}

function guardRoute() {
    const path = window.location.pathname;
    if (path.includes('index.html') || path.endsWith('/')) return;
    if (!getData(STORAGE.MILK)) {
        showToast('Сначала заполните исходные данные', 'error');
        window.location.href = 'index.html';
    }
}

/* --- CALCULATION LOGIC --- */
function calcSeparation(milkVol, milkFat, milkDensity, losses, creamFatTarget = 35) {
    const mMilk = milkVol * milkDensity;
    // Формула из ТЗ: M_cream = M_milk * (fat_milk – 0.05) / (cream_fat – 0.05)
    // Примечание: жирности в формуле в долях (0.04), но в 입력 в процентах (4.0). Приводим.
    const fMilk = milkFat / 100;
    const fCream = creamFatTarget / 100;
    
    let mCream = mMilk * (fMilk - 0.0005) / (fCream - 0.0005); // 0.05% = 0.0005
    if (mCream < 0) mCream = 0;
    
    let mSkim = mMilk - mCream;
    
    // Применяем потери
    const lossFactor = 1 - (losses / 100);
    // Распределяем потери пропорционально или вычитаем из общей массы. 
    // По ТЗ: "M_milk = M_cream + M_skim + M_milk * losses_sep/100"
    // Упростим: уменьшим массу продуктов на процент потерь от исходной массы
    const totalLossMass = mMilk * (losses / 100);
    // Вычтем потери пропорционально массе сливок и обрата
    const ratioCream = mCream / (mCream + mSkim || 1);
    mCream = mCream - (totalLossMass * ratioCream);
    mSkim = mSkim - (totalLossMass * (1 - ratioCream));

    if (mCream < 0) mCream = 0;
    if (mSkim < 0) mSkim = 0;

    return {
        creamMass: mCream,
        creamVolume: mCream / DENSITIES.CREAM,
        creamFat: creamFatTarget,
        skimMass: mSkim,
        skimVolume: mSkim / DENSITIES.SKIM,
        skimFat: 0.05, // Стандартное содержание жира в обрате
        losses: losses
    };
}

function calcNormalization(currentVol, currentFat, targetFat, componentFat, componentDensity) {
    // Квадрат Пирсона
    // M_add = M_milk * (fat_milk - target_fat) / (target_fat - add_fat)
    // Работаем с массами
    const mMilk = currentVol * DENSITIES.MILK; // Приблизительно
    const fMilk = currentFat / 100;
    const fTarget = targetFat / 100;
    const fComp = componentFat / 100;

    if (Math.abs(fTarget - fComp) < 0.0001) return null; // Деление на ноль

    const mAdd = mMilk * (fMilk - fTarget) / (fTarget - fComp);
    return {
        mass: mAdd,
        volume: mAdd / componentDensity
    };
}

/* --- PAGE INITIALIZERS --- */

function initIndex() {
    const form = document.getElementById('milk-form');
    if (!form) return;

    // Заполнение плотности по умолчанию, если нет данных
    if (!document.getElementById('density').value) {
        document.getElementById('density').value = 1.030;
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const vVol = validateInput('volume');
        const vFat = validateInput('fat');
        const vDen = validateInput('density', false);
        const vProt = validateInput('protein', false);

        if (!vVol.valid || !vFat.valid) {
            showToast('Проверьте заполнение обязательных полей', 'error');
            return;
        }

        const data = {
            volume: vVol.value,
            fat: vFat.value,
            density: vDen.valid ? vDen.value : 1.030,
            protein: vProt.valid ? vProt.value : null,
            timestamp: new Date().toISOString()
        };

        saveData(STORAGE.MILK, data);
        clearData(STORAGE.SEP); // Сброс результатов сепарирования при новом молоке
        showToast('Исходные данные сохранены');
        window.location.href = 'choose-direction.html';
    });
}

function initChoose() {
    // Просто проверка доступа
    guardRoute();
}

function initScenarioMilk() {
    guardRoute();
    const milkData = getData(STORAGE.MILK);
    if (!milkData) return;

    // Toggle UI
    document.getElementById('milk-check').addEventListener('change', (e) => {
        document.getElementById('milk-block').style.display = e.target.checked ? 'block' : 'none';
    });
    document.getElementById('sourcream-check').addEventListener('change', (e) => {
        document.getElementById('sourcream-block').style.display = e.target.checked ? 'block' : 'none';
    });
    document.getElementById('tvorog-check').addEventListener('change', (e) => {
        document.getElementById('tvorog-block').style.display = e.target.checked ? 'block' : 'none';
    });
    
    document.getElementById('milk-fat-select').addEventListener('change', (e) => {
        document.getElementById('milk-fat-custom').style.display = e.target.value === 'custom' ? 'block' : 'none';
    });
    document.getElementById('tvorog-fat-select').addEventListener('change', (e) => {
        document.getElementById('tvorog-fat-custom').style.display = e.target.value === 'custom' ? 'block' : 'none';
    });

    // Losses highlight
    ['sep-losses', 'milk-losses', 'sourcream-losses', 'tvorog-losses'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', () => checkLosses(id));
            checkLosses(id);
        }
    });

    document.getElementById('calc-btn').addEventListener('click', () => {
        // 1. Separation
        const vSepLoss = validateInput('sep-losses', false);
        const vCreamFat = validateInput('cream-fat-target', false);
        const lossesSep = vSepLoss.valid ? vSepLoss.value : 0.3;
        const creamFatTarget = vCreamFat.valid ? vCreamFat.value : 35;

        const sepRes = calcSeparation(milkData.volume, milkData.fat, milkData.density, lossesSep, creamFatTarget);
        saveData(STORAGE.SEP, { ...sepRes, timestamp: new Date().toISOString() });

        let resultsHtml = `<h4>Сепарирование:</h4><ul>
            <li>Сливки: ${sepRes.creamVolume.toFixed(2)} л (${sepRes.creamMass.toFixed(2)} кг)</li>
            <li>Обрат: ${sepRes.skimVolume.toFixed(2)} л (${sepRes.skimMass.toFixed(2)} кг)</li>
            <li>Потери: ${lossesSep}%</li>
        </ul>`;

        let hasError = false;

        // 2. Milk
        if (document.getElementById('milk-check').checked) {
            const vVolT = validateInput('milk-volume-target');
            const vLoss = validateInput('milk-losses', false);
            let targetFat = parseFloat(document.getElementById('milk-fat-select').value);
            if (document.getElementById('milk-fat-select').value === 'custom') {
                const vCustom = validateInput('milk-fat-custom');
                if (!vCustom.valid) { hasError = true; }
                else targetFat = vCustom.value;
            }

            if (!vVolT.valid || !vLoss.valid) hasError = true;

            if (!hasError) {
                // Logic: Normalize whole milk to target fat using skim or cream
                // Simplified: Check if we have enough skim/cream to adjust whole milk batch to target
                // For this scenario, let's assume we take part of whole milk + add skim/cream
                // But prompt says: "Desired volume of drinking milk".
                // Let's assume we normalize the Whole Milk to Target Fat.
                
                const norm = calcNormalization(milkData.volume, milkData.fat, targetFat, sepRes.skimFat, DENSITIES.SKIM);
                // If target < milkFat, we need skim. If target > milkFat, we need cream.
                
                let addVol = 0;
                let addType = '';
                
                if (targetFat < milkData.fat) {
                    // Need skim
                    if (norm && norm.volume > 0) {
                        if (norm.volume > sepRes.skimVolume) {
                            resultsHtml += `<li class="text-error">Нехватка обрата для молока! Нужно ${norm.volume.toFixed(2)} л, есть ${sepRes.skimVolume.toFixed(2)} л</li>`;
                            hasError = true;
                        } else {
                            addVol = norm.volume;
                            addType = 'обрата';
                        }
                    }
                } else {
                    // Need cream
                     if (norm && norm.volume > 0) { // Formula gives negative if target > current using skim logic, need flip
                        // Recalc for cream
                        const normCream = calcNormalization(milkData.volume, milkData.fat, targetFat, creamFatTarget, DENSITIES.CREAM);
                        if (normCream && normCream.volume > 0) {
                             if (normCream.volume > sepRes.creamVolume) {
                                resultsHtml += `<li class="text-error">Нехватка сливок для молока!</li>`;
                                hasError = true;
                            } else {
                                addVol = normCream.volume;
                                addType = 'сливок';
                            }
                        }
                     }
                }

                if (!hasError) {
                    const finalVol = (milkData.volume + addVol) * (1 - (vLoss.value || 0)/100);
                    resultsHtml += `<h4>Питьевое молоко:</h4><ul>
                        <li>Добавлено ${addType}: ${addVol.toFixed(2)} л</li>
                        <li>Итоговый объём: ${finalVol.toFixed(2)} л</li>
                    </ul>`;
                }
            }
        }

        // 3. Sour Cream
        if (document.getElementById('sourcream-check').checked && !hasError) {
            const vFat = validateInput('sourcream-fat', false);
            const vStart = validateInput('starter-pct', false);
            const vLoss = validateInput('sourcream-losses', false);
            
            if (vFat.valid && vFat.value > creamFatTarget) {
                resultsHtml += `<li class="text-error">Жирность сметаны не может быть выше жирности сливок</li>`;
                hasError = true;
            } else if (!hasError) {
                const volSC = sepRes.creamVolume * (1 - (vLoss.value||0)/100);
                const starterVol = sepRes.creamVolume * (vStart.value||0) / 100;
                resultsHtml += `<h4>Сметана:</h4><ul>
                    <li>Объём сметаны: ${volSC.toFixed(2)} л</li>
                    <li>Закваска: ${starterVol.toFixed(2)} л (${(starterVol*1000/5).toFixed(0)} ч.л.)</li>
                </ul>`;
            }
        }

        // 4. Cottage Cheese
        if (document.getElementById('tvorog-check').checked && !hasError) {
            const vLoss = validateInput('tvorog-losses', false);
            let targetFat = parseFloat(document.getElementById('tvorog-fat-select').value);
            if (document.getElementById('tvorog-fat-select').value === 'custom') {
                const vC = validateInput('tvorog-fat-custom');
                if(vC.valid) targetFat = vC.value;
            }
            const vMoist = validateInput('tvorog-moisture', false);

            if (!vLoss.valid || !vMoist.valid) hasError = true;

            if (!hasError) {
                // Simplified Tvorog Calc based on prompt logic
                // M_tvorog_skim = M_skim * (8.5/100) / ((100 - moisture)/100)
                // 8.5% protein in skim assumption? Prompt says 8.5.
                const mTvorogSkim = sepRes.skimMass * 0.085 / ((100 - (vMoist.value||80))/100);
                
                let mCreamAdd = 0;
                if (targetFat > 0.2) { // 0.2% fat in skim tvorog base
                     // M_cream_add = M_tvorog_skim * (target_fat – 0.2) / (cream_fat – target_fat)
                     // Careful with units (percent vs fraction)
                     const tf = targetFat / 100;
                     const cf = creamFatTarget / 100;
                     if (cf > tf) {
                         mCreamAdd = mTvorogSkim * (tf - 0.002) / (cf - tf);
                     }
                }

                if (mCreamAdd > sepRes.creamMass) {
                    resultsHtml += `<li class="text-error">Нехватка сливок для творога!</li>`;
                    hasError = true;
                } else {
                    const mTotal = (mTvorogSkim + mCreamAdd) * (1 - (vLoss.value||0)/100);
                    resultsHtml += `<h4>Творог:</h4><ul>
                        <li>Масса творога: ${mTotal.toFixed(2)} кг</li>
                        <li>Добавлено сливок: ${(mCreamAdd/DENSITIES.CREAM).toFixed(2)} л</li>
                    </ul>`;
                }
            }
        }

        const resArea = document.getElementById('results-area');
        const resContent = document.getElementById('results-content');
        
        if (hasError) {
            resContent.innerHTML = `<p class="text-error">Расчёт невозможен из-за нехватки компонентов или ошибок ввода.</p>` + resultsHtml;
            resArea.style.display = 'block';
            resArea.style.borderLeftColor = 'var(--error)';
        } else {
            resContent.innerHTML = resultsHtml;
            resArea.style.display = 'block';
            resArea.style.borderLeftColor = 'var(--success)';
            showToast('Расчёт выполнен');
        }
    });

    document.getElementById('save-journal-btn').addEventListener('click', () => {
        const entry = {
            date: new Date().toLocaleString(),
            scenario: 'milk',
            input: {
                lossesSep: document.getElementById('sep-losses').value,
                milkCheck: document.getElementById('milk-check').checked,
                // ... capture other inputs
            },
            results: document.getElementById('results-content').innerText
        };
        const journal = getData(STORAGE.JOURNAL) || [];
        journal.unshift(entry);
        saveData(STORAGE.JOURNAL, journal);
        showToast('Сохранено в журнал');
    });
}

function initScenarioCheese() {
    guardRoute();
    const milkData = getData(STORAGE.MILK);
    if (!milkData) return;

    // Calc K coeff on input change
    const mdzhsvInput = document.getElementById('mdzhsv');
    const kInput = document.getElementById('k-coeff');
    function updateK() {
        let val = parseFloat(mdzhsvInput.value) || 45;
        // Interpolate 1.98 (45%) to 2.16 (50%)
        let k = 1.98 + (val - 45) * (2.16 - 1.98) / (50 - 45);
        if (val < 45) k = 1.98;
        if (val > 50) k = 2.16;
        kInput.value = k.toFixed(3);
    }
    mdzhsvInput.addEventListener('input', updateK);
    updateK();

    // Auto protein
    const protInput = document.getElementById('cheese-protein');
    if (!milkData.protein) {
        // B = 0.5*Zh + 1.3
        const calcProt = 0.5 * milkData.fat + 1.3;
        protInput.value = calcProt.toFixed(2);
    } else {
        protInput.value = milkData.protein;
    }

    ['sep-losses', 'cheese-losses'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', () => checkLosses(id));
            checkLosses(id);
        }
    });

    document.getElementById('calc-btn').addEventListener('click', () => {
        // Separation first
        const vSepLoss = validateInput('sep-losses', false);
        const lossesSep = vSepLoss.valid ? vSepLoss.value : 0.3;
        const creamFatTarget = parseFloat(document.getElementById('cream-fat-target').value) || 35;
        
        const sepRes = calcSeparation(milkData.volume, milkData.fat, milkData.density, lossesSep, creamFatTarget);
        saveData(STORAGE.SEP, { ...sepRes, timestamp: new Date().toISOString() });

        // Cheese Norm
        const k = parseFloat(kInput.value);
        const protein = parseFloat(protInput.value);
        const mdzhsv = parseFloat(mdzhsvInput.value);
        
        // Ж_нм = К * Б_ц * МДЖСВ / 100
        const targetFatNorm = k * protein * mdzhsv / 100;
        
        let resultsHtml = `<h4>Нормализация для сыра:</h4><ul>
            <li>Целевая жирность нормализованного молока: ${targetFatNorm.toFixed(2)}%</li>`;
        
        let hasError = false;
        let addVol = 0;

        if (targetFatNorm < milkData.fat) {
            // Need Skim
            const norm = calcNormalization(milkData.volume, milkData.fat, targetFatNorm, 0.05, DENSITIES.SKIM);
            if (norm && norm.volume > 0) {
                if (norm.volume > sepRes.skimVolume) {
                    resultsHtml += `<li class="text-error">Нехватка обрата!</li>`;
                    hasError = true;
                } else {
                    addVol = norm.volume;
                    resultsHtml += `<li>Добавить обрат: ${addVol.toFixed(2)} л</li>`;
                }
            }
        } else {
            // Need Cream
            const norm = calcNormalization(milkData.volume, milkData.fat, targetFatNorm, creamFatTarget, DENSITIES.CREAM);
            if (norm && norm.volume > 0) {
                 if (norm.volume > sepRes.creamVolume) {
                    resultsHtml += `<li class="text-error">Нехватка сливок!</li>`;
                    hasError = true;
                } else {
                    addVol = norm.volume;
                    resultsHtml += `<li>Добавить сливки: ${addVol.toFixed(2)} л</li>`;
                }
            }
        }

        const volNorm = milkData.volume + addVol;
        resultsHtml += `<li>Объём нормализованного молока: ${volNorm.toFixed(2)} л</li></ul>`;

        // Dosages
        const sRate = parseFloat(document.getElementById('starter-rate').value) || 0;
        const eRate = parseFloat(document.getElementById('enzyme-rate').value) || 0;
        const cRate = parseFloat(document.getElementById('cacl2-rate').value) || 0;

        resultsHtml += `<h4>Дозировки:</h4><ul>
            <li>Закваска: ${(volNorm * sRate).toFixed(1)} г (${(volNorm * sRate / 5).toFixed(1)} ч.л.)</li>
            <li>Фермент: ${(volNorm * eRate).toFixed(1)} мл (${(volNorm * eRate / 5).toFixed(1)} ч.л.)</li>
            <li>CaCl₂: ${(volNorm * cRate).toFixed(1)} г</li>
        </ul>`;

        const resArea = document.getElementById('results-area');
        const resContent = document.getElementById('results-content');
        resContent.innerHTML = resultsHtml;
        resArea.style.display = 'block';
        
        if (!hasError) showToast('Расчёт выполнен');
    });

    document.getElementById('calc-fact-btn').addEventListener('click', () => {
        const m = parseFloat(document.getElementById('fact-mass').value);
        const f = parseFloat(document.getElementById('fact-fat').value);
        const w = parseFloat(document.getElementById('fact-moisture').value);
        const outDiv = document.getElementById('fact-results');

        if (!m || !f || !w) {
            outDiv.innerHTML = '<span class="text-error">Заполните все поля</span>';
            return;
        }

        // МДЖСВ = fat_cheese * 100 / (100 – moisture_cheese)
        const mdzhsvFact = f * 100 / (100 - w);
        outDiv.innerHTML = `<p>Фактическая МДЖСВ: <strong>${mdzhsvFact.toFixed(2)}%</strong></p>`;
    });

    document.getElementById('save-journal-btn').addEventListener('click', () => {
        const entry = {
            date: new Date().toLocaleString(),
            scenario: 'cheese',
            input: { mdzhsv: mdzhsvInput.value },
            results: document.getElementById('results-content').innerText
        };
        const journal = getData(STORAGE.JOURNAL) || [];
        journal.unshift(entry);
        saveData(STORAGE.JOURNAL, journal);
        showToast('Сохранено в журнал');
    });
}

function initJournal() {
    const list = document.getElementById('journal-list');
    const emptyMsg = document.getElementById('empty-msg');
    const journal = getData(STORAGE.JOURNAL) || [];

    if (journal.length === 0) {
        emptyMsg.style.display = 'block';
        return;
    }

    journal.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'card btn-card';
        card.innerHTML = `<h3>${item.date}</h3><p>Сценарий: ${item.scenario === 'milk' ? 'Молоко/Творог' : 'Сыр'}</p>`;
        card.addEventListener('click', () => {
            openModal(item);
        });
        list.appendChild(card);
    });

    document.getElementById('clear-journal').addEventListener('click', () => {
        if(confirm('Очистить весь журнал?')) {
            clearData(STORAGE.JOURNAL);
            location.reload();
        }
    });

    document.getElementById('export-csv').addEventListener('click', () => {
        let csv = 'Date,Scenario,Results\n';
        journal.forEach(j => {
            csv += `"${j.date}","${j.scenario}","${j.results.replace(/"/g, '""')}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cifromilk_journal.csv';
        a.click();
    });
}

/* --- MODAL --- */
function openModal(item) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');
    const title = document.getElementById('modal-title');
    
    title.textContent = `Запись от ${item.date}`;
    body.innerHTML = `<pre style="white-space: pre-wrap; background:#f4f4f4; padding:10px;">${item.results}</pre>`;
    modal.style.display = 'block';

    document.getElementById('copy-details').onclick = () => {
        navigator.clipboard.writeText(item.results).then(() => showToast('Скопировано'));
    };
}

document.addEventListener('click', (e) => {
    const modal = document.getElementById('modal');
    if (e.target === modal || e.target.className === 'close-modal') {
        modal.style.display = 'none';
    }
});

/* --- ROUTING --- */
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('index.html') || path.endsWith('/')) initIndex();
    else if (path.includes('choose-direction.html')) initChoose();
    else if (path.includes('scenario-milk.html')) initScenarioMilk();
    else if (path.includes('scenario-cheese.html')) initScenarioCheese();
    else if (path.includes('journal.html')) initJournal();
});