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
    const fMilk = milkFat / 100;
    const fCream = creamFatTarget / 100;
    
    let mCream = mMilk * (fMilk - 0.0005) / (fCream - 0.0005);
    if (mCream < 0) mCream = 0;
    
    let mSkim = mMilk - mCream;
    
    const totalLossMass = mMilk * (losses / 100);
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
        skimFat: 0.05,
        losses: losses
    };
}

function calcNormalization(currentVol, currentFat, targetFat, componentFat, componentDensity) {
    const mMilk = currentVol * DENSITIES.MILK;
    const fMilk = currentFat / 100;
    const fTarget = targetFat / 100;
    const fComp = componentFat / 100;

    if (Math.abs(fTarget - fComp) < 0.0001) return null;

    const mAdd = mMilk * (fMilk - fTarget) / (fTarget - fComp);
    return {
        mass: mAdd,
        volume: mAdd / componentDensity
    };
}

/* --- RECIPE GENERATORS --- */
function generateMilkRecipe(milkData, addVol, addType, finalVol, targetFat) {
    return `🥛 Рецепт питьевого молока
Ингредиенты:
• Цельное молоко: ${milkData.volume.toFixed(1)} л
• ${addType === 'обрата' ? 'Обрат' : 'Сливки'}: ${addVol.toFixed(1)} л

Пошаговая инструкция:
1. Налейте ${milkData.volume.toFixed(1)} л цельного молока в ёмкость.
2. Добавьте ${addVol.toFixed(1)} л ${addType === 'обрата' ? 'обрата' : 'сливок'}.
3. Перемешайте, пастеризуйте. Получите ${finalVol.toFixed(1)} л молока жирностью ${targetFat}%.`;
}

function generateSourCreamRecipe(creamVol, sourCreamVol, starterGrams, starterSpoons, targetFat) {
    return `🥣 Рецепт сметаны
Ингредиенты:
• Сливки ${targetFat}%: ${creamVol.toFixed(1)} л
• Закваска: ${starterGrams.toFixed(1)} г (${starterSpoons})

Пошаговая инструкция:
1. Пастеризуйте ${creamVol.toFixed(1)} л сливок при 85-90°C.
2. Охладите до 40-42°C.
3. Внесите ${starterGrams.toFixed(1)} г закваски (${starterSpoons}).
4. Перемешайте, термостатируйте 6-8 часов.
5. Охладите. Получите ${sourCreamVol.toFixed(1)} л сметаны.`;
}

function generateTvorogRecipe(skimVol, creamAddVol, tvorogMass, targetFat, starterGrams, starterSpoons) {
    return `🧀 Рецепт творога
Ингредиенты:
• Обрат: ${skimVol.toFixed(1)} л
• Сливки: ${creamAddVol.toFixed(1)} л
• Закваска: ${starterGrams.toFixed(1)} г (${starterSpoons})

Пошаговая инструкция:
1. Пастеризуйте ${skimVol.toFixed(1)} л обрата при 85-90°C.
2. Охладите до 35-38°C.
3. Внесите ${starterGrams.toFixed(1)} г закваски (${starterSpoons}).
4. Добавьте ${creamAddVol.toFixed(1)} л сливок для нормализации.
5. Внесите сычужный фермент, оставьте на 30-40 минут.
6. Разрежьте сгусток, нагрейте до 45-50°C.
7. Слейте сыворотку, прессуйте.
8. Получите ${tvorogMass.toFixed(1)} кг творога жирностью ${targetFat}%.`;
}

function generateCheeseRecipe(normMilkVol, starterGrams, starterSpoons, enzymeMl, enzymeSpoons, cacl2Grams, mdzhsv) {
    return `🧀 Рецепт сыра (Качотта)
Ингредиенты:
• Нормализованное молоко: ${normMilkVol.toFixed(1)} л
• Закваска: ${starterGrams.toFixed(1)} г (${starterSpoons})
• Фермент: ${enzymeMl.toFixed(1)} мл (${enzymeSpoons})
• CaCl₂: ${cacl2Grams.toFixed(1)} г

Пошаговая инструкция:
1. Пастеризуйте ${normMilkVol.toFixed(1)} л нормализованного молока при 72-75°C.
2. Охладите до 35-38°C.
3. Внесите ${starterGrams.toFixed(1)} г закваски (${starterSpoons}), перемешайте.
4. Добавьте ${cacl2Grams.toFixed(1)} г CaCl₂, растворённого в воде.
5. Внесите ${enzymeMl.toFixed(1)} мл фермента (${enzymeSpoons}), перемешайте.
6. Оставьте на 40-60 минут до образования сгустка.
7. Разрежьте сгусток, вымешивайте 20-30 минут.
8. Слейте сыворотку, формуйте, прессуйте.
9. Посолите в рассоле 18-20% 2-4 часа.
10. Созревайте при 12-14°C, влажности 85-90%.
11. Получите сыр с МДЖСВ ${mdzhsv}%.`;
}

