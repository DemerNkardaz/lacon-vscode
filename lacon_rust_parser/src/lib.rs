// pub mod ast;
// pub mod interpreter;
// pub mod lexer;
// // use crate::interpretator::*;
// use wasm_bindgen::prelude::*;

// #[wasm_bindgen]
// pub fn add(left: u64, right: u64) -> u64 {
//     left + right
// }

// #[wasm_bindgen]
// pub fn greet(name: &str) -> String {
//     format!("Привет, {}! Rust + WASM + VS Code работают сообща.", name)
// }

// #[cfg(test)]
// mod tests {
//     use super::*;

//     #[test]
//     fn it_works() {
//         let result = add(2, 2);
//         assert_eq!(result, 4);
//     }
// }

pub mod lexer;
pub mod shared;
pub mod utils;

#[test]
fn test_complex_units_full_info() {
    use crate::lexer::scanner::Scanner;
    use crate::shared::unit::props::Formula;
    use crate::shared::unit::units::UNITS;

    let source = "25kg/m3 97cm/s6 25kg/dam3 97cm/μs6";
    let mut scanner = Scanner::new(source.to_string());
    let tokens = scanner.scan_tokens();

    for token in tokens.iter().filter(|t| t.token_type.is_unit()) {
        let suffix = token.get_unit_suffix();
        let origin = token.get_unit_origin_suffix(); // Используем твой impl

        // Ищем UnitDef, сопоставляя его с "очищенным" от приставок суффиксом
        let unit_def = UNITS.iter().find(|u| {
            u.symbol == origin
                || u.parts
                    .as_ref()
                    .map_or(false, |(n, d)| origin == format!("{}/{}", n, d))
        });

        println!("\n{}", "=".repeat(60));
        println!("TOKEN LEXEME:  '{}'", token.lexeme);
        println!("RAW SUFFIX:    '{}'", suffix);
        println!("ORIGIN SUFFIX: '{}'", origin);

        if let Some(def) = unit_def {
            println!("--- UnitDef FULL PROPERTIES ---");
            println!("Dimension:         {:?}", def.dimension);
            println!(
                "Groups (N/D):      {:?} / {:?}",
                def.numerator_group, def.denominator_group
            );

            match &def.props.formula {
                Formula::Simple(dim) => println!("Formula:           Simple({:?})", dim),
                Formula::Complex { num, den } => {
                    println!("Formula:           Complex");
                    println!("  Num:             {:?}", num);
                    println!("  Den:             {:?}", den);
                }
                Formula::None => println!("Formula:           None"),
            }

            if let Some((n, d)) = def.parts.as_ref() {
                println!("Base Parts:        {} / {}", n, d);
            }

            println!(
                "Scale/Offset:      {} / {}",
                def.props.scale, def.props.offset
            );
        } else {
            println!("!!! [ERROR] No UnitDef found for origin '{}' !!!", origin);
        }
    }
    println!("{}", "=".repeat(60));
}

