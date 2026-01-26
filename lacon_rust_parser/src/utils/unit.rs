use crate::lexer::token_type::TokenType;

pub fn get_unit_type(suffix: &str) -> Option<TokenType> {
    // 1. СНАЧАЛА проверяем температуру и градусы угла
    // (Потому что у них специфические префиксы deg и °)
    if let Some(t) = match_temperature_and_degree(suffix) {
        return Some(t);
    }

    // 2. Затем проверяем прочие точные совпадения (не СИ: px, mph, и т.д.)
    if let Some(t) = match_other_exact_units(suffix) {
        return Some(t);
    }

    // 3. Список всех приставок СИ для разбора (kHz, MV, nPa...)
    let prefixes = [
        "da", "h", "k", "M", "G", "T", "P", "E", "Z", "Y", "R", "Q", "d", "c", "m", "μ", "n", "p",
        "f", "a", "z", "y", "r", "q",
    ];

    for prefix in prefixes {
        if suffix.starts_with(prefix) {
            let base = &suffix[prefix.len()..];
            // Проверяем, существует ли такая базовая единица (н-р, Hz или V)
            if let Some(token_type) = match_base_unit(base) {
                return Some(token_type);
            }
        }
    }

    // 4. Если приставки нет, проверяем, не является ли суффикс просто базовой единицей (Hz, V, W)
    match_base_unit(suffix)
}

fn match_base_unit(base: &str) -> Option<TokenType> {
    match base {
        // Частота
        "Hz" => Some(TokenType::UnitFrequency),

        // Длина и Вес
        "m" => Some(TokenType::UnitLength),
        "g" => Some(TokenType::UnitWeight),

        // Электричество
        "V" => Some(TokenType::UnitElectricVoltage), // Вольт
        "A" => Some(TokenType::UnitElectricCurrent), // Ампер
        "W" => Some(TokenType::UnitElectricPower),   // Ватт
        "Ω" | "ohm" => Some(TokenType::UnitElectricResistance), // Ом
        "C" => Some(TokenType::UnitElectricCharge),  // Кулон
        "S" => Some(TokenType::UnitElectricConductance), // Сименс
        "F" => Some(TokenType::UnitElectricCapacitance), // Фарад

        // Энергия и Давление
        "J" => Some(TokenType::UnitEnergy),
        "Pa" => Some(TokenType::UnitPressure),

        // Данные (IT)
        "b" | "B" => Some(TokenType::UnitSize), // бит или Байт

        // Время (малые величины: ms, ns, µs)
        "s" | "sec" => Some(TokenType::UnitTime),

        _ => None,
    }
}

fn match_other_exact_units(suffix: &str) -> Option<TokenType> {
    match suffix {
        // Скорость
        "m/s" | "m/h" | "km/s" | "km/h" | "fps" | "ft/s" | "mph" | "mi/h" | "kn" => {
            Some(TokenType::UnitSpeed)
        }
        // Длина (вне СИ)
        "ft" | "mi" | "em" | "rem" | "pt" | "in" | "px" | "pc" => Some(TokenType::UnitLength),
        // Время (длинные периоды)
        "min" | "hour" | "day" | "week" | "month" | "year" => Some(TokenType::UnitTime),
        // Радианы
        "rad" => Some(TokenType::UnitDegree),
        // Размерность
        "D" => Some(TokenType::UnitDimension),
        _ => None,
    }
}

fn match_temperature_and_degree(suffix: &str) -> Option<TokenType> {
    const DEG_SIGN: &str = "\u{00B0}";
    if suffix == "K" {
        return Some(TokenType::UnitTemperature);
    }
    if suffix == "deg" || suffix == DEG_SIGN {
        return Some(TokenType::UnitDegree);
    }

    let base = if suffix.starts_with(DEG_SIGN) {
        &suffix[DEG_SIGN.len()..]
    } else if suffix.starts_with("deg") {
        &suffix[3..]
    } else {
        return None;
    };

    let scales = [
        "C", "F", "K", "R", "Ra", "Re", "Ro", "De", "N", "Le", "D", "W", "H", "Da",
    ];
    if scales.contains(&base) {
        Some(TokenType::UnitTemperature)
    } else {
        None
    }
}