/* --- PAGE INITIALIZERS --- */

function initIndex() {
    const form = document.getElementById('milk-form');
    if (!form) return;

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
        clearData(STORAGE.SEP);
        showToast('Исходные данные сохранены');
        window.location.href = 'choose-direction.html';
    });
}

function initChoose() {
    guardRoute();
}

function initScenarioMilk() {
    guardRoute();
    const milkData = getData(STORAGE.MILK);
    if (!milkData) return;

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

    ['sep-losses', 'milk-losses', 'sourcream-losses', 'tvorog-losses'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', () => checkLosses(id));
            checkLosses(id);
        }
    });

    document.getElementById('calc-btn').addEventListener('click', () => {
        const vSepLoss = validateInput('sep-losses', false);
        const vCreamFat = validateInput('cream-fat-target', false);
        const lossesSep = vSepLoss.valid ? vSepLoss.value : 0.3;
        const creamFatTarget = vCreamFat.valid ? vCreamFat.value : 35;

        const sepRes = calcSeparation(milkData.volume, milkData.fat, milkData.density, lossesSep, creamFatTarget);
        saveData(STORAGE.SEP, { ...sepRes, timestamp: new Date().toISOString() });

        let resultsHtml = '';
        let hasError = false;
        let journalInput = {
            lossesSep: lossesSep,
            creamFatTarget: creamFatTarget
        };

        // 1. Питьевое молоко
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
                let addVol = 0;
                let addType = '';
                
                if (targetFat < milkData.fat) {
                    const norm = calcNormalization(milkData.volume, milkData.fat, targetFat, 0.05, DENSITIES.SKIM);
                    if (norm && norm.volume > 0) {
                        if (norm.volume > sepRes.skimVolume) {
                            resultsHtml += `<div class="recipe-card"><h4>🥛 Питьевое молоко</h4><p class="text-error">Нехватка обрата! Нужно ${norm.volume.toFixed(2)} л, есть ${sepRes.skimVolume.toFixed(2)} л</p></div>`;
                            hasError = true;
                        } else {
                            addVol = norm.volume;
                            addType = 'обрата';
                        }
                    }
                } else {
                    const normCream = calcNormalization(milkData.volume, milkData.fat, targetFat, creamFatTarget, DENSITIES.CREAM);
                    if (normCream && normCream.volume > 0) {
                         if (normCream.volume > sepRes.creamVolume) {
                            resultsHtml += `<div class="recipe-card"><h4>🥛 Питьевое молоко</h4><p class="text-error">Нехватка сливок!</p></div>`;
                            hasError = true;
                        } else {
                            addVol = normCream.volume;
                            addType = 'сливок';
                        }
                    }
                }

                if (!hasError) {
                    const finalVol = (milkData.volume + addVol) * (1 - (vLoss.value || 0)/100);
                    const recipe = generateMilkRecipe(milkData, addVol, addType, finalVol, targetFat);
                    journalInput.milk = { targetFat, addVol, addType, finalVol, losses: vLoss.value || 0 };
                    resultsHtml += `<div class="recipe-card">
                        <h4>🥛 Питьевое молоко</h4>
                        <pre>${recipe}</pre>
                        <button class="btn btn-copy" onclick="copyRecipe(this)">📋 Скопировать рецепт</button>
                    </div>`;
                }
            }
        }

        // 2. Сметана
        if (document.getElementById('sourcream-check').checked && !hasError) {
            const vFat = validateInput('sourcream-fat', false);
            const vStarterMilkVol = validateInput('starter-milk-vol', false);
            const vStarterMass = validateInput('starter-mass', false);
            const vLoss = validateInput('sourcream-losses', false);
            
            if (vFat.valid && vFat.value > creamFatTarget) {
                resultsHtml += `<div class="recipe-card"><h4>🥣 Сметана</h4><p class="text-error">Жирность сметаны не может быть выше жирности сливок</p></div>`;
                hasError = true;
            } else if (!hasError) {
                const volSC = sepRes.creamVolume * (1 - (vLoss.value||0)/100);
                const starterNorm = (vStarterMass.value || 50) / (vStarterMilkVol.value || 250); // г/л
                const starterGrams = sepRes.creamVolume * starterNorm;
                const starterSpoonsTsp = (starterGrams / 5).toFixed(1);
                const starterSpoonsTbsp = (starterGrams / 15).toFixed(1);
                const spoonsText = `${starterSpoonsTsp} ч.л. или ${starterSpoonsTbsp} ст.л.`;
                
                const recipe = generateSourCreamRecipe(sepRes.creamVolume, volSC, starterGrams, spoonsText, vFat.value || 20);
                journalInput.sourcream = { targetFat: vFat.value || 20, starterMilkVol: vStarterMilkVol.value || 250, starterMass: vStarterMass.value || 50, volSC, starterGrams, losses: vLoss.value || 0 };
                resultsHtml += `<div class="recipe-card">
                    <h4>🥣 Сметана</h4>
                    <pre>${recipe}</pre>
                    <button class="btn btn-copy" onclick="copyRecipe(this)">📋 Скопировать рецепт</button>
                </div>`;
            }
        }

        // 3. Творог
        if (document.getElementById('tvorog-check').checked && !hasError) {
            const vLoss = validateInput('tvorog-losses', false);
            let targetFat = parseFloat(document.getElementById('tvorog-fat-select').value);
            if (document.getElementById('tvorog-fat-select').value === 'custom') {
                const vC = validateInput('tvorog-fat-custom');
                if(vC.valid) targetFat = vC.value;
            }
            const vMoist = validateInput('tvorog-moisture', false);
            const vStarterMilkVol = validateInput('tvorog-starter-milk-vol', false);
            const vStarterMass = validateInput('tvorog-starter-mass', false);

            if (!vLoss.valid || !vMoist.valid) hasError = true;

            if (!hasError) {
                const mTvorogSkim = sepRes.skimMass * 0.085 / ((100 - (vMoist.value||80))/100);
                
                let mCreamAdd = 0;
                if (targetFat > 0.2) {
                     const tf = targetFat / 100;
                     const cf = creamFatTarget / 100;
                     if (cf > tf) {
                         mCreamAdd = mTvorogSkim * (tf - 0.002) / (cf - tf);
                     }
                }

                if (mCreamAdd > sepRes.creamMass) {
                    resultsHtml += `<div class="recipe-card"><h4>🧀 Творог</h4><p class="text-error">Нехватка сливок для творога!</p></div>`;
                    hasError = true;
                } else {
                    const mTotal = (mTvorogSkim + mCreamAdd) * (1 - (vLoss.value||0)/100);
                    const vCreamAdd = mCreamAdd / DENSITIES.CREAM;
                    const starterNorm = (vStarterMass.value || 50) / (vStarterMilkVol.value || 250);
                    const starterGrams = sepRes.skimVolume * starterNorm;
                    const starterSpoonsTsp = (starterGrams / 5).toFixed(1);
                    const starterSpoonsTbsp = (starterGrams / 15).toFixed(1);
                    const spoonsText = `${starterSpoonsTsp} ч.л. или ${starterSpoonsTbsp} ст.л.`;
                    
                    const recipe = generateTvorogRecipe(sepRes.skimVolume, vCreamAdd, mTotal, targetFat, starterGrams, spoonsText);
                    journalInput.tvorog = { targetFat, moisture: vMoist.value || 80, starterMilkVol: vStarterMilkVol.value || 250, starterMass: vStarterMass.value || 50, tvorogMass: mTotal, creamAddVol: vCreamAdd, starterGrams, losses: vLoss.value || 0 };
                    resultsHtml += `<div class="recipe-card">
                        <h4>🧀 Творог</h4>
                        <pre>${recipe}</pre>
                        <button class="btn btn-copy" onclick="copyRecipe(this)">📋 Скопировать рецепт</button>
                    </div>`;
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

        // Сохранение в журнал
        document.getElementById('save-journal-btn').onclick = () => {
            const entry = {
                date: new Date().toLocaleString(),
                scenario: 'milk',
                input: { ...journalInput, milkData },
                results: resContent.innerText
            };
            const journal = getData(STORAGE.JOURNAL) || [];
            journal.unshift(entry);
            saveData(STORAGE.JOURNAL, journal);
            showToast('Сохранено в журнал');
        };
    });
}

