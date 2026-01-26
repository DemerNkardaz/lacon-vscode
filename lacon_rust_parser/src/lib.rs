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
pub mod utils;

#[cfg(test)]
mod tests {
    use crate::lexer::scanner::Scanner;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_lexer_to_file() {
        let source = r#"
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
const number2<Number> = 0b1011110011
const number8<Number> = 0o071
const number16<Number> = 0x348FABD1
const number32<Number> = 0tL1FF
const number32<Number> = 0cZYX

const abcdefg = Infinitykg
const hijklmn = -Infinitykg
const abcdefg = 10kg
const hijklmn = -10kg
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
            "{:<20} | {:<15} | {:<10}",
            "TYPE", "LEXEME", "LITERAL"
        )
        .unwrap();
        writeln!(file, "{}", "-".repeat(50)).unwrap();

        for token in tokens {
            let literal_str = match &token.literal {
                Some(l) => l.clone(),
                None => "None".to_string(),
            };

            writeln!(
                file,
                "{:<20} | {:<15} | {:<10}",
                format!("{:?}", token.token_type),
                token.lexeme.replace("\n", "\\n"),
                literal_str
            )
            .unwrap();
        }
    }
}
