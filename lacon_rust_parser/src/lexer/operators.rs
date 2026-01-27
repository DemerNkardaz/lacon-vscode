use crate::lexer::token_type::TokenType;

/// Структура для результата сопоставления оператора
pub struct OpMatch {
    pub token_type: TokenType,
    pub consume_count: usize, // Сколько дополнительных символов поглотить (кроме первого)
}

/// Функция сопоставляет символы с соответствующими типами токенов.
pub fn match_operator(c1: char, c2: Option<char>, c3: Option<char>) -> OpMatch {
    match c1 {
        // Односимвольные
        '(' => simple(TokenType::LeftParen),
        ')' => simple(TokenType::RightParen),
        '{' => simple(TokenType::LeftBrace),
        '}' => simple(TokenType::RightBrace),
        '[' => simple(TokenType::LeftBracket),
        ']' => simple(TokenType::RightBracket),
        ',' => simple(TokenType::Comma),
        ';' => simple(TokenType::Semicolon),

        // Двоеточие и Scope Resolution ::
        ':' => match c2 {
            Some(':') => OpMatch {
                token_type: TokenType::ColonColon,
                consume_count: 1,
            },
            Some('=') => OpMatch {
                token_type: TokenType::ColonEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Colon),
        },

        // Знаки вопроса
        '?' => match c2 {
            Some('?') => OpMatch {
                token_type: TokenType::QuestionQuestion,
                consume_count: 1,
            },
            _ => simple(TokenType::Question),
        },

        '^' => match c2 {
            Some('=') => OpMatch {
                token_type: TokenType::XorEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Caret),
        },
        '~' => match c2 {
            Some('=') => OpMatch {
                token_type: TokenType::RegExEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Tilde),
        },
        '@' => match c2 {
            Some('=') => OpMatch {
                token_type: TokenType::AtEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::At),
        },
        '#' => match c2 {
            Some('=') => OpMatch {
                token_type: TokenType::HashEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Hash),
        },
        '$' => match c2 {
            Some('{') => OpMatch {
                token_type: TokenType::DollarLeftBrace,
                consume_count: 1,
            },
            Some('=') => OpMatch {
                token_type: TokenType::DollarEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Dollar),
        },

        // Арифметика и составные операторы
        '+' => match c2 {
            Some('+') => OpMatch {
                token_type: TokenType::PlusPlus,
                consume_count: 1,
            },
            Some('-') => OpMatch {
                token_type: TokenType::PlusMinus,
                consume_count: 1,
            },
            Some('=') => OpMatch {
                token_type: TokenType::PlusEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Plus),
        },
        '-' => match c2 {
            Some('-') => OpMatch {
                token_type: TokenType::MinusMinus,
                consume_count: 1,
            },
            Some('=') => OpMatch {
                token_type: TokenType::MinusEqual,
                consume_count: 1,
            },
            Some('>') => OpMatch {
                token_type: TokenType::Arrow,
                consume_count: 1,
            },
            _ => simple(TokenType::Minus),
        },
        '*' => match c2 {
            Some('=') => OpMatch {
                token_type: TokenType::StarEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Star),
        },
        '/' => match c2 {
            Some('|') if c3 == Some('\\') => OpMatch {
                token_type: TokenType::LineComment,
                consume_count: 2,
            },
            Some('/') if c3 == Some('=') => OpMatch {
                token_type: TokenType::SlashSlashEqual,
                consume_count: 2,
            },
            Some('*') => OpMatch {
                token_type: TokenType::BlockComment,
                consume_count: 1,
            },
            Some('/') => OpMatch {
                token_type: TokenType::SlashSlash,
                consume_count: 1,
            },
            Some('=') => OpMatch {
                token_type: TokenType::SlashEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Slash),
        },
        '\\' => match c2 {
            Some('\\') => OpMatch {
                token_type: TokenType::BackslashBackslash,
                consume_count: 1,
            },
            _ => simple(TokenType::Backslash),
        },
        '%' => match c2 {
            Some('=') => OpMatch {
                token_type: TokenType::PercentEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Percent),
        },

        // Сравнение и равенство
        '=' => match c2 {
            Some('=') => {
                if let Some('=') = c3 {
                    OpMatch {
                        token_type: TokenType::EqualEqualEqual,
                        consume_count: 2,
                    }
                } else {
                    OpMatch {
                        token_type: TokenType::EqualEqual,
                        consume_count: 1,
                    }
                }
            }
            Some('>') => OpMatch {
                token_type: TokenType::FatArrow,
                consume_count: 1,
            },
            _ => simple(TokenType::Equal),
        },
        '!' => match c2 {
            Some('=') => OpMatch {
                token_type: TokenType::BangEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Bang),
        },
        '>' => match c2 {
            Some('>') if c3 == Some('=') => OpMatch {
                token_type: TokenType::LessLessEqual,
                consume_count: 2,
            },
            Some('>') => OpMatch {
                token_type: TokenType::LessLess,
                consume_count: 1,
            },
            Some('=') => OpMatch {
                token_type: TokenType::GreaterEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Greater),
        },
        '<' => match c2 {
            Some('<') if c3 == Some('=') => OpMatch {
                token_type: TokenType::LessLessEqual,
                consume_count: 2,
            },
            Some('<') => OpMatch {
                token_type: TokenType::LessLess,
                consume_count: 1,
            },
            Some('=') => OpMatch {
                token_type: TokenType::LessEqual,
                consume_count: 1,
            },
            Some('|') => OpMatch {
                token_type: TokenType::PipeBackward,
                consume_count: 1,
            },
            _ => simple(TokenType::Less),
        },

        // Логика и Пайпы
        '|' => match c2 {
            Some('|') => OpMatch {
                token_type: TokenType::PipePipe,
                consume_count: 1,
            },
            Some('>') => OpMatch {
                token_type: TokenType::PipeForward,
                consume_count: 1,
            },
            Some('=') => OpMatch {
                token_type: TokenType::OrEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Pipe),
        },
        '&' => match c2 {
            Some('&') => OpMatch {
                token_type: TokenType::AmpersandAmpersand,
                consume_count: 1,
            },
            Some('=') => OpMatch {
                token_type: TokenType::AndEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Ampersand),
        },

        // Точка, Эллипсис (...), Диапазон (..) или Append (.=)
        '.' => match c2 {
            Some('.') if c3 == Some('.') => OpMatch {
                token_type: TokenType::DotDotDot,
                consume_count: 2,
            },
            Some('.') => OpMatch {
                token_type: TokenType::DotDot,
                consume_count: 1,
            },
            Some('+') => OpMatch {
                token_type: TokenType::DotPlus,
                consume_count: 1,
            },
            Some('-') => OpMatch {
                token_type: TokenType::DotMinus,
                consume_count: 1,
            },
            Some('=') => OpMatch {
                token_type: TokenType::DotEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Dot),
        },

        // Спец-символы юникода
        // Monus
        '\u{2238}' => simple(TokenType::DotMinus),
        '\u{2214}' => simple(TokenType::DotPlus),
        '\u{00B1}' => simple(TokenType::PlusMinus),
        '\u{00D7}' => simple(TokenType::Star),
        '\u{00F7}' => simple(TokenType::Slash),
        '\u{2260}' => simple(TokenType::BangEqual),
        '\u{2264}' => simple(TokenType::LessEqual),
        '\u{2265}' => simple(TokenType::GreaterEqual),
        '\u{2263}' => simple(TokenType::EqualEqualEqual),

        _ => simple(TokenType::Unknown),
    }
}

fn simple(t: TokenType) -> OpMatch {
    OpMatch {
        token_type: t,
        consume_count: 0,
    }
}