function initScenarioCheese() {
    guardRoute();
    const milkData = getData(STORAGE.MILK);
    if (!milkData) return;

    const mdzhsvInput = document.getElementById('mdzhsv');
    const kInput = document.getElementById('k-coeff');
    function updateK() {
        let val = parseFloat(mdzhsvInput.value) || 45;
        let k = 1.98 + (val - 45) * (2.16 - 1.98) / (50 - 45);
        if (val < 45) k = 1.98;
        if (val > 50) k = 2.16;
        kInput.value = k.toFixed(3);
    }
    mdzhsvInput.addEventListener('input', updateK);
    updateK();

    const protInput = document.getElementById('cheese-protein');
    if (!milkData.protein) {
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
        const vSepLoss = validateInput('sep-losses', false);
        const lossesSep = vSepLoss.valid ? vSepLoss.value : 0.3;
        const creamFatTarget = parseFloat(document.getElementById('cream-fat-target').value) || 35;
        
        const sepRes = calcSeparation(milkData.volume, milkData.fat, milkData.density, lossesSep, creamFatTarget);
        saveData(STORAGE.SEP, { ...sepRes, timestamp: new Date().toISOString() });

        const k = parseFloat(kInput.value);
        const protein = parseFloat(protInput.value);
        const mdzhsv = parseFloat(mdzhsvInput.value);
        
        const targetFatNorm = k * protein * mdzhsv / 100;
        
        let resultsHtml = '';
        let hasError = false;
        let addVol = 0;
        let journalInput = {
            lossesSep,
            creamFatTarget,
            mdzhsv,
            k,
            protein
        };

        if (targetFatNorm < milkData.fat) {
            const norm = calcNormalization(milkData.volume, milkData.fat, targetFatNorm, 0.05, DENSITIES.SKIM);
            if (norm && norm.volume > 0) {
                if (norm.volume > sepRes.skimVolume) {
                    resultsHtml += `<p class="text-error">Нехватка обрата!</p>`;
                    hasError = true;
                } else {
                    addVol = norm.volume;
                }
            }
        } else {
            const norm = calcNormalization(milkData.volume, milkData.fat, targetFatNorm, creamFatTarget, DENSITIES.CREAM);
            if (norm && norm.volume > 0) {
                 if (norm.volume > sepRes.creamVolume) {
                    resultsHtml += `<p class="text-error">Нехватка сливок!</p>`;
                    hasError = true;
                } else {
                    addVol = norm.volume;
                }
            }
        }

        const volNorm = milkData.volume + addVol;

        // Закваска и фермент
        const vStarterMilkVol = validateInput('starter-milk-vol', false);
        const vStarterMass = validateInput('starter-mass', false);
        const vEnzymeMilkVol = validateInput('enzyme-milk-vol', false);
        const vEnzymeVol = validateInput('enzyme-vol', false);
        const vCaCl2 = validateInput('cacl2-rate', false);

        const starterNorm = (vStarterMass.value || 50) / (vStarterMilkVol.value || 250); // г/л
        const starterGrams = volNorm * starterNorm;
        const starterSpoonsTsp = (starterGrams / 5).toFixed(1);
        const starterSpoonsTbsp = (starterGrams / 15).toFixed(1);
        const starterSpoonsText = `${starterSpoonsTsp} ч.л. или ${starterSpoonsTbsp} ст.л.`;

        const enzymeNorm = (vEnzymeVol.value || 100) / (vEnzymeMilkVol.value || 250); // мл/л
        const enzymeMl = volNorm * enzymeNorm;
        const enzymeSpoonsTsp = (enzymeMl / 5).toFixed(1);
        const enzymeSpoonsTbsp = (enzymeMl / 15).toFixed(1);
        const enzymeSpoonsText = `${enzymeSpoonsTsp} ч.л. или ${enzymeSpoonsTbsp} ст.л.`;

        const cacl2Grams = volNorm * (vCaCl2.value || 0.3);

        journalInput.cheese = {
            targetFatNorm,
            volNorm,
            addVol,
            starterMilkVol: vStarterMilkVol.value || 250,
            starterMass: vStarterMass.value || 50,
            enzymeMilkVol: vEnzymeMilkVol.value || 250,
            enzymeVol: vEnzymeVol.value || 100,
            starterGrams,
            enzymeMl,
            cacl2Grams
        };

        const recipe = generateCheeseRecipe(volNorm, starterGrams, starterSpoonsText, enzymeMl, enzymeSpoonsText, cacl2Grams, mdzhsv);
        resultsHtml += `<div class="recipe-card">
            <h4>🧀 Сыр (Качотта)</h4>
            <pre>${recipe}</pre>
            <button class="btn btn-copy" onclick="copyRecipe(this)">📋 Скопировать рецепт</button>
        </div>`;

        const resArea = document.getElementById('results-area');
        const resContent = document.getElementById('results-content');
        resContent.innerHTML = resultsHtml;
        resArea.style.display = 'block';
        
        if (!hasError) showToast('Расчёт выполнен');

        document.getElementById('save-journal-btn').onclick = () => {
            const entry = {
                date: new Date().toLocaleString(),
                scenario: 'cheese',
                input: { ...journalInput, milkData },
                results: resContent.innerText
            };
            const journal = getData(STORAGE.JOURNAL) || [];
            journal.unshift(entry);
            saveData(STORAGE.JOURNAL, journal);
            showToast('Сохранено в журнал');
        };
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

        const mdzhsvFact = f * 100 / (100 - w);
        outDiv.innerHTML = `<p>Фактическая МДЖСВ: <strong>${mdzhsvFact.toFixed(2)}%</strong></p>`;
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
        exportToCSV(journal);
    });
}