#[cfg(test)]
mod tests {
    use crate::lexer::scanner::Scanner;
    use crate::lexer::token::TokenFlags;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_lexer_to_file() {
        let source = r#"
				key = 1m/s6
				key = 1km/s6
				key = 1km/ks6
				key = 1Mm/μs6
				key = 1μm/Ms6
				key = 1%
				key = 1kg
				key = 1g
				key = 1μg/m3
				key = 1μg/μm3
				key = 1kg/cm3
				key = 1kg/m3
25 ∸ 100
string ≣ string

generate (0x4E3 .. -10) as local let code-point {
	yield unicode-${code-point} {
		char \u{${code-point}}
	}
}
spread ['one', 'two', 'three', 'four', 'five'] as name {
	yield digit-${name} {
		number-value: index
	}
}
spread ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces', 'ophiuchus'] as let name {
	local code-point = format("{:04X}", 0x2648 + index)
	yield astrological-zodiacal-sign-{name}-text {
		code-point: `U+${code-point}`
		sequence: [code-point, `FE0E`]
		pos: index
	}
}
spread (['c', 's'], ['prosgegrammeni', 'ypogegrammeni']) as let (letter-case, suffix) {
	local const code-points = [1FBC, 1FB3]
	yield hel_${letter-case}_let_a_alpha__${suffix} {
		unicode: select(code-points)
		symbol {
			letter: hel_${letter-case}_let_a_alpha
		}
	}
}
spread (['c', 's'], ['prosgegrammeni', 'ypogegrammeni'], [1FBC, 1FB3]) as let (letter-case, suffix, code-point) {
	yield hel_${letter-case}_let_a_alpha__${suffix} {
		unicode: code-point
		symbol {
			letter: `hel_${letter-case}_let_a_alpha`
		}
	}
}

let что-то-там = 20_000μW
let speed<Speed> = 278ft/s
let time<Time> = 25μs
let length<Length> = 25pc
let degree<Degree> = 45°
const generator-power<ElectricPower> = 15kW
const vector-shield-dimension<Dimension> = 2D
const fule-energy<Energy> = 1.5MJ
const temperature<Temperature> = 25°C
const temperature<Temperature> = 25K
const resistance<ElectricResistance> = 10_000MΩ
const resistance<ElectricResistance> = 10000kΩ
const field-area<Area> = 73.14m2
const cube-volume<Volume> = 15m3
const vessel-volume<Volume> = 0.1kL
const number2<Number> = 0b1011110011
const number8<Number> = 0o071
const number16<Number> = 0x348FABD1
const number32<Number> = 0tL1FF
const number32<Number> = 0cZYX

const abcdefg = Infinitykg
const hijklmn = -Infinitykg
const abcdefg = 10kg
const hijklmn = -10kg

const area = 25m2
const volume = 25m3
const force = 25TN
const pressure = 25MPa
const byterate = 25Mbit/s
const byterate = 25MB/s
const byterate = 25MiB/s
const byterate = 25YiB/s
let a = 2.5m/s
let a = 2.5m/s2
let a = 2.5m/s3
let a = 2.5m/s4
let a = 2.5m/s5
let a = 2.5m/s6
let a = 2.5Tm/h
let a = 2.5km/h
let a = 2.5m/h
let a = 2.5μm/s
let a = 25mph
let a = 25t
let a = 25kg/m3
let a = 25Mg/m3
let a = 25μlx
let a = 25Tlm
let a = 25kcd
let a = 25nmol

text-data = """
    Line 1
    Line 2
    """.trim().to-upper()

"#;

        let source2 = r#"
a - b
a-b
a -2
a - 2
a b - 2
a b -2

global const const-name a - b
global const const-name a-b
global const const-name a -2
global const const-name a - 2
global const const-name a b - 2
global const const-name a b -2
/|\ 1. Смешанный режим: отступы + явные скобки
container App
    /|\ Внутри App работают отступы
    styles {
        /|\ Внутри скобок отступы могут плавать
        width: 100%
    padding: 20px
          color: #fff
    }

    /|\ Снова возвращаемся к строгим отступам
    logic
        if status == "active"
            opacity -1.0
        else
            opacity 0

/|\ 2. Тест "слипшихся" отрицательных чисел и операторов
calc-result = base-val -5 --2 + -10%
/|\ Ожидаем: [id(calc-result), eq, id(base-val), ws, num(-5), minus, num(-2), plus, num(-10%)]

/|\ 3. Многострочные строки и вызовы в цепочке
text-data = """
    Line 1
    Line 2
    """.trim().to-upper()

/|\ 4. Крайний случай индентации и пустых строк
root
    level1

        /|\ Комментарий на пустой строке не должен прерывать блок
        level2
            target-node

/|\ 5. Ловушка для комментариев и операторов
x = 10 / 2 /* деление */ + 5 /|\ сумма
y = (5 * 2)z /|\ Whitespace-assign после скобок
private const superstring<String> = "this is \"super\" string"

let speed 278mi/h
let length 25pc
let degree 45°
const generator-power 15kW
const vector-shield-dimension 2D
const fule-energy 1.5MJ
const temperature 25°C
const resistance 10000MΩ

let string "string"
let string 'string'
let string `string`
let interpolated-string "string with ${first-word} and ${second-word}, \${escaped}"

const first-word snow
const second-word=fall
const winter-${first-word}${second-word} #dbebed
const winter-${first-word}-${second-word} #dbebed
const winter-${first-word}_${second-word} #dbebed
winter-${a}-${b} value
const emptyItem = [value, , value]
"#;

