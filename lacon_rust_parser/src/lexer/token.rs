use crate::lexer::position::Position;
use crate::lexer::token_type::TokenType;
use crate::shared::unit::definition::PrefixGroup;
use crate::shared::unit::prefixes::PREFIXES;
use crate::shared::unit::units::UNITS;
use bitflags::bitflags;
use std::fmt;

bitflags! {
    /// Набор компактных флагов для токена (занимает 1 байт)
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct TokenFlags: u8 {
        /// Токен является первым значимым элементом на строке
        const AT_LINE_START = 0b0000_0001;
        /// Перед токеном был хотя бы один пробельный символ
        const HAS_PRECEDING_WHITESPACE = 0b0000_0010;
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Token {
    pub lexeme: String,
    pub literal: Option<String>,
    pub position: Position,

    pub token_type: TokenType,
    pub length: u32,
    pub flags: TokenFlags,
}

impl Token {
    /// Создает новый токен.
    pub fn new(
        token_type: TokenType,
        is_at_line_start: bool,
        has_whitespace: bool,
        lexeme: String,
        literal: Option<String>,
        position: Position,
        length: usize,
    ) -> Self {
        let mut flags = TokenFlags::empty();
        if is_at_line_start {
            flags.insert(TokenFlags::AT_LINE_START);
        }
        if has_whitespace {
            flags.insert(TokenFlags::HAS_PRECEDING_WHITESPACE);
        }

        Self {
            token_type,
            lexeme,
            literal,
            position,
            length: length as u32,
            flags,
        }
    }

    pub fn eof(position: Position) -> Self {
        Self {
            token_type: TokenType::EOF,
            lexeme: String::new(),
            literal: None,
            position,
            length: 0,
            flags: TokenFlags::empty(),
        }
    }

    pub fn get_unit_suffix(&self) -> &str {
        if !self.token_type.is_unit() {
            return "—";
        }

        if let Some(ref lit) = self.literal {
            if self.lexeme.starts_with(lit) {
                return &self.lexeme[lit.len()..];
            }
        }

        ""
    }

    pub fn get_unit_origin_suffix(&self) -> String {
        let suffix = self.get_unit_suffix();
        if suffix == "—" || suffix.is_empty() {
            return suffix.to_string();
        }

        let unit_def = UNITS
            .iter()
            .filter(|u| u.parts.is_some())
            .find(|u| {
                let (n, d) = u.parts.as_ref().unwrap();
                suffix.contains(n) && suffix.contains(d)
            })
            // 2. Если не нашли составной, ищем атомарный (Mass, Length и т.д.)
            .or_else(|| {
                UNITS
                    .iter()
                    .filter(|u| u.parts.is_none())
                    .find(|u| suffix.ends_with(u.symbol))
            });

        let def = match unit_def {
            Some(d) => d,
            None => return suffix.to_string(), // Не нашли — возвращаем как есть
        };

        // 2. Разбираем на числитель и знаменатель
        if let Some((base_num, base_den)) = def.parts {
            let parts: Vec<&str> = suffix.split('/').collect();
            if parts.len() == 2 {
                let current_num = parts[0];
                let current_den = parts[1];

                // Очищаем числитель и знаменатель от префиксов
                let clean_num = self.strip_prefix(current_num, base_num, &def.numerator_group);
                let clean_den = self.strip_prefix(current_den, base_den, &def.denominator_group);

                return format!("{}/{}", clean_num, clean_den);
            }
        }

        // 3. Для атомарных юнитов (кг, см, dam3)
        self.strip_prefix(suffix, def.symbol, &def.numerator_group)
    }

    fn strip_prefix(&self, current: &str, base: &str, group: &PrefixGroup) -> String {
        if current == base || *group == PrefixGroup::None {
            return current.to_string(); // Возвращаем как есть, чтобы не потерять s6
        }

        // Ищем, где в текущей строке (например, "dam3") сидит база ("m3")
        if let Some(index) = current.find(base) {
            let potential_prefix = &current[..index];

            if potential_prefix.is_empty() {
                return current.to_string();
            }

            // Проверяем префикс в массиве PREFIXES
            let is_valid = PREFIXES
                .iter()
                .any(|(p_str, _, p_group)| p_group == group && *p_str == potential_prefix);

            if is_valid {
                // ВАЖНО: Мы возвращаем БАЗУ + всё что было ПОСЛЕ нее в исходной строке
                // Если current был "cm/s6", а база "s", то нам нужно вернуть "s6"
                return format!("{}{}", base, &current[index + base.len()..]);
            }
        }

        current.to_string()
    }

    pub fn error(message: String, position: Position) -> Self {
        Self {
            token_type: TokenType::Error,
            lexeme: message,
            literal: None,
            position,
            length: 0,
            flags: TokenFlags::empty(),
        }
    }
}

impl fmt::Display for Token {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let literal_str = match &self.literal {
            Some(l) => format!(" (value: {})", l),
            None => String::new(),
        };

        let mut markers = String::new();
        if self.flags.contains(TokenFlags::AT_LINE_START) {
            markers.push_str(" [SOL]"); // Start of Line
        }
        if self.flags.contains(TokenFlags::HAS_PRECEDING_WHITESPACE) {
            markers.push_str(" [WS]"); // Whitespace
        }

        write!(
            f,
            "[{:?}{}] '{}'{} at {}",
            self.token_type, markers, self.lexeme, literal_str, self.position
        )
    }
}