/* --- CSV EXPORT WITH BOM --- */
function exportToCSV(journal) {
    const csvRows = [];
    csvRows.push(['Дата', 'Сценарий', 'Входные данные', 'Результаты'].join(';'));
    
    journal.forEach(j => {
        const inputData = JSON.stringify(j.input).replace(/"/g, '""');
        const resultsData = j.results.replace(/"/g, '""').replace(/\n/g, ' ');
        csvRows.push([`"${j.date}"`, `"${j.scenario}"`, `"${inputData}"`, `"${resultsData}"`].join(';'));
    });
    
    const bom = "\uFEFF";
    const csvString = bom + csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cifromilk_journal.csv';
    a.click();
    showToast('CSV экспортирован');
}

/* --- COPY RECIPE FUNCTION --- */
function copyRecipe(btn) {
    const pre = btn.previousElementSibling;
    const text = pre.textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Рецепт скопирован');
        const originalText = btn.textContent;
        btn.textContent = '✅ Скопировано!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(() => {
        showToast('Ошибка копирования', 'error');
    });
}

/* --- MODAL --- */
function openModal(item) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');
    const title = document.getElementById('modal-title');
    
    title.textContent = `Запись от ${item.date}`;
    
    let detailsHtml = `<h4>Входные данные:</h4><pre style="white-space: pre-wrap; background:#f4f4f4; padding:10px;">`;
    
    // Обратная совместимость: проверяем наличие новых полей
    if (item.input.starterMilkVol) {
        detailsHtml += `Закваска: пакет на ${item.input.starterMilkVol} л, ${item.input.starterMass} г\n`;
    }
    if (item.input.enzymeMilkVol) {
        detailsHtml += `Фермент: флакон на ${item.input.enzymeMilkVol} л, ${item.input.enzymeVol} мл\n`;
    }
    if (item.input.milkData) {
        detailsHtml += `Молоко: ${item.input.milkData.volume} л, ${item.input.milkData.fat}% жир\n`;
    }
    detailsHtml += `</pre><h4>Результаты:</h4><pre style="white-space: pre-wrap; background:#f4f4f4; padding:10px;">${item.results}</pre>`;
    
    body.innerHTML = detailsHtml;
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