        let mut scanner = Scanner::new(source.to_string());
        let tokens = scanner.scan_tokens();

        let mut file = File::create("lexer_test.txt").expect("Не удалось создать файл");

        writeln!(
            file,
            "{:<30} | {:<40} | {:<20} | {:<10} | {:<10} | {:<10} | {:<10}",
            "TYPE", "LEXEME", "LITERAL", "UNIT", "POSITION", "LINE START", "WHITESPACE"
        )
        .unwrap();
        writeln!(file, "{}", "-".repeat(150)).unwrap();

        for token in tokens {
            let literal_str = match &token.literal {
                Some(l) => l.clone(),
                None => "".to_string(),
            };

            writeln!(
                file,
                "{:<30} | {:<40} | {:<20} | {:<10} | {:<10} | {:<10} | {:<10}",
                format!("{:?}", token.token_type),
                token.lexeme.replace("\n", "\\n"),
                literal_str,
                token.get_unit_suffix(),
                token.position.to_string(),
                // Проверяем наличие флага начала строки
                if token.flags.contains(TokenFlags::AT_LINE_START) {
                    "True"
                } else {
                    ""
                },
                // Добавляем колонку для пробела (по желанию)
                if token.flags.contains(TokenFlags::HAS_PRECEDING_WHITESPACE) {
                    "WS"
                } else {
                    ""
                }
            )
            .unwrap();
        }
    }
}

#[cfg(test)]
mod tests_calcs {
    use crate::shared::unit::units::UNITS;

    #[test]
    fn calcs() {
        // Список шкал (без дублирования K в конце, замыкаем вручную)
        let symbols = [
            "K", "°C", "°F", "°Ra", "°N", "°D", "°Re", "°Ro", "°L", "°W", "°C", "°Ro", "°F", "°C",
            "°L", "°Da",
        ];
        let mut val = 1500.17; // Стартовая точка (0°C)

        println!("Starting UNBIASED circular test: 273.15K (3 rounds)");
        println!("--------------------------------------------------");

        for round in 1..=3 {
            let mut row = Vec::new();
            // Запоминаем значение в начале раунда
            row.push(format!("{:.4}{}", val, symbols[0]));

            // Проход по цепочке внутри массива symbols
            for window in symbols.windows(2) {
                let from_sym = window[0];
                let to_sym = window[1];

                // Находим юниты. Сравнение &str == &str
                let from_unit = UNITS
                    .iter()
                    .find(|u| u.symbol == from_sym)
                    .unwrap_or_else(|| panic!("Unit {} not found", from_sym));
                let to_unit = UNITS
                    .iter()
                    .find(|u| u.symbol == to_sym)
                    .unwrap_or_else(|| panic!("Unit {} not found", to_sym));

                let base = from_unit.normalize(val);
                val = to_unit.denormalize(base);

                row.push(format!("{:.4}{}", val, to_sym));
            }

            // --- ЗАМЫКАНИЕ ЦИКЛА: W -> K ---
            // Чтобы Round 2 начался честно, переводим результат последнего юнита в первый
            let last_sym = symbols.last().unwrap();
            let first_sym = symbols[0];

            let from_last = UNITS.iter().find(|u| u.symbol == *last_sym).unwrap();
            let to_first = UNITS.iter().find(|u| u.symbol == first_sym).unwrap();

            let base_final = from_last.normalize(val);
            val = to_first.denormalize(base_final);

            // Печатаем строку цикла. В конце строки будет значение ПОСЛЕ перехода W -> K
            println!(
                "Round {}: {} -> {:.4}{}",
                round,
                row.join(" -> "),
                val,
                first_sym
            );
        }

        println!("--------------------------------------------------");
        let diff = (val - 273.15).abs();
        if diff < 1e-9 {
            println!(
                "SUCCESS: Total drift after 3 rounds is negligible ({:.2e})",
                diff
            );
        } else {
            println!("WARNING: Precision drift detected: {:.2e}", diff);
        }
    }
}

