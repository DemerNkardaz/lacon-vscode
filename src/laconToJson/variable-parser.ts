/**
 * Обработка переменных в парсере LACON
 */

/**
 * Разрешает переменные в строке значения
 */
export function resolveVariables(value: string, vars: Record<string, string>): string {
    if (!value) return value;
    return value.replace(/(?<!\\)\$([\p{L}\d._-]+)(~?)/gu, (match, varName, tilde) => {
        if (vars[varName] !== undefined) {
            // Тильда удаляется при подстановке переменной
            return vars[varName];
        }
        return match;
    });
}

/**
 * Присваивает значение нескольким ключам
 */
export function assignMultiValues(
    target: any,
    keys: string[],
    rawValue: string,
    vars: Record<string, string>,
    currentDir: string,
    importStack: Set<string>,
    parseValueFn: Function
) {
    const parsed = parseValueFn(rawValue, vars, currentDir, importStack);
    let currentPrefix = "";
    const processedKeys = keys.map((k) => {
        let keyName = k.trim();
        // Обработка префикса со звёздочкой (например, "size*" или "min-*")
        if (keyName.endsWith('*')) {
            currentPrefix = keyName.slice(0, -1);
            return currentPrefix;
        } else if (keyName.includes('*')) {
            const parts = keyName.split('*');
            currentPrefix = parts[0];
            keyName = currentPrefix + parts[1];
        } else if (currentPrefix) {
            keyName = currentPrefix + keyName;
        }
        return keyName;
    });

    const actualValue = (parsed && parsed.__lacon_spread__) ? parsed.value : parsed;

    if (Array.isArray(actualValue) && actualValue.length === processedKeys.length) {
        processedKeys.forEach((k, idx) => {
            target[k] = actualValue[idx];
        });
    } else {
        processedKeys.forEach(k => {
            target[k] = actualValue;
        });
    }
}