#[cfg(test)]
mod tests_prefixes {
    use crate::shared::unit::prefixes::PREFIXES;
    use crate::shared::unit::units::UNITS; // Твой массив префиксов

    // Вспомогательная функция для теста
    fn convert(val: f64, from_p: &str, to_p: &str, unit_sym: &str) -> f64 {
        let unit = UNITS
            .iter()
            .find(|u| u.symbol == unit_sym)
            .expect("Unit not found");

        // Находим множители префиксов (пустая строка "" = 1.0)
        let f_mul = if from_p.is_empty() {
            1.0
        } else {
            PREFIXES
                .iter()
                .find(|(s, _, _)| *s == from_p)
                .map(|(_, m, _)| *m)
                .unwrap()
        };
        let t_mul = if to_p.is_empty() {
            1.0
        } else {
            PREFIXES
                .iter()
                .find(|(s, _, _)| *s == to_p)
                .map(|(_, m, _)| *m)
                .unwrap()
        };

        // Логика: (Значение * Префикс) -> Normalize -> Denormalize -> / Целевой Префикс
        let base = unit.normalize(val * f_mul);
        unit.denormalize(base) / t_mul
    }

    #[test]
    fn prefix_drifting() {
        // Цепочка префиксов для грамма (g):
        // g -> kg -> mg -> Gg -> ng -> Tg -> pg -> g
        let sequence = ["", "k", "m", "G", "n", "T", "p", ""];
        let unit_sym = "g";
        let mut val = 1.0;

        println!("Starting SI Prefix test for '{}' (3 rounds)", unit_sym);
        println!("--------------------------------------------------");

        for round in 1..=3 {
            let mut row = Vec::new();
            row.push(format!("{:.4e}{}{}", val, sequence[0], unit_sym));

            for window in sequence.windows(2) {
                let from_p = window[0];
                let to_p = window[1];

                val = convert(val, from_p, to_p, unit_sym);
                row.push(format!("{:.4e}{}{}", val, to_p, unit_sym));
            }

            println!("Round {}: {}", round, row.join(" -> "));
        }

        println!("--------------------------------------------------");
        let drift = (val - 1.0).abs();
        if drift < 1e-12 {
            println!("SUCCESS: Prefix drift is negligible ({:.2e})", drift);
        } else {
            println!("WARNING: Precision loss in prefixes: {:.2e}", drift);
        }
    }
    #[test]
    fn megagram_base_test() {
        // Цепочка префиксов: Mg -> g -> kg -> ug -> Gg -> mg -> Mg
        let sequence = ["M", "", "k", "μ", "G", "m", "M"];
        let unit_sym = "g";

        // Мы начинаем с 1 Мегаграмма
        let mut val = 1.0;
        let initial_val = 1.0;

        println!("Starting Megagram (Mg) Base Test (3 rounds)");
        println!("Formula: val (in current prefix) -> normalize -> denormalize -> target prefix");
        println!("--------------------------------------------------");

        for round in 1..=3 {
            let mut row = Vec::new();
            row.push(format!("{:.4e}{}{}", val, sequence[0], unit_sym));

            for window in sequence.windows(2) {
                let from_p = window[0];
                let to_p = window[1];

                // Наша функция convert (из прошлого блока)
                val = convert(val, from_p, to_p, unit_sym);
                row.push(format!("{:.4e}{}{}", val, to_p, unit_sym));
            }

            println!("Round {}: {}", round, row.join(" -> "));
        }

        println!("--------------------------------------------------");
        let drift = (val - initial_val).abs();
        if drift < 1e-12 {
            println!(
                "SUCCESS: Stability maintained relative to Mg ({:.2e})",
                drift
            );
        } else {
            println!("WARNING: Drift detected: {:.2e}", drift);
        }
    }
}
